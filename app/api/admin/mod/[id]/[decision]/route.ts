// POST /api/admin/mod/:id/:decision — 검수 결정 (모더레이터·리드만, RBAC 서버 강제)

import { getDb } from "@/server/db";
import { decideModeration, type ModDecision } from "@/server/moderation";
import { ok, err, adminCtx } from "@/server/http";

const DECISIONS = new Set(["approved", "blocked", "escalated"]);
const ALLOWED = new Set(["모더레이터", "리드"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; decision: string }> }
) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role))
    return err(403, "FORBIDDEN", `${admin.role} 역할은 검수 결정 권한이 없습니다`);
  const { id, decision } = await ctx.params;
  if (!DECISIONS.has(decision)) return err(400, "BAD_DECISION", `지원하지 않는 결정: ${decision}`);
  const done = decideModeration(getDb(), id, decision as ModDecision, admin.actor);
  if (!done) return err(409, "ALREADY_DECIDED", "이미 결정됐거나 없는 항목입니다");
  return ok({ id, decision, done: true });
}
