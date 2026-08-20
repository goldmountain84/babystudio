// BE-3 테스트 — 영상 워커, 원가 기록, 리컨실 배치

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type DB } from "./db";
import { socialLogin, createBaby, trainBaby } from "./auth";
import { isolateFileRoots, seedPhotos } from "./testUtils";
import { createImageJob, jobView, JobError } from "./jobs";
import { createClip, listClips, TIMELAPSE_PRICE } from "./clips";
import { balance, grant, hold } from "./ledger";
import { reconcileAll } from "./reconcile";

let db: DB;
let userId: string;
let babyId: string;
let assetId: string;

beforeEach(() => {
  isolateFileRoots();
  db = createDb(":memory:");
  const login = socialLogin(db, "kakao", "be3유저"); // +12C
  userId = login.userId;
  babyId = createBaby(db, userId, "서연이", "2026-05-24");
  seedPhotos(babyId);
  trainBaby(db, userId, babyId);
  grant(db, userId, 100, "test", "t", "테스트 충전"); // 112C
  const { jobId } = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} });
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 12_000);
  const view = jobView(db, jobId); // done → assets 생성
  assetId = (view.assets[0] as { id: string }).id;
  vi.useRealTimers();
});

afterEach(() => vi.useRealTimers());

describe("영상 워커 (V-01·02)", () => {
  it("가격은 서버가 계산 — 10초 클립 18C hold, 완료 시 confirm + C2PA + 원가", () => {
    const before = balance(db, userId);
    const { credits } = createClip(db, userId, {
      kind: "clip", assetId, motion: "방긋 미소", length: 10, bgm: "자장가", format: "9:16", preview: false,
    });
    expect(credits).toBe(18);
    expect(balance(db, userId)).toBe(before - 18);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 9_000);
    const rows = listClips(db, userId) as { status: string; length: number }[];
    expect(rows[0].status).toBe("done");
    const c = db.prepare("SELECT c2pa_manifest, cost_usd FROM clips LIMIT 1").get() as {
      c2pa_manifest: string; cost_usd: number;
    };
    expect(c.c2pa_manifest).toContain("c2pa:");
    expect(c.cost_usd).toBeCloseTo(1.2); // 10초 × $0.12
    expect(balance(db, userId)).toBe(before - 18); // confirm — 잔액 유지
  });

  it("무료 미리보기: 0C, 3초로 강제", () => {
    const before = balance(db, userId);
    const { credits } = createClip(db, userId, {
      kind: "clip", assetId, length: 15, bgm: "없음", format: "1:1", preview: true,
    });
    expect(credits).toBe(0);
    expect(balance(db, userId)).toBe(before);
    const row = db.prepare("SELECT length, preview FROM clips LIMIT 1").get() as { length: number; preview: number };
    expect(row.length).toBe(3);
    expect(row.preview).toBe(1);
  });

  it("타인 소스 컷 거부 + 타임랩스 최소 4컷 서버 검증", () => {
    const other = socialLogin(db, "google", "남의계정").userId;
    expect(() =>
      createClip(db, other, { kind: "clip", assetId, length: 5, bgm: "없음", format: "1:1", preview: false })
    ).toThrowError(JobError);
    expect(() =>
      createClip(db, userId, { kind: "timelapse", sourceCount: 3, length: 20, bgm: "자장가", format: "16:9", preview: false })
    ).toThrow(/4장/);
    const { credits } = createClip(db, userId, {
      kind: "timelapse", sourceCount: 4, length: 20, bgm: "자장가", format: "16:9", preview: false,
    });
    expect(credits).toBe(TIMELAPSE_PRICE);
  });
});

describe("원가 기록 (IN-06)", () => {
  it("잡 완료 시 엔진별 cost_usd 기록 (프리셋 팩 기본 = GPT $0.07/컷)", () => {
    const j = db.prepare("SELECT cost_usd FROM jobs WHERE type='image'").get() as { cost_usd: number };
    expect(j.cost_usd).toBeCloseTo(0.07 * 14);
  });
});

describe("리컨실 배치 (IN-02)", () => {
  it("24h 초과 미결 hold 강제 반환 + 체인 검증", () => {
    hold(db, userId, "stale-job", 10, "오래된 잡");
    // hold를 25시간 전으로 조작
    db.prepare("UPDATE credit_holds SET created_at = ? WHERE job_id = 'stale-job'").run(
      Date.now() - 25 * 3600_000
    );
    const before = balance(db, userId);
    const report = reconcileAll(db);
    expect(report.staleHoldsRefunded).toBe(1);
    expect(report.chainsBroken).toHaveLength(0);
    expect(balance(db, userId)).toBe(before + 10); // 반환
    const h = db.prepare("SELECT state FROM credit_holds WHERE job_id = 'stale-job'").get() as { state: string };
    expect(h.state).toBe("refunded");
  });
});
