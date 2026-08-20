// POST /api/admin/themes/:id/canary-tick — 카나리 표본 배치 틱 (PC-06·07)
// 실서비스: 15분 배치. 데모: 어드민 버튼이 호출.

import { getDb } from "@/server/db";
import { canaryTick, seedPrompts } from "@/server/prompts";
import { ok, err, adminCtx, handleError } from "@/server/http";

const ALLOWED = new Set(["운영자", "리드"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "권한 없음");
  try {
    const { id } = await ctx.params;
    const db = getDb();
    seedPrompts(db);
    return ok(canaryTick(db, id, admin.actor));
  } catch (e) {
    return handleError(e);
  }
}
