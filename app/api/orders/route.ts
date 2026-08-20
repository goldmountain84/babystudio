// POST /api/orders — 데모 PG 시뮬레이터
// 실서비스: PG 결제창 리다이렉트 → PG가 웹훅 발사. 데모는 이 라우트가 PG 역할을 대신해
// 서명된 웹훅을 실제 웹훅 엔드포인트로 보낸다 — 지급 경로는 웹훅 하나뿐이라는 원칙 유지.

import { NextResponse } from "next/server";
import { requireUser, ok, err } from "@/server/http";
import { signWebhook } from "@/server/auth";
import { newId } from "@/server/db";

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { credits?: number; amount?: number };
  if (!body.credits || !body.amount) return err(400, "BAD_REQUEST", "credits·amount 필요");

  const orderId = newId("ord");
  const payload = JSON.stringify({
    order_id: orderId,
    user_id: auth.userId,
    credits: body.credits,
    amount: body.amount,
  });
  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/webhooks/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-babystudio-signature": signWebhook(payload),
    },
    body: payload,
  });
  if (!res.ok) return err(502, "WEBHOOK_FAILED", "지급 웹훅 처리 실패");
  return ok({ orderId, note: "데모 PG — 서명 웹훅 경유 지급 완료" }, 201);
}
