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

  // ── 실데이터 KPI (북극성 §0) ──────────────────────────
  const quality = db
    .prepare(
      `SELECT ROUND(AVG(similarity), 3) AS avg_sim,
              ROUND(100.0 * SUM(CASE WHEN c2pa_manifest IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS c2pa
       FROM assets WHERE exposed = 1`
    )
    .get() as { avg_sim: number | null; c2pa: number | null };
  // 분자·분모 모두 활성(미파기) 사용자로 한정 — 파기 계정 포함 시 전환율 왜곡
  const buyers = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT o.user_id) AS c FROM orders o
         JOIN users u ON u.id = o.user_id AND u.provider != 'purged'`
      )
      .get() as { c: number }
  ).c;
  const conversion = users > 0 ? Math.round((buyers / users) * 1000) / 10 : 0;

  // 주간 잡 실집계 (7일)
  const weekly: { day: string; v: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const from = d.getTime();
    const v = (
      db.prepare("SELECT COUNT(*) AS c FROM jobs WHERE created_at >= ? AND created_at < ?")
        .get(from, from + 86400_000) as { c: number }
    ).c;
    weekly.push({ day: ["일", "월", "화", "수", "목", "금", "토"][d.getDay()], v });
  }

  // 진행 중 카나리
  const canaries = db
    .prepare("SELECT theme_id, id, canary_pct FROM prompt_versions WHERE status = 'canary'")
    .all() as { theme_id: string; id: string; canary_pct: number }[];

  // ── 서버 파생 경보 (DA-01 규칙 엔진) ──────────────────
  const alerts: { id: string; severity: "crit" | "warn" | "info"; text: string; href?: string }[] = [];
  const lowLive = db
    .prepare(
      `SELECT v.theme_id, m.best_cut FROM prompt_versions v
       JOIN version_metrics m ON m.version_id = v.id
       WHERE v.status = 'live' AND m.best_cut < 50 ORDER BY m.best_cut LIMIT 3`
    )
    .all() as { theme_id: string; best_cut: number }[];
  for (const l of lowLive) {
    alerts.push({
      id: `low-${l.theme_id}`,
      severity: "crit",
      text: `${l.theme_id} 베스트컷 선택률 ${l.best_cut}% — 기준(50%) 미달, 프롬프트 개선 필요 (PC-09)`,
      href: `/admin/prompts/${l.theme_id}`,
    });
  }
  if (modPending > 0) {
    alerts.push({
      id: "mod-sla",
      severity: "warn",
      text: `모더레이션 대기 ${modPending}건 — 리뷰 SLA 2시간`,
      href: "/admin/moderation",
    });
  }
  if (cost.usd > 10) {
    alerts.push({
      id: "cost-budget",
      severity: "warn",
      text: `24h 생성 원가 $${Math.round(cost.usd * 100) / 100} — 일 예산($10) 초과, 무료 큐 지연 전환 검토`,
    });
  }
  for (const c of canaries) {
    alerts.push({
      id: `canary-${c.theme_id}`,
      severity: "info",
      text: `카나리 진행 중: ${c.id} (${c.canary_pct}%) — 표본 200 도달 시 자동 판정`,
      href: `/admin/prompts/${c.theme_id}`,
    });
  }

  return ok({
    window: "24h",
    jobs,
    revenue,
    credits,
    costUsd: Math.round(cost.usd * 100) / 100,
    modPending,
    users,
    audit,
    kpi: {
      avgSimilarity: quality.avg_sim ?? 0,
      c2paCoverage: quality.c2pa ?? 100,
      conversion,
      buyers,
    },
    weekly,
    canaries,
    alerts,
  });
}
