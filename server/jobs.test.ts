// 잡 오케스트레이션 + 품질 게이트 테스트 (설계서 §5)

import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { createDb, type DB } from "./db";
import { grant, balance } from "./ledger";
import { createBaby, socialLogin, trainBaby, signWebhook, verifyWebhook } from "./auth";
import { isolateFileRoots, seedPhotos } from "./testUtils";
import { createImageJob, JobError, jobView, tick, unlockHiRes } from "./jobs";

let db: DB;
let userId: string;
let babyId: string;

beforeEach(() => {
  isolateFileRoots();
  db = createDb(":memory:");
  const login = socialLogin(db, "kakao", "테스트유저"); // 가입 보상 +12C
  userId = login.userId;
  babyId = createBaby(db, userId, "서연이", "2026-05-24");
  seedPhotos(babyId);
  trainBaby(db, userId, babyId);
});

afterEach(() => vi.useRealTimers());

function fastForward(ms: number) {
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + ms);
}

describe("잡 생성", () => {
  it("hold 즉시 차감 + 프롬프트 버전 각인", () => {
    const { jobId } = createImageJob(db, {
      userId, babyId, themeId: "dol-hanbok", options: { outfit: "연분홍" },
    });
    expect(balance(db, userId)).toBe(3); // 12 - 9
    const job = db.prepare("SELECT prompt_version_id, assembled_prompt FROM jobs WHERE id = ?").get(jobId) as {
      prompt_version_id: string;
      assembled_prompt: string;
    };
    expect(job.prompt_version_id).toMatch(/^dol-hanbok@v/);
    expect(JSON.parse(job.assembled_prompt).negative).toContain("child-safety-locked");
  });

  it("멱등키 재제출 → 같은 잡, 중복 과금 없음", () => {
    const a = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {}, idempotencyKey: "k1" });
    const b = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {}, idempotencyKey: "k1" });
    expect(b.jobId).toBe(a.jobId);
    expect(b.reused).toBe(true);
    expect(balance(db, userId)).toBe(3); // 한 번만 차감
  });

  it("크레딧 부족 → 402성 에러, 잡 미생성", () => {
    createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} }); // 3 남음
    expect(() =>
      createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} })
    ).toThrowError(JobError);
    const count = db.prepare("SELECT COUNT(*) AS c FROM jobs").get() as { c: number };
    expect(count.c).toBe(1);
  });

  it("미학습 프로필 거부", () => {
    const baby2 = createBaby(db, userId, "둘째", "2026-07-01");
    expect(() =>
      createImageJob(db, { userId, babyId: baby2, themeId: "dol-hanbok", options: {} })
    ).toThrow(/학습/);
  });
});

describe("품질 게이트 + 완료", () => {
  it("완료 시 1.4배 생성 → 요청 컷 수만 노출, hold 확정", () => {
    const { jobId } = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} });
    fastForward(12_000);
    const view = jobView(db, jobId);
    expect(view.status).toBe("done");
    expect(view.assets).toHaveLength(10); // 노출 컷
    const total = db.prepare("SELECT COUNT(*) AS c FROM assets WHERE job_id = ?").get(jobId) as { c: number };
    expect(total.c).toBe(14); // 내부 생성 (1.4배)
    // 노출 컷의 최저 유사도 >= 미노출 컷의 최고 유사도 (상위 N 보장)
    const rows = db.prepare("SELECT similarity, exposed FROM assets WHERE job_id = ?").all(jobId) as {
      similarity: number; exposed: number;
    }[];
    const minExposed = Math.min(...rows.filter((r) => r.exposed).map((r) => r.similarity));
    const maxHidden = Math.max(...rows.filter((r) => !r.exposed).map((r) => r.similarity));
    expect(minExposed).toBeGreaterThanOrEqual(maxHidden);
    // hold 확정 — 잔액 유지
    expect(balance(db, userId)).toBe(3);
    // tick 재호출해도 자산 중복 생성 없음 (멱등)
    tick(db, jobId);
    const total2 = db.prepare("SELECT COUNT(*) AS c FROM assets WHERE job_id = ?").get(jobId) as { c: number };
    expect(total2.c).toBe(14);
  });

  it("실패 잡 → 자동 환불 (G-03)", () => {
    const { jobId } = createImageJob(db, {
      userId, babyId, themeId: "dol-hanbok", options: { forceFail: true },
    });
    expect(balance(db, userId)).toBe(3);
    fastForward(12_000);
    const view = jobView(db, jobId);
    expect(view.status).toBe("failed");
    expect(balance(db, userId)).toBe(12); // 전액 반환
  });

  it("고해상도 해금: 2C 차감, 멱등", () => {
    const { jobId } = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} });
    fastForward(12_000);
    const view = jobView(db, jobId);
    const assetId = (view.assets[0] as { id: string }).id;
    unlockHiRes(db, userId, assetId);
    expect(balance(db, userId)).toBe(1); // 3 - 2
    unlockHiRes(db, userId, assetId); // 재호출 무과금
    expect(balance(db, userId)).toBe(1);
  });
});

describe("웹훅 서명", () => {
  it("올바른 서명만 통과", () => {
    const body = JSON.stringify({ order_id: "o1", user_id: userId, credits: 50, amount: 4900 });
    expect(verifyWebhook(body, signWebhook(body))).toBe(true);
    expect(verifyWebhook(body, "bad-signature")).toBe(false);
    expect(verifyWebhook(body + " ", signWebhook(body))).toBe(false); // 본문 변조
  });
});
