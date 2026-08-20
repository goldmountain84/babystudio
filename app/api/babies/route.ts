// POST /api/babies — 프로필 생성 (consent_at 기록)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { createBaby } from "@/server/auth";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await req.json()) as { name?: string; birthday?: string };
    if (!body.name || !body.birthday) return err(400, "BAD_REQUEST", "name·birthday 필요");
    const babyId = createBaby(auth.db, auth.userId, body.name, body.birthday);
    return ok({ babyId }, 201);
  } catch (e) {
    return handleError(e);
  }
}
