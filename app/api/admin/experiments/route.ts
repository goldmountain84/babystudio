// GET /api/admin/experiments — 실험 플랫폼 (S12-D 서버화)
// 프롬프트 실험 = 카나리 진행 테마에서 파생(version_metrics), 이력 = 감사로그의 승격/중단 이벤트.
// 가격 실험은 결제 실험 인프라(BE-4) 전까지 데모 픽스처.

import { getDb } from "@/server/db";
import { seedPrompts } from "@/server/prompts";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["운영자", "리드"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "실험 접근 불가");
  const db = getDb();
  seedPrompts(db);

  const running = db
    .prepare(
      `SELECT c.theme_id,
              c.id AS canary_id, c.canary_pct, cm.best_cut AS canary_best, cm.samples AS canary_samples,
              l.id AS live_id, lm.best_cut AS live_best, lm.samples AS live_samples
       FROM prompt_versions c
       JOIN prompt_versions l ON l.theme_id = c.theme_id AND l.status = 'live'
       LEFT JOIN version_metrics cm ON cm.version_id = c.id
       LEFT JOIN version_metrics lm ON lm.version_id = l.id
       WHERE c.status = 'canary'`
    )
    .all();

  const history = db
    .prepare(
      `SELECT actor, action, target, created_at FROM audit_log
       WHERE action LIKE '%자동 승격%' OR action LIKE '%자동 중단%' OR action LIKE '%승격/롤백%'
       ORDER BY id DESC LIMIT 10`
    )
    .all();

  return ok({
    running,
    history,
    fixtures: [
      {
        name: "스튜디오 패키지 ₩19,900 vs ₩17,900 (신규 한정)",
        kind: "가격",
        metricName: "무료→유료 전환율 %",
        variants: [
          { name: "₩19,900", traffic: 50, metric: 7.4, samples: 1410 },
          { name: "₩17,900", traffic: 50, metric: 8.1, samples: 1385 },
        ],
        minSamples: 2000,
        note: "가격 실험 인프라는 BE-4 — 데모 픽스처",
      },
    ],
  });
}
