// GET  /api/admin/themes-board — 라이프사이클 보드 상태 (기획자+)
// POST /api/admin/themes-board — {themeId, action: 'check'|'advance', idx?}

import { getDb } from "@/server/db";
import { advanceStage, boardState, CmsError, toggleCheck } from "@/server/themeCms";
import { ok, err, adminCtx, handleError } from "@/server/http";

const ALLOWED = new Set(["운영자", "리드"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "테마 CMS 접근 불가");
  return ok(boardState(getDb()));
}

export async function POST(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "테마 CMS 접근 불가");
  try {
    const body = (await req.json().catch(() => ({}))) as {
      themeId?: string;
      action?: "check" | "advance";
      idx?: number;
    };
    if (!body.themeId || !body.action) return err(400, "BAD_REQUEST", "themeId·action 필요");
    const db = getDb();
    if (body.action === "check") {
      if (body.idx == null) return err(400, "BAD_REQUEST", "idx 필요");
      toggleCheck(db, body.themeId, body.idx);
      return ok({ done: true });
    }
    const r = advanceStage(db, body.themeId, admin.role, admin.actor);
    return ok(r);
  } catch (e) {
    if (e instanceof CmsError) {
      return err(e.code === "FORBIDDEN" ? 403 : e.code === "GATE" ? 422 : 409, e.code, e.message);
    }
    return handleError(e);
  }
}
