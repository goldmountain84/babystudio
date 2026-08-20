// POST /api/assets/:id/hires — 고해상도 해금 (2C, 즉시 처리형 hold→confirm)

import { NextResponse } from "next/server";
import { requireUser, ok, handleError } from "@/server/http";
import { unlockHiRes } from "@/server/jobs";
import { balance } from "@/server/ledger";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await ctx.params;
    unlockHiRes(auth.db, auth.userId, id);
    return ok({ unlocked: true, credits: balance(auth.db, auth.userId) });
  } catch (e) {
    return handleError(e);
  }
}
