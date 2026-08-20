// POST /api/admin/reconcile — 리컨실 배치 실행 (IN-02, 리드 전용)

import { getDb } from "@/server/db";
import { reconcileAll } from "@/server/reconcile";
import { ok, err, adminCtx } from "@/server/http";

export async function POST(req: Request) {
  const admin = adminCtx(req);
  if (!admin) return err(401, "UNAUTHORIZED", "어드민 자격 필요");
  if (admin.role !== "리드") return err(403, "FORBIDDEN", "리컨실 실행은 리드만 가능합니다");
  return ok(reconcileAll(getDb()));
}
