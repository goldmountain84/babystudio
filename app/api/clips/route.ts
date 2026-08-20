// POST /api/clips — 영상 클립·타임랩스 접수 (가격은 서버 계산)
// GET  /api/clips — 내 클립 목록 (조회 시점 tick)

import { NextResponse } from "next/server";
import { requireUser, ok, err, handleError } from "@/server/http";
import { createClip, listClips, type ClipParams } from "@/server/clips";
import { balance } from "@/server/ledger";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ClipParams>;
    if (!body.kind || !body.length || !body.bgm || !body.format) {
      return err(400, "BAD_REQUEST", "kind·length·bgm·format 필요");
    }
    const r = createClip(auth.db, auth.userId, {
      kind: body.kind,
      assetId: body.assetId,
      sourceCount: body.sourceCount,
      motion: body.motion,
      length: body.length,
      bgm: body.bgm,
      format: body.format,
      preview: Boolean(body.preview),
    });
    return ok({ ...r, credits: balance(auth.db, auth.userId) }, 202);
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  return ok({ clips: listClips(auth.db, auth.userId) });
}
