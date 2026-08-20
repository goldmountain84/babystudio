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
    return ok({ trained: true, note: "참조 사진은 얼굴 유지 생성(images/edits)에 사용됩니다" });
  } catch (e) {
    // 학습 게이트(사진 부족·프로필 없음)는 도메인 에러 — 400으로 표면화
    if (e instanceof Error && /부족|프로필/.test(e.message)) {
      return NextResponse.json({ code: "TRAIN_GATE", message: e.message }, { status: 400 });
    }
    return handleError(e);
  }
}
