// GET /api/assets/:id/image?token= — 실사 생성물 서빙
// <img>는 Authorization 헤더를 못 보내므로 세션 토큰 쿼리 허용 (실서비스: S3 서명 URL 24h)

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "node:fs";
import { getDb } from "@/server/db";
import { userFromToken } from "@/server/auth";
import { jobImagePath } from "@/server/vendor";
import { err } from "@/server/http";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const userId =
    userFromToken(db, req.headers.get("authorization")) ??
    (token ? userFromToken(db, `Bearer ${token}`) : null);
  if (!userId) return err(401, "UNAUTHORIZED", "인증 필요");

  const { id } = await ctx.params;
  const a = db
    .prepare(
      `SELECT assets.job_id AS job_id, assets.idx AS idx, jobs.user_id AS owner
       FROM assets JOIN jobs ON jobs.id = assets.job_id WHERE assets.id = ?`
    )
    .get(id) as { job_id: string; idx: number; owner: string } | undefined;
  if (!a || a.owner !== userId) return err(404, "NOT_FOUND", "컷 없음");

  const file = jobImagePath(a.job_id, a.idx);
  if (!existsSync(file)) return err(404, "NO_IMAGE", "실사 이미지가 없는 컷입니다 (시뮬레이터 생성분)");
  return new NextResponse(new Uint8Array(readFileSync(file)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
