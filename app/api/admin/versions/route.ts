// POST /api/admin/versions — draft 생성 (서버 린터 강제)
// GET  /api/admin/versions?theme= — 버전 목록
// 데모 인증: x-admin-actor / x-admin-role 헤더 (실서비스: SSO 클레임, §9)

import { getDb, audit } from "@/server/db";
import { createDraft, seedPrompts, versionsOf } from "@/server/prompts";
import { ok, err, handleError, adminCtx } from "@/server/http";

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin)
    return err(401, "UNAUTHORIZED", "어드민 자격 필요", "x-admin-actor + x-admin-role(lead|operator|moderator|cs)");
  const db = getDb();
  seedPrompts(db);
  const theme = new URL(req.url).searchParams.get("theme");
  if (!theme) return err(400, "BAD_REQUEST", "theme 쿼리 필요");
  audit(db, admin.actor, "버전 목록 열람", theme);
  return ok({ versions: versionsOf(db, theme) });
}

export async function POST(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  try {
    const body = (await req.json()) as {
      themeId?: string;
      positive?: string;
      themeNegative?: string;
      params?: Record<string, unknown>;
    };
    if (!body.themeId || !body.positive) return err(400, "BAD_REQUEST", "themeId·positive 필요");
    const db = getDb();
    seedPrompts(db);
    const id = createDraft(
      db,
      body.themeId,
      {
        positive: body.positive,
        themeNegative: body.themeNegative ?? "",
        params: body.params ?? { engine: "Flux LoRA fine-tune", steps: 30, cfg: 3.0 },
      },
      admin.actor
    );
    return ok({ versionId: id }, 201);
  } catch (e) {
    return handleError(e);
  }
}
