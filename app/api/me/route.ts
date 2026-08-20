// GET /api/me — 잔액·프로필·원장 요약

import { NextResponse } from "next/server";
import { requireUser, ok } from "@/server/http";
import { balance, ledgerOf, reconcile } from "@/server/ledger";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { db, userId } = auth;
  const babies = db
    .prepare("SELECT id, name, birthday, trained FROM baby_profiles WHERE user_id = ?")
    .all(userId);
  return ok({
    userId,
    credits: balance(db, userId),
    babies,
    ledger: ledgerOf(db, userId, 20),
    ledgerIntegrity: reconcile(db, userId), // 리컨실 축약판 노출 (신뢰 장치)
  });
}
