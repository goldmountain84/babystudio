// API 라우트 공용 헬퍼 — 에러 규약 {code, message, hint} (설계서 §4)

import { NextResponse } from "next/server";
import { getDb, type DB } from "./db";
import { userFromToken } from "./auth";
import { JobError } from "./jobs";
import { PromptError } from "./prompts";
import { LedgerError } from "./ledger";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(status: number, code: string, message: string, hint?: string) {
  return NextResponse.json({ code, message, hint }, { status });
}

export function requireUser(req: Request): { db: DB; userId: string } | NextResponse {
  const db = getDb();
  const userId = userFromToken(db, req.headers.get("authorization"));
  if (!userId) return err(401, "UNAUTHORIZED", "로그인이 필요합니다");
  return { db, userId };
}

// 어드민 데모 자격 — HTTP 헤더는 latin-1이므로 역할은 ASCII 토큰 (실서비스: SSO 클레임, §9)
const ROLE_MAP: Record<string, string> = {
  lead: "리드",
  operator: "운영자",
  moderator: "모더레이터",
  cs: "CS",
};

export function adminCtx(req: Request): { actor: string; role: string } | null {
  const actor = req.headers.get("x-admin-actor");
  const roleKey = req.headers.get("x-admin-role")?.toLowerCase();
  const role = roleKey ? ROLE_MAP[roleKey] : undefined;
  if (!actor || !role) return null;
  return { actor, role };
}

export function handleError(e: unknown) {
  if (e instanceof JobError) {
    const status = e.code === "INSUFFICIENT" ? 402 : e.code === "NOT_FOUND" ? 404 : 400;
    return err(status, e.code, e.message, e.code === "INSUFFICIENT" ? "크레딧을 충전해 주세요" : undefined);
  }
  if (e instanceof PromptError) {
    const status = e.code === "FORBIDDEN" ? 403 : e.code === "NOT_FOUND" ? 404 : e.code === "STATE" ? 409 : 422;
    return err(status, e.code, e.message);
  }
  if (e instanceof LedgerError) {
    return err(e.code === "INSUFFICIENT" ? 402 : 409, e.code, e.message);
  }
  console.error("[api]", e);
  return err(500, "INTERNAL", "서버 오류가 발생했습니다");
}
