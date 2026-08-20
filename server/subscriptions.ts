// BE-4 · 구독 빌링 (P-02)
// 원칙: 지급은 웹훅 경유 하나뿐 — 구독 지급도 settleOrder(주기별 멱등 order id)로.
// 갱신은 lazy 배치(/me 접근 시 ensureRenewal). 해지는 기간만료 기본 + 잔여 크레딧 유지.

import { type DB, withTx, trackEvent } from "./db";
import { settleOrder } from "./ledger";

export const MEMBERSHIP_PRICE = 9900;
export const MONTHLY_GRANT = 200;
export const PERIOD_MS = 30 * 24 * 3600_000;

export class SubError extends Error {
  constructor(public code: "ALREADY" | "NONE", message: string) {
    super(message);
  }
}

interface SubRow {
  user_id: string;
  status: "active" | "cancelled";
  cycle: number;
  started_at: number;
  renews_at: number;
  cancelled_at: number | null;
}

export function getSubscription(db: DB, userId: string): SubRow | null {
  return (
    (db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(userId) as
      | SubRow
      | undefined) ?? null
  );
}

/** 멤버십 혜택 유효 여부 — 해지해도 기간 만료까지 유지 */
export function isMember(db: DB, userId: string): boolean {
  const s = getSubscription(db, userId);
  if (!s) return false;
  if (s.status === "active") return true;
  return Date.now() < s.renews_at;
}

export function subscribe(db: DB, userId: string): SubRow {
  return withTx(db, () => {
    const existing = getSubscription(db, userId);
    if (existing && (existing.status === "active" || Date.now() < existing.renews_at)) {
      throw new SubError("ALREADY", "이미 멤버십 이용 중입니다");
    }
    const now = Date.now();
    db.prepare(
      `INSERT INTO subscriptions (user_id, status, cycle, started_at, renews_at, cancelled_at)
       VALUES (?, 'active', 0, ?, ?, NULL)
       ON CONFLICT(user_id) DO UPDATE SET
         status='active', cycle=0, started_at=excluded.started_at,
         renews_at=excluded.renews_at, cancelled_at=NULL`
    ).run(userId, now, now + PERIOD_MS);
    // 첫 결제 지급 — 웹훅 경로(settleOrder)로만, 주기별 order id 멱등
    settleOrder(db, `sub-${userId}-0`, userId, MONTHLY_GRANT, MEMBERSHIP_PRICE);
    trackEvent(db, "subscribe", userId, { plan: "membership" });
    return getSubscription(db, userId)!;
  });
}

/** 해지 — 기본: 기간만료(혜택 유지). 잔여 크레딧은 손대지 않는다 (P-02) */
export function cancelSubscription(db: DB, userId: string): SubRow {
  const s = getSubscription(db, userId);
  if (!s || s.status !== "active") throw new SubError("NONE", "활성 구독이 없습니다");
  db.prepare(
    "UPDATE subscriptions SET status = 'cancelled', cancelled_at = ? WHERE user_id = ?"
  ).run(Date.now(), userId);
  trackEvent(db, "churn", userId, { plan: "membership" });
  return getSubscription(db, userId)!;
}

/** lazy 갱신 배치 — renews_at 경과분만큼 주기 지급 (실서비스: 일 배치 + PG 정기결제 웹훅) */
export function ensureRenewal(db: DB, userId: string): void {
  const s = getSubscription(db, userId);
  if (!s || s.status !== "active") return;
  let { cycle, renews_at } = s;
  while (Date.now() >= renews_at) {
    cycle += 1;
    settleOrder(db, `sub-${userId}-${cycle}`, userId, MONTHLY_GRANT, MEMBERSHIP_PRICE);
    renews_at += PERIOD_MS;
  }
  if (cycle !== s.cycle) {
    db.prepare("UPDATE subscriptions SET cycle = ?, renews_at = ? WHERE user_id = ?").run(
      cycle,
      renews_at,
      userId
    );
  }
}
