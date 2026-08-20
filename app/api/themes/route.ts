// GET /api/themes — 테마 카탈로그 (프롬프트 원문 미포함 — 서버 조립 원칙)

import { getDb } from "@/server/db";
import { seedPrompts } from "@/server/prompts";
import { ok } from "@/server/http";
import { THEME_APPS } from "@/lib/data";

export async function GET() {
  const db = getDb();
  seedPrompts(db);
  const liveThemes = new Set(
    (db.prepare("SELECT DISTINCT theme_id FROM prompt_versions WHERE status = 'live'").all() as {
      theme_id: string;
    }[]).map((r) => r.theme_id)
  );
  return ok({
    themes: THEME_APPS.map((a) => ({
      id: a.id,
      name: a.name,
      milestone: a.milestone,
      cuts: a.cuts,
      credits: a.credits,
      badges: a.badges,
      options: a.options,
      generatable: liveThemes.has(a.id), // live 프롬프트 체인이 있는 테마만 생성 가능
    })),
  });
}
