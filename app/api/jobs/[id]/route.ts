// GET /api/jobs/:id — 상태 조회 (assembled_prompt는 절대 미포함)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { jobView } from "@/server/jobs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await ctx.params;
    const owner = auth.db.prepare("SELECT user_id FROM jobs WHERE id = ?").get(id) as
      | { user_id: string }
      | undefined;
    if (!owner || owner.user_id !== auth.userId) return err(404, "NOT_FOUND", "잡 없음");
    return ok(jobView(auth.db, id));
  } catch (e) {
    return handleError(e);
  }
}
