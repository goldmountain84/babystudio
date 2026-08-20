"use client";

// 어드민 콘솔 → 서버 API 브리지 (BE-2)
// HTTP 헤더는 latin-1 — 역할·행위자를 ASCII 토큰으로 전송 (실서비스: SSO 클레임)

import type { AdminRole } from "./adminData";

const ROLE_TOKEN: Record<AdminRole, string> = {
  리드: "lead",
  운영자: "operator",
  모더레이터: "moderator",
  CS: "cs",
};

const ACTOR_TOKEN: Record<AdminRole, string> = {
  리드: "lead-sijeol",
  운영자: "operator-sijeol",
  모더레이터: "moderator-sijeol",
  CS: "cs-sijeol",
};

export async function adminApi(
  path: string,
  role: AdminRole,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-role": ROLE_TOKEN[role],
      "x-admin-actor": ACTOR_TOKEN[role],
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, body };
}
