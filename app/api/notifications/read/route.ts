// POST /api/notifications/read — 읽음 처리 ({id} 단건 · 없으면 전체)

import { NextResponse } from "next/server";
import { requireUser, ok } from "@/server/http";
import { markRead } from "@/server/notifications";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { id?: number };
  markRead(auth.db, auth.userId, body.id);
  return ok({ done: true });
}
