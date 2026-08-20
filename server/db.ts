// BE-1 · DB 레이어 — Node 내장 node:sqlite (백엔드 설계서 §3)
// 스키마는 설계서의 PostgreSQL DDL과 1:1 — Postgres 전환 시 이 파일의 DDL만 이관한다.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type DB = DatabaseSync;

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS baby_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  birthday TEXT NOT NULL,
  consent_at INTEGER NOT NULL,          -- 보호자 확인 시각 (법적 증빙, A-02)
  trained INTEGER NOT NULL DEFAULT 0
);

-- 프롬프트 버전: append-only. 상태 전이는 prompts.ts의 상태기계 함수로만.
CREATE TABLE IF NOT EXISTS prompt_versions (
  id TEXT PRIMARY KEY,                  -- "dol-hanbok@v14"
  theme_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','review','approved','canary','live','archived')),
  positive_tpl TEXT NOT NULL,
  theme_negative TEXT NOT NULL,
  model_params TEXT NOT NULL,           -- JSON
  canary_pct INTEGER,
  author TEXT NOT NULL,
  approver TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(theme_id, version_no)
);
-- 테마당 live 정확히 1행 (설계서 §3.1 제약)
CREATE UNIQUE INDEX IF NOT EXISTS one_live_per_theme
  ON prompt_versions(theme_id) WHERE status = 'live';
CREATE UNIQUE INDEX IF NOT EXISTS one_canary_per_theme
  ON prompt_versions(theme_id) WHERE status = 'canary';

-- 크레딧 원장: append-only. balance_after는 ledger.ts가 직전 행 기준으로 검증.
CREATE TABLE IF NOT EXISTS credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grant','hold','refund','manual','expire')),
  ref_type TEXT,
  ref_id TEXT,
  reason TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user ON credit_ledger(user_id, id);

CREATE TABLE IF NOT EXISTS credit_holds (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('held','confirmed','refunded')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE,
  user_id TEXT NOT NULL,
  baby_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('train','image')),
  theme_id TEXT,
  prompt_version_id TEXT,               -- 실험 지표 귀속의 기준 (설계서 §3.1)
  options TEXT NOT NULL,                -- JSON
  assembled_prompt TEXT,                -- 서버 전용 — API 응답에 절대 포함 금지
  status TEXT NOT NULL CHECK (status IN ('queued','running','postprocess','done','failed')),
  error TEXT,
  requested_cuts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id),
  idx INTEGER NOT NULL,
  similarity REAL NOT NULL,
  exposed INTEGER NOT NULL,             -- 품질 게이트(Q-01) 통과 여부
  hi_res INTEGER NOT NULL DEFAULT 0,
  is_best INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- 결제: 지급은 웹훅에서만, order_id 멱등
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  user_id TEXT,
  props TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- BE-3: 영상 클립 (V-01·02) — 사진 잡과 동일한 hold→confirm 과금 모델
CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('clip','timelapse')),
  source_asset_id TEXT,
  source_count INTEGER NOT NULL DEFAULT 1,
  motion TEXT,
  length INTEGER NOT NULL,
  bgm TEXT NOT NULL,
  format TEXT NOT NULL,
  credits INTEGER NOT NULL,
  preview INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('queued','running','done','failed')),
  c2pa_manifest TEXT,
  cost_usd REAL,
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);

-- BE-2 잔여: 버전 지표 (실서비스: events 집계 배치가 채움 — PC-06·09)
CREATE TABLE IF NOT EXISTS version_metrics (
  version_id TEXT PRIMARY KEY,
  best_cut REAL NOT NULL,
  regen REAL NOT NULL,
  hi_res REAL NOT NULL,
  fail REAL NOT NULL,
  cost INTEGER NOT NULL,
  samples INTEGER NOT NULL
);

-- BE-2: 모더레이션 큐 (MD-01·02) — 회색지대만 유입, 결정은 감사로그와 별도 기록
CREATE TABLE IF NOT EXISTS moderation_items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('upload','generation','report')),
  target TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','blocked','escalated')),
  decided_by TEXT,
  decided_at INTEGER,
  created_at INTEGER NOT NULL
);
`;

export function createDb(filePath: string): DB {
  if (filePath !== ":memory:") {
    mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(DDL);
  // 경량 마이그레이션 — 기존 DB 파일에 컬럼 추가 (실서비스: 마이그레이션 도구)
  for (const mig of [
    "ALTER TABLE assets ADD COLUMN c2pa_manifest TEXT",
    "ALTER TABLE jobs ADD COLUMN cost_usd REAL", // BE-3 (IN-06): 잡 단위 원가
  ]) {
    try {
      db.exec(mig);
    } catch {
      /* 이미 존재 */
    }
  }
  return db;
}

// 트랜잭션 헬퍼 — 중첩 호출 안전(SAVEPOINT)
let txDepth = 0;
export function withTx<T>(db: DB, fn: () => T): T {
  const sp = `sp_${txDepth++}`;
  db.exec(txDepth === 1 ? "BEGIN" : `SAVEPOINT ${sp}`);
  try {
    const out = fn();
    db.exec(txDepth === 1 ? "COMMIT" : `RELEASE ${sp}`);
    return out;
  } catch (e) {
    db.exec(txDepth === 1 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
    throw e;
  } finally {
    txDepth--;
  }
}

export function audit(db: DB, actor: string, action: string, target: string) {
  db.prepare(
    "INSERT INTO audit_log (actor, action, target, created_at) VALUES (?, ?, ?, ?)"
  ).run(actor, action, target, Date.now());
}

export function trackEvent(
  db: DB,
  name: string,
  userId: string | null,
  props: Record<string, unknown>
) {
  db.prepare(
    "INSERT INTO events (name, user_id, props, created_at) VALUES (?, ?, ?, ?)"
  ).run(name, userId, JSON.stringify(props), Date.now());
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── 앱 전역 싱글턴 (Next.js dev의 모듈 재로드에도 하나만) ──
declare global {
  // eslint-disable-next-line no-var
  var __babystudioDb: DB | undefined;
}

export function getDb(): DB {
  if (!globalThis.__babystudioDb) {
    const file = process.env.BABYSTUDIO_DB ?? path.join(process.cwd(), "data", "babystudio.db");
    globalThis.__babystudioDb = createDb(file);
    // 프롬프트 버전 시드는 prompts.ts에서 lazy 수행
  }
  return globalThis.__babystudioDb;
}
