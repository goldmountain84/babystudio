// GET /api/albums — 완료된 이미지 잡 + 노출 컷 (설계서 §4.1)

import { NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { requireUser, ok } from "@/server/http";
import { jobImagePath } from "@/server/vendor";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { db, userId } = auth;
  const jobs = db
    .prepare(
      `SELECT id, theme_id, requested_cuts, created_at, finished_at
       FROM jobs WHERE user_id = ? AND type = 'image' AND status = 'done'
       ORDER BY finished_at DESC LIMIT 50`
    )
    .all(userId) as {
    id: string;
    theme_id: string;
    requested_cuts: number;
    created_at: number;
    finished_at: number;
  }[];
  const assetsStmt = db.prepare(
    `SELECT id, idx, similarity, hi_res, is_best FROM assets
     WHERE job_id = ? AND exposed = 1 ORDER BY is_best DESC, similarity DESC`
  );
  return ok({
    items: jobs.map((j) => ({
      id: j.id,
      themeId: j.theme_id,
      createdAt: j.finished_at ?? j.created_at,
      assets: (assetsStmt.all(j.id) as { id: string; idx: number }[]).map((a) => ({
        ...a,
        has_image: existsSync(jobImagePath(j.id, a.idx)) ? 1 : 0,
      })),
    })),
  });
}
