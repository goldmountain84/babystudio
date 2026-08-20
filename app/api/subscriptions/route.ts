// POST /api/subscriptions — 멤버십 구독 (지급은 웹훅 경로 settleOrder)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { subscribe, SubError } from "@/server/subscriptions";
import { balance } from "@/server/ledger";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const s = subscribe(auth.db, auth.userId);
    return ok({ subscription: s, credits: balance(auth.db, auth.userId) }, 201);
  } catch (e) {
    if (e instanceof SubError) return err(409, e.code, e.message);
    return handleError(e);
  }
}
