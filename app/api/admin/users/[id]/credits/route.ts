// POST /api/admin/users/:id/credits — 수동 조정 (DF-03: 사유 필수, 100C 초과 리드만 — 서버 강제)

import { getDb } from "@/server/db";
import { manualAdjust } from "@/server/ledger";
import { ok, err, adminCtx, handleError } from "@/server/http";

const ALLOWED = new Set(["CS", "리드"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "크레딧 조정 권한 없음");
  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { delta?: number; reason?: string };
    if (!body.delta || !body.reason) return err(400, "BAD_REQUEST", "delta·reason 필요");
    const newBalance = manualAdjust(getDb(), id, body.delta, body.reason, admin.role);
    return ok({ credits: newBalance });
  } catch (e) {
    if (e instanceof Error && e.message.includes("리드")) {
      return err(403, "FOUR_EYES_REQUIRED", e.message);
    }
    return handleError(e);
  }
}
