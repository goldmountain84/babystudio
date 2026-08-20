// BE-2 테스트 — 전 테마 시드, 파기 파이프라인, 모더레이션

import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "./db";
import { seedPrompts, routeVersion } from "./prompts";
import { purgeUser } from "./purge";
import {
  decideModeration,
  FLAG_THRESHOLD,
  flagIfGrayZone,
  listModeration,
  seedModeration,
} from "./moderation";
import { socialLogin, createBaby, trainBaby } from "./auth";
import { createImageJob } from "./jobs";
import { balance, ledgerOf } from "./ledger";
import { THEME_APPS } from "@/lib/data";

let db: DB;

beforeEach(() => {
  db = createDb(":memory:");
});

describe("전 테마 시드 (BE-2 · TC)", () => {
  it("모든 테마가 live 체인을 갖고 라우팅 가능", () => {
    seedPrompts(db);
    for (const app of THEME_APPS) {
      const v = routeVersion(db, app.id, "user-x");
      expect(v.status === "live" || v.status === "canary").toBe(true);
    }
  });

  it("기존 체인은 보존(archived), live는 프리셋 팩이 차지", () => {
    seedPrompts(db);
    const v14 = db
      .prepare("SELECT status FROM prompt_versions WHERE id='dol-hanbok@v14'")
      .get() as { status: string };
    expect(v14.status).toBe("archived"); // append-only — 구 체인 보존
    const live = db
      .prepare("SELECT author FROM prompt_versions WHERE theme_id='dol-hanbok' AND status='live'")
      .get() as { author: string };
    expect(live.author).toBe("프리셋팩-GPT1K"); // 기본 설정 = 팩
  });
});

describe("파기 파이프라인 (TR-01)", () => {
  it("데이터 삭제 + 원장 보존 + 영수증 발급", () => {
    const { userId } = socialLogin(db, "kakao", "파기테스트");
    const babyId = createBaby(db, userId, "서연이", "2026-05-24");
    trainBaby(db, userId, babyId);
    const { jobId } = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} });
    expect(jobId).toBeTruthy();

    const receipt = purgeUser(db, userId);
    expect(receipt.rootHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(receipt.items.find((i) => i.label.includes("프로필"))?.count).toBe(1);
    expect(receipt.items.find((i) => i.label.includes("생성 잡"))?.count).toBe(1);

    // 개인 데이터는 사라짐
    expect(db.prepare("SELECT COUNT(*) c FROM baby_profiles WHERE user_id=?").get(userId)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) c FROM jobs WHERE user_id=?").get(userId)).toEqual({ c: 0 });
    expect(db.prepare("SELECT COUNT(*) c FROM sessions WHERE user_id=?").get(userId)).toEqual({ c: 0 });
    // 계정 가명화 + 원장은 법정 보존
    const u = db.prepare("SELECT name, provider FROM users WHERE id=?").get(userId) as { name: string; provider: string };
    expect(u.provider).toBe("purged");
    expect(ledgerOf(db, userId).length).toBeGreaterThan(0);
    expect(balance(db, userId)).toBe(3); // 12 - 9 hold — 원장 그대로
    // 감사로그 기록
    const a = db.prepare("SELECT action FROM audit_log ORDER BY id DESC LIMIT 1").get() as { action: string };
    expect(a.action).toContain("파기");
  });
});

describe("모더레이션 (MD)", () => {
  it("게이트 하한 근접 잡만 자동 플래그", () => {
    expect(flagIfGrayZone(db, "job-a", "테스트", FLAG_THRESHOLD - 0.02)).toBe(true);
    expect(flagIfGrayZone(db, "job-b", "테스트", FLAG_THRESHOLD + 0.02)).toBe(false);
    const items = listModeration(db) as { type: string }[];
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("generation");
  });

  it("결정은 pending에만 1회 — 중복 결정 거부(멱등)", () => {
    seedModeration(db);
    expect(decideModeration(db, "m-501", "approved", "moderator-t")).toBe(true);
    expect(decideModeration(db, "m-501", "blocked", "moderator-t")).toBe(false);
    const row = db.prepare("SELECT status, decided_by FROM moderation_items WHERE id='m-501'").get() as {
      status: string;
      decided_by: string;
    };
    expect(row.status).toBe("approved");
    expect(row.decided_by).toBe("moderator-t");
  });
});
