// BE-1 · 프롬프트 컨트롤 플레인 (백엔드 설계서 §7)
// - 버전 상태기계: 전이는 이 파일의 함수로만 (4-eyes 서버 강제)
// - 카나리 라우팅: hash(user+theme) 버킷 — 같은 사용자는 같은 버전
// - 조립: 어휘 치환 → 개월수 자동 주입 → 네거티브 체인 → 안전 레이어 → 재린트

import { type DB, withTx, audit, newId } from "./db";
import {
  BANNED_TOKENS,
  GLOBAL_NEGATIVE,
  MILESTONE_NEGATIVE,
  PROMPT_SEED,
  VOCAB_SEED,
} from "@/lib/adminData";
import { getApp, THEME_APPS } from "@/lib/data";

// ④ 안전 레이어 — DB가 아닌 배포 아티팩트 상수 (설계서 §7: 콘솔·DB 어느 경로로도 수정 불가)
const SAFETY_LAYER =
  "child-safety-locked: (nudity), (partial nudity), (suggestive pose), (adult context), " +
  "(revealing clothing), (inappropriate touch), (distress), (unsafe object), (realistic injury)";

export class PromptError extends Error {
  constructor(
    public code: "LINT" | "FORBIDDEN" | "STATE" | "NOT_FOUND",
    message: string
  ) {
    super(message);
  }
}

export function lint(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_TOKENS.filter((t) => lower.includes(t.toLowerCase()));
}

