// BE-1 · 인증 (백엔드 설계서 §9)
// 데모: 소셜 로그인 목 — provider 신뢰. 실서비스: OAuth 코드 교환 후 동일 플로우.

import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { type DB, withTx, newId, trackEvent } from "./db";
import { grant } from "./ledger";

const SIGNUP_GRANT = 12;

export function socialLogin(
  db: DB,
  provider: string,
  externalName: string
): { token: string; userId: string; isNew: boolean } {
  return withTx(db, () => {
    const existing = db
      .prepare("SELECT id FROM users WHERE provider = ? AND name = ?")
      .get(provider, externalName) as { id: string } | undefined;
    let userId: string;
    let isNew = false;
    if (existing) {
      userId = existing.id;
    } else {
      userId = newId("usr");
      isNew = true;
      db.prepare("INSERT INTO users (id, provider, name, created_at) VALUES (?, ?, ?, ?)").run(
        userId,
        provider,
        externalName,
        Date.now()
      );
      grant(db, userId, SIGNUP_GRANT, "signup", userId, "가입 보상");
      trackEvent(db, "signup", userId, { provider });
    }
    const token = randomBytes(24).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(
      token,
      userId,
      Date.now()
    );
    return { token, userId, isNew };
  });
}

export function userFromToken(db: DB, authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const row = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as
    | { user_id: string }
    | undefined;
  return row?.user_id ?? null;
}

export function createBaby(
  db: DB,
  userId: string,
  name: string,
  birthday: string
): string {
  const id = newId("baby");
  db.prepare(
    "INSERT INTO baby_profiles (id, user_id, name, birthday, consent_at, trained) VALUES (?, ?, ?, ?, ?, 0)"
  ).run(id, userId, name, birthday, Date.now());
  return id;
}

/** 학습 잡 (BE-1: 즉시 완료 시뮬레이션 — 실서비스: LoRA 워커 + 원본 삭제) */
export function trainBaby(db: DB, userId: string, babyId: string): void {
  const r = db
    .prepare("UPDATE baby_profiles SET trained = 1 WHERE id = ? AND user_id = ?")
    .run(babyId, userId);
  if (Number(r.changes) === 0) throw new Error("아기 프로필 없음");
  trackEvent(db, "train_done", userId, { baby: babyId });
}

// ── 결제 웹훅 서명 (설계서 §4.1: 웹훅이 유일한 지급 트리거) ──
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET ?? "demo-webhook-secret";

export function signWebhook(rawBody: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
}

export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = signWebhook(rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
