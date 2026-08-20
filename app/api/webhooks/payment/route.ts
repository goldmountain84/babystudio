// POST /api/webhooks/payment — 크레딧 지급의 유일한 트리거 (설계서 §4.1)
// HMAC-SHA256 서명 검증 + order_id 멱등

import { getDb } from "@/server/db";
import { verifyWebhook } from "@/server/auth";
import { settleOrder } from "@/server/ledger";
import { ok, err, handleError } from "@/server/http";

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const sig = req.headers.get("x-babystudio-signature");
    if (!verifyWebhook(raw, sig)) {
      return err(401, "BAD_SIGNATURE", "웹훅 서명 검증 실패");
    }
    const body = JSON.parse(raw) as {
      order_id?: string;
      user_id?: string;
      credits?: number;
      amount?: number;
    };
    if (!body.order_id || !body.user_id || !body.credits || !body.amount) {
      return err(400, "BAD_REQUEST", "order_id·user_id·credits·amount 필요");
    }
    const r = settleOrder(getDb(), body.order_id, body.user_id, body.credits, body.amount);
    return ok({ ...r, note: r.granted ? "지급 완료" : "중복 웹훅 — 멱등 무시" });
  } catch (e) {
    return handleError(e);
  }
}
