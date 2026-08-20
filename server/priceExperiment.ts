// BE-4 · 가격 실험 인프라 (DX)
// 가드레일: 신규 사용자 한정(최초 접근 시 배정·불변), 기존 사용자 가격 불변.
// 지표는 purchase 이벤트의 variant 태그에서 집계.

import { type DB } from "./db";

export const PKG_EXPERIMENT = {
  id: "pkg-price-2026-08",
  name: "스튜디오 패키지 가격 (신규 한정)",
  credits: 30,
  variants: [
    { name: "A", price: 19900 },
    { name: "B", price: 17900 },
  ],
} as const;

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function assignPackageVariant(
  db: DB,
  userId: string
): { experiment: string; variant: string; price: number; credits: number } {
  const existing = db
    .prepare("SELECT variant FROM experiment_assignments WHERE user_id = ? AND experiment = ?")
    .get(userId, PKG_EXPERIMENT.id) as { variant: string } | undefined;
  let variant: string;
  if (existing) {
    variant = existing.variant; // 배정 후 불변 — 기존 사용자 가격 불변 원칙
  } else {
    variant = fnv1a(`${userId}:${PKG_EXPERIMENT.id}`) % 100 < 50 ? "A" : "B";
    db.prepare(
      "INSERT INTO experiment_assignments (user_id, experiment, variant, assigned_at) VALUES (?, ?, ?, ?)"
    ).run(userId, PKG_EXPERIMENT.id, variant, Date.now());
  }
  const v = PKG_EXPERIMENT.variants.find((x) => x.name === variant) ?? PKG_EXPERIMENT.variants[0];
  return { experiment: PKG_EXPERIMENT.id, variant, price: v.price, credits: PKG_EXPERIMENT.credits };
}

/** 어드민 집계 — 배정 수·구매 수·전환율 (purchase 이벤트의 variant 태그) */
export function priceExperimentReport(db: DB) {
  return PKG_EXPERIMENT.variants.map((v) => {
    const assigned = (
      db
        .prepare(
          "SELECT COUNT(*) c FROM experiment_assignments WHERE experiment = ? AND variant = ?"
        )
        .get(PKG_EXPERIMENT.id, v.name) as { c: number }
    ).c;
    const purchases = (
      db
        .prepare(
          `SELECT COUNT(*) c FROM events
           WHERE name = 'purchase' AND json_extract(props, '$.variant') = ?
             AND json_extract(props, '$.experiment') = ?`
        )
        .get(v.name, PKG_EXPERIMENT.id) as { c: number }
    ).c;
    return {
      name: `${v.name} · ₩${v.price.toLocaleString()}`,
      price: v.price,
      assigned,
      purchases,
      conversion: assigned > 0 ? Math.round((purchases / assigned) * 1000) / 10 : 0,
    };
  });
}
