// GET /api/admin/users — 사용자 목록 (S12-F, CS·모더레이터·리드)

import { getDb } from "@/server/db";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["CS", "모더레이터", "리드"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", `${admin.role} 역할은 사용자 콘솔 접근 불가`);
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.provider, u.created_at,
              (SELECT balance_after FROM credit_ledger l WHERE l.user_id = u.id ORDER BY l.id DESC LIMIT 1) AS credits,
              (SELECT COUNT(*) FROM jobs j WHERE j.user_id = u.id) AS jobs,
              (SELECT name FROM baby_profiles b WHERE b.user_id = u.id LIMIT 1) AS baby
       FROM users u ORDER BY u.created_at DESC LIMIT 50`
    )
    .all();
  return ok({ users: rows });
}
