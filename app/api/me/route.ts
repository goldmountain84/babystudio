// GET /api/me — 잔액·프로필·원장 요약

import { NextResponse } from "next/server";
import { requireUser, ok } from "@/server/http";
import { balance, ledgerOf, reconcile } from "@/server/ledger";
import { ensureRenewal, getSubscription, isMember } from "@/server/subscriptions";
import { assignPackageVariant } from "@/server/priceExperiment";
import { activeVendor } from "@/server/vendor";

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { db, userId } = auth;
  ensureRenewal(db, userId); // BE-4: lazy 갱신 배치
  const babies = db
    .prepare("SELECT id, name, birthday, trained FROM baby_profiles WHERE user_id = ?")
    .all(userId);
  const sub = getSubscription(db, userId);
  return ok({
    userId,
    credits: balance(db, userId),
    babies,
    ledger: ledgerOf(db, userId, 20),
    ledgerIntegrity: reconcile(db, userId), // 리컨실 축약판 노출 (신뢰 장치)
    membership: sub
      ? { status: sub.status, renewsAt: sub.renews_at, member: isMember(db, userId) }
      : null,
    pricing: assignPackageVariant(db, userId), // BE-4: 가격 실험 배정 (신규 한정·불변)
    vendor: activeVendor(), // 'gpt-image'(실사) | 'simulator'
  });
}
