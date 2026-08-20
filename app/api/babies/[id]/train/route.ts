// POST /api/babies/:id/train — 학습 잡 (BE-1: 즉시 완료 시뮬레이션)

import { NextResponse } from "next/server";
import { requireUser, ok, handleError } from "@/server/http";
import { trainBaby } from "@/server/auth";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await ctx.params;
    trainBaby(auth.db, auth.userId, id);
    return ok({ trained: true, note: "실서비스: LoRA 학습 큐 + 완료 시 원본 즉시 삭제" });
  } catch (e) {
    return handleError(e);
  }
}
