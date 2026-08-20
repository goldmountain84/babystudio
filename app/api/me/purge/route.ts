// POST /api/me/purge — 전체 파기 + 삭제 영수증 (TR-01)

import { NextResponse } from "next/server";
import { requireUser, ok, handleError } from "@/server/http";
import { purgeUser } from "@/server/purge";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const receipt = purgeUser(auth.db, auth.userId);
    return ok({ receipt, note: "원장·감사로그는 법정 보존 (가명화) · 영수증은 이메일 발송 (데모 생략)" });
  } catch (e) {
    return handleError(e);
  }
}
