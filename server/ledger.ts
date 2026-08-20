// BE-1 · 크레딧 원장 (백엔드 설계서 §6)
// 규칙: 모든 잔액 변화는 INSERT로만. balance_after는 직전 행 기준으로 계산·검증.
// hold 모델: hold 시점에 -amount 기록(가용 잔액 즉시 반영) → 성공 시 hold 확정(추가 행 없음),
//            실패 시 +amount 'refund' 행. (설계서 §6의 축약 구현 — 의미는 동일)

import { type DB, withTx, trackEvent } from "./db";

export class LedgerError extends Error {
  constructor(
    public code: "INSUFFICIENT" | "HOLD_NOT_FOUND" | "HOLD_STATE",
    message: string
  ) {
    super(message);
  }
}

interface LedgerRow {
  balance_after: number;
}

export function balance(db: DB, userId: string): number {
  const row = db
    .prepare(
      "SELECT balance_after FROM credit_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 1"
    )
    .get(userId) as LedgerRow | undefined;
  return row?.balance_after ?? 0;
}

function append(
  db: DB,
  userId: string,
  delta: number,
  type: "grant" | "hold" | "refund" | "manual" | "expire",
  refType: string | null,
  refId: string | null,
  reason: string
): number {
  return withTx(db, () => {
    const bal = balance(db, userId) + delta;
    if (bal < 0) {
      throw new LedgerError("INSUFFICIENT", `크레딧 부족: ${-bal}C 더 필요`);
    }
    db.prepare(
      `INSERT INTO credit_ledger (user_id, delta, balance_after, type, ref_type, ref_id, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, delta, bal, type, refType, refId, reason, Date.now());
    return bal;
  });
}

export function grant(
  db: DB,
  userId: string,
  amount: number,
  refType: string,
  refId: string,
  reason: string
): number {
  if (amount <= 0) throw new Error("grant amount must be positive");
  return append(db, userId, amount, "grant", refType, refId, reason);
}

/** 잡 시작 시 예약 — 즉시 차감으로 가용 잔액에 반영. 잡당 1회(PK) 보장 */
export function hold(db: DB, userId: string, jobId: string, amount: number, reason: string): void {
  if (amount === 0) return; // 무료 잡
  withTx(db, () => {
    append(db, userId, -amount, "hold", "job", jobId, reason);
    db.prepare(
      "INSERT INTO credit_holds (job_id, user_id, amount, state, created_at) VALUES (?, ?, ?, 'held', ?)"
    ).run(jobId, userId, amount, Date.now());
  });
}

/** 잡 성공 → 확정 (원장 추가 행 없음 — hold가 이미 차감) */
export function confirmHold(db: DB, jobId: string): void {
  withTx(db, () => {
    const h = db
      .prepare("SELECT user_id, amount, state FROM credit_holds WHERE job_id = ?")
      .get(jobId) as { user_id: string; amount: number; state: string } | undefined;
    if (!h) return; // 무료 잡 — hold 없음
    if (h.state !== "held")
      throw new LedgerError("HOLD_STATE", `이미 ${h.state} 상태인 hold`);
    db.prepare("UPDATE credit_holds SET state = 'confirmed' WHERE job_id = ?").run(jobId);
  });
}

/** 잡 실패·취소 → 자동 반환 */
export function refundHold(db: DB, jobId: string, reason: string): void {
  withTx(db, () => {
    const h = db
      .prepare("SELECT user_id, amount, state FROM credit_holds WHERE job_id = ?")
      .get(jobId) as { user_id: string; amount: number; state: string } | undefined;
    if (!h) return;
    if (h.state !== "held")
      throw new LedgerError("HOLD_STATE", `이미 ${h.state} 상태인 hold`);
    append(db, h.user_id, h.amount, "refund", "job", jobId, reason);
    db.prepare("UPDATE credit_holds SET state = 'refunded' WHERE job_id = ?").run(jobId);
  });
}

/** 어드민 수동 조정 (DF-03) — 사유 필수, 100C 초과는 리드만 (서버 강제) */
export function manualAdjust(
  db: DB,
  userId: string,
  delta: number,
  reason: string,
  actorRole: string
): number {
  if (!reason.trim()) throw new Error("사유 코드는 필수입니다");
  if (Math.abs(delta) > 100 && actorRole !== "리드") {
    throw new Error("100C 초과 조정은 리드(4-eyes) 권한이 필요합니다");
  }
  return append(db, userId, delta, "manual", "cs", null, reason);
}

export function ledgerOf(db: DB, userId: string, limit = 50) {
  return db
    .prepare(
      "SELECT delta, balance_after, type, ref_type, ref_id, reason, created_at FROM credit_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?"
    )
    .all(userId, limit);
}

/** 리컨실(IN-02) 축약판: 원장 무결성 스캔 — balance_after 체인 검증 */
export function reconcile(db: DB, userId: string): { ok: boolean; brokenAt?: number } {
  const rows = db
    .prepare(
      "SELECT id, delta, balance_after FROM credit_ledger WHERE user_id = ? ORDER BY id"
    )
    .all(userId) as { id: number; delta: number; balance_after: number }[];
  let bal = 0;
  for (const r of rows) {
    bal += r.delta;
    if (bal !== r.balance_after) return { ok: false, brokenAt: r.id };
  }
  return { ok: true };
}

/** 결제 웹훅 지급 — order_id 멱등 (설계서 §4.1) */
export function settleOrder(
  db: DB,
  orderId: string,
  userId: string,
  credits: number,
  amount: number
): { granted: boolean } {
  return withTx(db, () => {
    const exists = db.prepare("SELECT id FROM orders WHERE id = ?").get(orderId);
    if (exists) return { granted: false }; // 멱등 — 중복 웹훅 무시
    db.prepare(
      "INSERT INTO orders (id, user_id, credits, amount, status, created_at) VALUES (?, ?, ?, ?, 'paid', ?)"
    ).run(orderId, userId, credits, amount, Date.now());
    grant(db, userId, credits, "order", orderId, `크레딧 팩 구매 (₩${amount})`);
    trackEvent(db, "purchase", userId, { orderId, credits, amount });
    return { granted: true };
  });
}
