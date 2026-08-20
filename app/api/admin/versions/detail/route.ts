// GET /api/admin/versions/detail?theme= — 원문 포함 전체 버전 (기획자+ 열람, PB-01)
// 열람 자체를 감사로그에 기록 — 프롬프트는 레시피 자산

import { getDb, audit } from "@/server/db";
import { seedPrompts, versionsFull } from "@/server/prompts";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["운영자", "리드"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", `${admin.role} 역할은 프롬프트 열람 불가`);
  const theme = new URL(req.url).searchParams.get("theme");
  if (!theme) return err(400, "BAD_REQUEST", "theme 쿼리 필요");
  const db = getDb();
  seedPrompts(db);
  audit(db, admin.actor, "프롬프트 원문 열람", theme);
  return ok({ versions: versionsFull(db, theme) });
}
