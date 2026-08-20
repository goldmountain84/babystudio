// GET /api/admin/users/:id?view_reason= — 사용자 360 (DF-01: 열람 사유 필수 → 감사)
// POST /api/admin/users/:id/credits 는 credits/route.ts

import { getDb, audit } from "@/server/db";
import { ledgerOf, balance, reconcile } from "@/server/ledger";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["CS", "모더레이터", "리드"]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", "권한 없음");
  const viewReason = new URL(req.url).searchParams.get("view_reason");
  if (!viewReason)
    return err(400, "VIEW_REASON_REQUIRED", "개인정보 열람 사유가 필요합니다 (DF-01)");
  const { id } = await ctx.params;
  const db = getDb();
  const user = db.prepare("SELECT id, name, provider, created_at FROM users WHERE id = ?").get(id);
  if (!user) return err(404, "NOT_FOUND", "사용자 없음");
  audit(db, admin.actor, `사용자 정보 열람 (사유: ${viewReason})`, id);
  const babies = db.prepare("SELECT id, name, birthday, trained FROM baby_profiles WHERE user_id = ?").all(id);
  const jobs = db
    .prepare("SELECT id, theme_id, status, created_at FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10")
    .all(id);
  return ok({
    user,
    babies,
    jobs,
    credits: balance(db, id),
    ledger: ledgerOf(db, id, 20),
    ledgerIntegrity: reconcile(db, id),
  });
}
