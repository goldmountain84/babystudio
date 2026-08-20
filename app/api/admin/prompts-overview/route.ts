// GET /api/admin/prompts-overview — S12-B1 목록 (기획자+)

import { getDb } from "@/server/db";
import { promptsOverview, seedPrompts } from "@/server/prompts";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["운영자", "리드"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", `${admin.role} 역할은 프롬프트 접근 불가`);
  const db = getDb();
  seedPrompts(db);
  return ok({ rows: promptsOverview(db) });
}
