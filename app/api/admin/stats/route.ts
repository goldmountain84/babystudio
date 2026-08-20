// GET /api/admin/stats — S12-A 실데이터 (오늘 잡·매출·모더레이션·감사로그)

import { getDb } from "@/server/db";
import { ok, err, adminCtx } from "@/server/http";

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  const db = getDb();
  const since = Date.now() - 24 * 3600_000;
  const jobs = db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
              SUM(CASE WHEN status IN ('queued','running','postprocess') THEN 1 ELSE 0 END) AS active
       FROM jobs WHERE created_at > ?`
    )
    .get(since) as { total: number; failed: number; active: number };
  const revenue = db
    .prepare("SELECT COALESCE(SUM(amount),0) AS krw, COUNT(*) AS orders FROM orders WHERE created_at > ?")
    .get(since) as { krw: number; orders: number };
  const credits = db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END),0) AS issued,
              COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END),0) AS spent
       FROM credit_ledger WHERE created_at > ?`
    )
    .get(since) as { issued: number; spent: number };
  // BE-3 (IN-06): 원가 실집계 — 잡 + 클립
  const cost = db
    .prepare(
      `SELECT (SELECT COALESCE(SUM(cost_usd),0) FROM jobs WHERE created_at > ?) +
              (SELECT COALESCE(SUM(cost_usd),0) FROM clips WHERE created_at > ?) AS usd`
    )
    .get(since, since) as { usd: number };
  const modPending = (
    db.prepare("SELECT COUNT(*) AS c FROM moderation_items WHERE status = 'pending'").get() as { c: number }
  ).c;
  const users = (db.prepare("SELECT COUNT(*) AS c FROM users WHERE provider != 'purged'").get() as { c: number }).c;
  const audit = db
    .prepare("SELECT actor, action, target, created_at FROM audit_log ORDER BY id DESC LIMIT 10")
    .all();
  return ok({
    window: "24h",
    jobs,
    revenue,
    credits,
    costUsd: Math.round(cost.usd * 100) / 100,
    modPending,
    users,
    audit,
  });
}
