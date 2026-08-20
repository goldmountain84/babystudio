// POST /api/auth/:provider — 소셜 로그인 (데모 목, 설계서 §4.1)

import { getDb } from "@/server/db";
import { socialLogin } from "@/server/auth";
import { ok, err, handleError } from "@/server/http";

const PROVIDERS = new Set(["kakao", "google", "apple"]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await ctx.params;
    if (!PROVIDERS.has(provider)) return err(400, "BAD_PROVIDER", "지원하지 않는 로그인 수단");
    const body = (await req.json().catch(() => ({}))) as { name?: string; guardian?: boolean };
    if (!body.name) return err(400, "BAD_REQUEST", "name이 필요합니다");
    if (!body.guardian) return err(400, "GUARDIAN_REQUIRED", "보호자 확인 동의가 필요합니다 (A-02)");
    const r = socialLogin(getDb(), provider, body.name);
    return ok(r, r.isNew ? 201 : 200);
  } catch (e) {
    return handleError(e);
  }
}
