// GET /api/notifications — 알림 센터 (조회 시 D-day 저니 lazy 실행)

import { NextResponse } from "next/server";
import { requireUser, ok } from "@/server/http";
import { listNotifications } from "@/server/notifications";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  return ok({ notifications: listNotifications(auth.db, auth.userId) });
}
