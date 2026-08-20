// POST /api/subscriptions/cancel — 해지 (기간만료 · 잔여 크레딧 유지 · 다크패턴 금지)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { cancelSubscription, SubError } from "@/server/subscriptions";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const s = cancelSubscription(auth.db, auth.userId);
    return ok({
      subscription: s,
      note: "혜택은 기간 만료까지 유지되며 잔여 크레딧은 그대로예요",
    });
  } catch (e) {
    if (e instanceof SubError) return err(409, e.code, e.message);
    return handleError(e);
  }
}
