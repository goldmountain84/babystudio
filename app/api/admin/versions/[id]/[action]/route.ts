// POST /api/admin/versions/:id/:action — 상태 전이 (review|approve|canary|promote)
// 4-eyes는 서버가 강제 — 클라이언트 검증은 UX일 뿐 (설계 원칙 §0)

import { getDb } from "@/server/db";
import {
  approve,
  promote,
  requestReview,
  seedPrompts,
  startCanary,
} from "@/server/prompts";
import { ok, err, handleError, adminCtx } from "@/server/http";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; action: string }> }
) {
  const admin = adminCtx(req);
  if (!admin)
    return err(401, "UNAUTHORIZED", "어드민 자격 필요", "x-admin-actor + x-admin-role(lead|operator|moderator|cs)");
  const { actor, role } = admin;
  try {
    const { id, action } = await ctx.params;
    const db = getDb();
    seedPrompts(db);
    switch (action) {
      case "review":
        requestReview(db, id, actor);
        break;
      case "approve":
        approve(db, id, actor, role);
        break;
      case "canary": {
        const body = (await req.json().catch(() => ({}))) as { pct?: number };
        startCanary(db, id, actor, body.pct ?? 5);
        break;
      }
      case "promote": {
        if (role !== "리드") return err(403, "FORBIDDEN", "승격/롤백은 리드만 가능합니다");
        const body = (await req.json().catch(() => ({}))) as { reason?: string };
        promote(db, id, actor, body.reason);
        break;
      }
      default:
        return err(400, "BAD_ACTION", `지원하지 않는 액션: ${action}`);
    }
    return ok({ versionId: id, action, done: true });
  } catch (e) {
    return handleError(e);
  }
}
