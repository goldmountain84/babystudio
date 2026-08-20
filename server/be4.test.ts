// BE-4 테스트 — 구독 빌링, CRM 저니, 가격 실험

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type DB } from "./db";
import { socialLogin, createBaby, trainBaby } from "./auth";
import { isolateFileRoots, seedPhotos } from "./testUtils";
import {
  cancelSubscription, ensureRenewal, isMember, MONTHLY_GRANT, PERIOD_MS, subscribe, SubError,
} from "./subscriptions";
import { balance, settleOrder } from "./ledger";
import { createImageJob, JobError, jobView } from "./jobs";
import { listNotifications, runJourney } from "./notifications";
import { assignPackageVariant, priceExperimentReport } from "./priceExperiment";

let db: DB;
let userId: string;
let babyId: string;

beforeEach(() => {
  isolateFileRoots();
  db = createDb(":memory:");
  const login = socialLogin(db, "kakao", "be4유저"); // +12C
  userId = login.userId;
  babyId = createBaby(db, userId, "서연이", "2026-05-24"); // 백일 D-11
  seedPhotos(babyId);
  trainBaby(db, userId, babyId);
});

afterEach(() => vi.useRealTimers());

describe("구독 빌링 (P-02)", () => {
  it("구독 → 웹훅 경유 200C 지급, 중복 구독 거부", () => {
    subscribe(db, userId);
    expect(balance(db, userId)).toBe(12 + MONTHLY_GRANT);
    expect(isMember(db, userId)).toBe(true);
    expect(() => subscribe(db, userId)).toThrowError(SubError);
  });

  it("해지: 기간 만료까지 혜택 유지 + 잔여 크레딧 유지", () => {
    subscribe(db, userId);
    cancelSubscription(db, userId);
    expect(isMember(db, userId)).toBe(true); // 기간 내
    expect(balance(db, userId)).toBe(212); // 크레딧 회수 없음
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + PERIOD_MS + 1000);
    expect(isMember(db, userId)).toBe(false); // 기간 만료
  });

  it("lazy 갱신: 2주기 경과 시 2회 지급 (주기별 멱등)", () => {
    subscribe(db, userId); // cycle 0 지급 → 212
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + PERIOD_MS * 2 + 1000);
    ensureRenewal(db, userId);
    expect(balance(db, userId)).toBe(12 + MONTHLY_GRANT * 3); // 0,1,2 주기
    ensureRenewal(db, userId); // 재실행 무지급 (멱등)
    expect(balance(db, userId)).toBe(12 + MONTHLY_GRANT * 3);
  });

  it("멤버십 전용 테마 서버 강제: 비구독 거부 → 구독 후 허용", () => {
    expect(() =>
      createImageJob(db, { userId, babyId, themeId: "moon-star", options: {} })
    ).toThrowError(JobError);
    subscribe(db, userId); // 212C
    const { jobId } = createImageJob(db, { userId, babyId, themeId: "moon-star", options: {} });
    expect(jobId).toBeTruthy();
  });
});

describe("CRM 저니 (§3.2)", () => {
  it("백일 D-11 → D-30·D-14 알림 2건, 재실행 멱등", () => {
    runJourney(db, userId);
    runJourney(db, userId);
    const list = listNotifications(db, userId) as { type: string }[];
    const dday = list.filter((n) => n.type === "dday");
    expect(dday).toHaveLength(2); // D-30, D-14 (D-7·D-day는 아직)
  });

  it("잡 완료 시 알림 발송", () => {
    const { jobId } = createImageJob(db, { userId, babyId, themeId: "dol-hanbok", options: {} });
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 12_000);
    jobView(db, jobId);
    const list = listNotifications(db, userId) as { type: string; link: string }[];
    const done = list.find((n) => n.type === "job_done");
    expect(done?.link).toBe(`/album/item/${jobId}`);
  });
});

describe("가격 실험 (DX)", () => {
  it("배정은 결정적·불변", () => {
    const a = assignPackageVariant(db, userId);
    const b = assignPackageVariant(db, userId);
    expect(b.variant).toBe(a.variant);
    expect([19900, 17900]).toContain(a.price);
  });

  it("구매 이벤트 variant 태그 → 전환율 집계", () => {
    const p = assignPackageVariant(db, userId);
    settleOrder(db, "pkg-1", userId, p.credits, p.price, {
      experiment: p.experiment, variant: p.variant, context: "package",
    });
    const report = priceExperimentReport(db);
    const mine = report.find((v) => v.name.startsWith(p.variant));
    expect(mine?.assigned).toBe(1);
    expect(mine?.purchases).toBe(1);
    expect(mine?.conversion).toBe(100);
  });
});
