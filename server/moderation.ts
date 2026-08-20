// BE-2 · 모더레이션 서버 (백엔드 설계서 §8 MD-01·02)
// 3중 필터의 회색지대만 큐 유입. 결정은 decided_by 기록 + 감사로그.

import { type DB, audit, newId } from "./db";

export type ModDecision = "approved" | "blocked" | "escalated";

// 데모 시드 — 실서비스: 업로드/생성 필터가 실시간 유입
const MOD_SEED: [string, "upload" | "generation" | "report", string, string, number][] = [
  ["m-501", "upload", "user u-3391 · 학습 사진 7장", "연령 추정 회색지대 — 아동 아닌 인물 혼입 가능성", 62],
  ["m-502", "generation", "job j-88712 · 여름 바다 10컷", "의상 노출도 분류기 경계값 (수영복 테마 정상 범위 추정)", 55],
  ["m-503", "report", "공유 페이지 s-2231", "신고 사유: 타인 아기 사진 도용 의심", 0],
];

export function seedModeration(db: DB): void {
  const ins = db.prepare(
    `INSERT OR IGNORE INTO moderation_items (id, type, target, reason, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  for (const [id, type, target, reason, conf] of MOD_SEED) {
    ins.run(id, type, target, reason, conf, Date.now());
  }
}

/** 잡 완료 시 자동 플래그 — 품질 게이트 하한 근접(유사도 회색지대)은 사람 검수 (MD-02) */
export const FLAG_THRESHOLD = 0.78;

export function flagIfGrayZone(
  db: DB,
  jobId: string,
  themeName: string,
  minExposedSimilarity: number
): boolean {
  if (minExposedSimilarity >= FLAG_THRESHOLD) return false;
  db.prepare(
    `INSERT INTO moderation_items (id, type, target, reason, confidence, created_at)
     VALUES (?, 'generation', ?, ?, ?, ?)`
  ).run(
    newId("mod"),
    `job ${jobId} · ${themeName}`,
    `품질 게이트 하한 근접 — 노출 컷 최저 유사도 ${minExposedSimilarity.toFixed(2)} (기준 ${FLAG_THRESHOLD}) · 얼굴 왜곡 가능성 검수`,
    Math.round((FLAG_THRESHOLD - minExposedSimilarity) * 500 + 50),
    Date.now()
  );
  return true;
}

export function listModeration(db: DB) {
  return db
    .prepare("SELECT * FROM moderation_items ORDER BY (status = 'pending') DESC, created_at DESC LIMIT 100")
    .all();
}

export function decideModeration(
  db: DB,
  id: string,
  decision: ModDecision,
  actor: string
): boolean {
  const r = db
    .prepare(
      "UPDATE moderation_items SET status = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'"
    )
    .run(decision, actor, Date.now(), id);
  if (Number(r.changes) === 0) return false; // 없거나 이미 결정됨 (멱등)
  audit(db, actor, `모더레이션 ${decision}`, id);
  return true;
}
