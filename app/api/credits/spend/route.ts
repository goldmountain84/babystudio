// POST /api/credits/spend — 즉시 처리형 과금 (영상 클립 등, BE-3 전까지의 브리지)
// hold → 즉시 confirm. 원장 단일 진실 유지.

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { hold, confirmHold, balance } from "@/server/ledger";
import { newId } from "@/server/db";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await req.json().catch(() => ({}))) as { amount?: number; reason?: string };
    if (!body.amount || body.amount <= 0 || !body.reason)
      return err(400, "BAD_REQUEST", "amount(+)·reason 필요");
    const spendId = newId("spend");
    hold(auth.db, auth.userId, spendId, body.amount, body.reason);
    confirmHold(auth.db, spendId);
    return ok({ credits: balance(auth.db, auth.userId) });
  } catch (e) {
    return handleError(e);
  }
}
