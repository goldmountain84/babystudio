// BE-3 · 리컨실 배치 (IN-02) — 일 배치의 데모 트리거
// ① 전 사용자 원장 balance_after 체인 검증 ② 24h 초과 미결 hold 강제 반환

import { type DB, audit } from "./db";
import { reconcile, refundHold } from "./ledger";

const STALE_HOLD_MS = 24 * 3600_000;

export interface ReconcileReport {
  usersChecked: number;
  chainsBroken: string[];
  staleHoldsRefunded: number;
}

export function reconcileAll(db: DB): ReconcileReport {
  const users = db
    .prepare("SELECT DISTINCT user_id AS id FROM credit_ledger")
    .all() as { id: string }[];
  const chainsBroken: string[] = [];
  for (const u of users) {
    const r = reconcile(db, u.id);
    if (!r.ok) chainsBroken.push(`${u.id}@row${r.brokenAt}`);
  }
  const stale = db
    .prepare("SELECT job_id FROM credit_holds WHERE state = 'held' AND created_at < ?")
    .all(Date.now() - STALE_HOLD_MS) as { job_id: string }[];
  for (const h of stale) {
    refundHold(db, h.job_id, "24h 미결 hold 강제 반환 (리컨실 배치)");
  }
  audit(
    db,
    "시스템",
    `리컨실 배치 — 사용자 ${users.length} 검증, 체인 파손 ${chainsBroken.length}, 미결 hold 반환 ${stale.length}`,
    "credit_ledger"
  );
  return {
    usersChecked: users.length,
    chainsBroken,
    staleHoldsRefunded: stale.length,
  };
}
