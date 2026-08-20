// GET /api/admin/mod — 모더레이션 큐 (모더레이터·리드·CS)

import { getDb } from "@/server/db";
import { listModeration, seedModeration } from "@/server/moderation";
import { ok, err, adminCtx } from "@/server/http";

const ALLOWED = new Set(["모더레이터", "리드", "CS"]);

export async function GET(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (!ALLOWED.has(admin.role)) return err(403, "FORBIDDEN", `${admin.role} 역할은 모더레이션 접근 불가`);
  const db = getDb();
  seedModeration(db);
  return ok({ items: listModeration(db) });
}