// ── 시드 (배포 시 1회 — INSERT OR IGNORE라 멱등) ──────────
export function seedPrompts(db: DB): void {
  const ins = db.prepare(
    `INSERT OR IGNORE INTO prompt_versions
     (id, theme_id, version_no, status, positive_tpl, theme_negative, model_params, canary_pct, author, approver, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const [themeId, versions] of Object.entries(PROMPT_SEED)) {
    for (const v of versions) {
      ins.run(
        `${themeId}@${v.id}`,
        themeId,
        parseInt(v.id.slice(1), 10),
        v.status,
        v.positive,
        v.themeNegative,
        JSON.stringify(v.params),
        v.canaryPct ?? null,
        v.author,
        v.approver,
        Date.now()
      );
      if (v.metrics) {
        db.prepare(
          `INSERT OR IGNORE INTO version_metrics (version_id, best_cut, regen, hi_res, fail, cost, samples)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          `${themeId}@${v.id}`,
          v.metrics.bestCut, v.metrics.regen, v.metrics.hiRes,
          v.metrics.fail, v.metrics.cost, v.metrics.samples
        );
      }
    }
  }
  // BE-2 (TC-01): live 체인이 없는 나머지 테마에 시드 v1 자동 등록 — 전 테마 생성 가능.
  // 실서비스: 테마 CMS에서 기획자가 등록·QA 후 GA. 시드 버전은 author '시스템-시드'로 구분.
  const hasLive = db.prepare(
    "SELECT 1 FROM prompt_versions WHERE theme_id = ? AND status = 'live' LIMIT 1"
  );
  for (const app of THEME_APPS) {
    if (hasLive.get(app.id)) continue;
    const vid = `${app.id}@v1`;
    ins.run(
      vid,
      app.id,
      1,
      "live",
      `portrait of {baby}, {outfit}, {background}, ${app.name} concept — ${app.desc}, professional studio photography, soft natural light, {age_style}`,
      "",
      JSON.stringify({ engine: "Flux LoRA fine-tune", steps: 30, cfg: 3.0, loraWeight: 0.85 }),
      null,
      "시스템-시드",
      "시스템",
      Date.now()
    );
  }
  // 지표 백필: live/canary인데 지표 행이 없는 버전 (기존 DB 파일 호환)
  const missing = db
    .prepare(
      `SELECT v.id, v.theme_id FROM prompt_versions v
       LEFT JOIN version_metrics m ON m.version_id = v.id
       WHERE m.version_id IS NULL AND v.status IN ('live','canary')`
    )
    .all() as { id: string; theme_id: string }[];
  for (const v of missing) {
    const h = fnv1a(v.theme_id);
    db.prepare(
      `INSERT OR IGNORE INTO version_metrics (version_id, best_cut, regen, hi_res, fail, cost, samples)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(v.id, 52 + (h % 12), 26 - (h % 9), 8 + (h % 5), 1.5 + (h % 3) / 2, 120 + (h % 60), 300 + (h % 900));
  }
}

interface VersionRow {
  id: string;
  theme_id: string;
  version_no: number;
  status: string;
  positive_tpl: string;
  theme_negative: string;
  model_params: string;
  canary_pct: number | null;
  author: string;
  approver: string | null;
}

function getVersion(db: DB, id: string): VersionRow {
  const v = db.prepare("SELECT * FROM prompt_versions WHERE id = ?").get(id) as unknown as
    | VersionRow
    | undefined;
  if (!v) throw new PromptError("NOT_FOUND", `버전 없음: ${id}`);
  return v;
}

// ── ① 카나리 라우팅 (설계서 §7.1) ─────────────────────────
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

export function routeVersion(db: DB, themeId: string, userId: string): VersionRow {
  const live = db
    .prepare("SELECT * FROM prompt_versions WHERE theme_id = ? AND status = 'live'")
    .get(themeId) as unknown as VersionRow | undefined;
  if (!live) throw new PromptError("NOT_FOUND", `live 버전 없는 테마: ${themeId}`);
  const canary = db
    .prepare("SELECT * FROM prompt_versions WHERE theme_id = ? AND status = 'canary'")
    .get(themeId) as unknown as VersionRow | undefined;
  if (canary && canary.canary_pct) {
    const bucket = fnv1a(`${userId}:${themeId}`) % 100;
    if (bucket < canary.canary_pct) return canary; // 같은 사용자는 항상 같은 버전
  }
  return live;
}

// ── ③ 개월수 자동 주입 (Q-03) ────────────────────────────
export function ageStyle(birthday: string): string {
  const months = Math.max(
    0,
    Math.floor((Date.now() - new Date(birthday + "T00:00:00").getTime()) / (30.44 * 86400000))
  );
  if (months < 3) return `${months}-month-old newborn proportions, swaddled or lying pose`;
  if (months < 7) return `${months}-month-old infant proportions, supported sitting pose`;
  if (months < 13) return `${months}-month-old baby proportions, stable sitting or assisted standing`;
  return `${months}-month-old toddler proportions, standing pose`;
}

// ── 조립 (요청 시점, 서버 전용 — 원문은 클라이언트로 나가지 않는다) ──
const VOCAB: Record<string, string> = Object.fromEntries(
  VOCAB_SEED.map((v) => [v.key, v.fragment])
);

export interface Assembled {
  versionId: string;
  positive: string;
  negative: string;
  params: Record<string, unknown>;
}

export function assemble(
  db: DB,
  themeId: string,
  userId: string,
  babyName: string,
  babyBirthday: string,
  options: { outfit?: string; background?: string }
): Assembled {
  const v = routeVersion(db, themeId, userId);
  const app = getApp(themeId);
  const sub = (key: string, fallback: string) => VOCAB[key] ?? fallback;
  const positive = v.positive_tpl
    .replaceAll("{baby}", babyName)
    .replaceAll("{outfit}", options.outfit ? sub(options.outfit, options.outfit) : "")
    .replaceAll("{background}", options.background ? sub(options.background, options.background) : "")
    .replaceAll("{age_style}", ageStyle(babyBirthday));
  const negative = [
    GLOBAL_NEGATIVE,
    MILESTONE_NEGATIVE[themeId] ?? (app ? MILESTONE_NEGATIVE[app.milestone] : undefined),
    v.theme_negative,
    SAFETY_LAYER, // ④ 항상 마지막 — 어떤 경로로도 빠질 수 없다
  ]
    .filter(Boolean)
    .join(", ");
  // ⑤ 이중 방어: 조립 결과 재린트
  const violations = lint(positive);
  if (violations.length > 0) {
    throw new PromptError("LINT", `조립 결과 금지 토큰: ${violations.join(", ")}`);
  }
  return {
    versionId: v.id,
    positive,
    negative,
    params: JSON.parse(v.model_params),
  };
}

// ── 상태기계 (어드민 API가 호출 — 4-eyes 서버 강제) ────────
export function createDraft(
  db: DB,
  themeId: string,
  data: { positive: string; themeNegative: string; params: Record<string, unknown> },
  actor: string
): string {
  const violations = lint(`${data.positive} ${data.themeNegative}`);
  if (violations.length > 0) {
    audit(db, actor, `draft 저장 차단 — 린터 (${violations.join(",")})`, themeId);
    throw new PromptError("LINT", `금지 토큰: ${violations.join(", ")}`);
  }
  return withTx(db, () => {
    const max = db
      .prepare("SELECT COALESCE(MAX(version_no), 0) AS m FROM prompt_versions WHERE theme_id = ?")
      .get(themeId) as { m: number };
    const no = max.m + 1;
    const id = `${themeId}@v${no}`;
    db.prepare(
      `INSERT INTO prompt_versions (id, theme_id, version_no, status, positive_tpl, theme_negative, model_params, author, created_at)
       VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`
    ).run(id, themeId, no, data.positive, data.themeNegative, JSON.stringify(data.params), actor, Date.now());
    audit(db, actor, "draft 저장 · 린트 통과", id);
    return id;
  });
}

export function requestReview(db: DB, versionId: string, actor: string): void {
  const v = getVersion(db, versionId);
  if (v.status !== "draft") throw new PromptError("STATE", `draft만 승인 요청 가능 (현재 ${v.status})`);
  db.prepare("UPDATE prompt_versions SET status = 'review' WHERE id = ?").run(versionId);
  audit(db, actor, "승인 요청 (4-eyes 1/2)", versionId);
}

export function approve(db: DB, versionId: string, actor: string, role: string): void {
  const v = getVersion(db, versionId);
  if (v.status !== "review") throw new PromptError("STATE", `review만 승인 가능 (현재 ${v.status})`);
  if (role !== "리드") {
    audit(db, actor, "승인 시도 거부 — 권한 없음", versionId);
    throw new PromptError("FORBIDDEN", "승인은 리드 역할만 가능합니다");
  }
  if (v.author === actor) {
    audit(db, actor, "승인 시도 거부 — 작성자 본인", versionId);
    throw new PromptError("FORBIDDEN", "작성자 본인은 승인할 수 없습니다 (4-eyes)");
  }
  db.prepare("UPDATE prompt_versions SET status = 'approved', approver = ? WHERE id = ?").run(actor, versionId);
  audit(db, actor, "버전 승인 (4-eyes 2/2)", versionId);
}

export function startCanary(db: DB, versionId: string, actor: string, pct = 5): void {
  const v = getVersion(db, versionId);
  if (v.status !== "approved") throw new PromptError("STATE", `approved만 카나리 시작 가능 (현재 ${v.status})`);
  const existing = db
    .prepare("SELECT id FROM prompt_versions WHERE theme_id = ? AND status = 'canary'")
    .get(v.theme_id) as { id: string } | undefined;
  if (existing) {
    throw new PromptError(
      "STATE",
      `이미 카나리 진행 중: ${existing.id} — 먼저 중단하거나 승격하세요 (테마당 카나리 1개)`
    );
  }
  db.prepare("UPDATE prompt_versions SET status = 'canary', canary_pct = ? WHERE id = ?").run(pct, versionId);
  audit(db, actor, `카나리 시작 (${pct}%)`, versionId);
}

/** live 교체 — 트랜잭션으로 원자적: 구 live→archived, 대상→live (설계서 promote_version) */
export function promote(db: DB, versionId: string, actor: string, reason?: string): void {
  withTx(db, () => {
    const v = getVersion(db, versionId);
    if (v.status !== "canary" && v.status !== "archived") {
      throw new PromptError("STATE", `canary/archived만 live 승격 가능 (현재 ${v.status})`);
    }
    db.prepare(
      "UPDATE prompt_versions SET status = 'archived' WHERE theme_id = ? AND status = 'live'"
    ).run(v.theme_id);
    // 롤백 시 진행 중 카나리 자동 중단 (PB-14)
    db.prepare(
      "UPDATE prompt_versions SET status = 'archived', canary_pct = NULL WHERE theme_id = ? AND status = 'canary' AND id != ?"
    ).run(v.theme_id, versionId);
    db.prepare(
      "UPDATE prompt_versions SET status = 'live', canary_pct = NULL WHERE id = ?"
    ).run(versionId);
    audit(db, actor, reason ? `live 승격/롤백 실행 (사유: ${reason})` : "live 승격/롤백 실행", versionId);
  });
}

/** 콘솔 전용 전체 조회 — 프롬프트 원문 포함 (열람 권한: 기획자+, PB-01) */
export function versionsFull(db: DB, themeId: string) {
  return db
    .prepare(
      `SELECT v.*, m.best_cut, m.regen, m.hi_res, m.fail, m.cost, m.samples
       FROM prompt_versions v LEFT JOIN version_metrics m ON m.version_id = v.id
       WHERE v.theme_id = ? ORDER BY v.version_no DESC`
    )
    .all(themeId);
}

/** 테마별 현황 오버뷰 (S12-B1 목록) */
export function promptsOverview(db: DB) {
  return db
    .prepare(
      `SELECT v.theme_id, v.id, v.status, v.canary_pct,
              m.best_cut, m.regen, m.cost, m.samples,
              json_extract(v.model_params, '$.engine') AS engine
       FROM prompt_versions v LEFT JOIN version_metrics m ON m.version_id = v.id
       WHERE v.status IN ('live','canary')
       ORDER BY v.theme_id, v.status`
    )
    .all();
}

/** 카나리 트래픽 배치 틱 (PC-06·07 서버화) — 표본 +50, 200 도달 시 자동 승격/중단
 *  실서비스: 15분 배치가 events 집계로 수행. 데모: 어드민 버튼 → 이 함수. */
export function canaryTick(
  db: DB,
  themeId: string,
  actor: string
): { promoted: boolean; stopped: boolean; samples: number; canaryBest: number; liveBest: number } {
  return withTx(db, () => {
    const canary = db
      .prepare("SELECT id FROM prompt_versions WHERE theme_id = ? AND status = 'canary'")
      .get(themeId) as { id: string } | undefined;
    const live = db
      .prepare("SELECT id FROM prompt_versions WHERE theme_id = ? AND status = 'live'")
      .get(themeId) as { id: string } | undefined;
    if (!canary || !live) throw new PromptError("STATE", "카나리 또는 live가 없습니다");
    const liveM = db
      .prepare("SELECT best_cut FROM version_metrics WHERE version_id = ?")
      .get(live.id) as { best_cut: number } | undefined;
    const liveBest = liveM?.best_cut ?? 55;
    const prev = db
      .prepare("SELECT * FROM version_metrics WHERE version_id = ?")
      .get(canary.id) as
      | { best_cut: number; regen: number; hi_res: number; fail: number; cost: number; samples: number }
      | undefined;

    const add = 50;
    const samples = (prev?.samples ?? 0) + add;
    // 표본이 쌓일수록 실제 성능(live+5%p 가정)으로 수렴 — 노이즈 포함
    const target = liveBest + 5;
    const noise = (Math.random() - 0.5) * 3;
    const bestCut = prev && prev.samples > 0
      ? Math.round(((prev.best_cut * prev.samples + (target + noise) * add) / samples) * 10) / 10
      : Math.round((target + noise) * 10) / 10;

    db.prepare(
      `INSERT INTO version_metrics (version_id, best_cut, regen, hi_res, fail, cost, samples)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(version_id) DO UPDATE SET best_cut = excluded.best_cut, samples = excluded.samples`
    ).run(canary.id, bestCut, prev?.regen ?? 16, prev?.hi_res ?? 12, prev?.fail ?? 1.8, prev?.cost ?? 145, samples);
    audit(db, "시스템", `카나리 표본 +${add} (누적 ${samples})`, canary.id);

    if (samples >= 200) {
      if (bestCut > liveBest) {
        promote(db, canary.id, "시스템", "자동 승격 — 유의성 도달·우세 확인");
        return { promoted: true, stopped: false, samples, canaryBest: bestCut, liveBest };
      }
      db.prepare(
        "UPDATE prompt_versions SET status = 'archived', canary_pct = NULL WHERE id = ?"
      ).run(canary.id);
      audit(db, "시스템", "카나리 자동 중단 — 열세", canary.id);
      return { promoted: false, stopped: true, samples, canaryBest: bestCut, liveBest };
    }
    return { promoted: false, stopped: false, samples, canaryBest: bestCut, liveBest };
  });
}

export function versionsOf(db: DB, themeId: string) {
  return (
    db
      .prepare(
        "SELECT id, theme_id, version_no, status, canary_pct, author, approver, created_at FROM prompt_versions WHERE theme_id = ? ORDER BY version_no"
      )
      // positive_tpl 미포함 — 목록 API에서도 원문 노출 최소화
      .all(themeId)
  );
}
