// POST /api/jobs — 생성 잡 접수 (hold → 큐). Idempotency-Key 지원 (설계서 §4·5)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { createImageJob } from "@/server/jobs";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await req.json()) as {
      babyId?: string;
      themeId?: string;
      options?: { outfit?: string; background?: string; forceFail?: boolean };
    };
    if (!body.babyId || !body.themeId) return err(400, "BAD_REQUEST", "babyId·themeId 필요");
    const r = createImageJob(auth.db, {
      userId: auth.userId,
      babyId: body.babyId,
      themeId: body.themeId,
      options: body.options ?? {},
      idempotencyKey: req.headers.get("idempotency-key") ?? undefined,
    });
    return ok(r, r.reused ? 200 : 202);
  } catch (e) {
    return handleError(e);
  }
}
