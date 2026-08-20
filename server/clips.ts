// BE-3 · 영상 워커 (백엔드 설계서 §5 · V-01·02)
// 가격은 서버가 계산(클라이언트 크레딧 값 불신), hold→confirm 과금, lazy tick.
// 실서비스: image-to-video 벤더 큐 + 무료는 480p 워터마크, 결제 시 같은 시드 HD 재렌더.

import { type DB, withTx, newId, trackEvent } from "./db";
import { hold, confirmHold, LedgerError } from "./ledger";
import { JobError } from "./jobs";

export const CLIP_DURATION_MS = 8_000;

// V-01: 프리셋별 원가 차등 — 가격표는 서버 단일 진실
export const CLIP_PRICE: Record<number, number> = { 5: 10, 10: 18, 15: 25 };
export const TIMELAPSE_PRICE = 30;
// 영상 원가 (이미지의 10~30배) — 원가 대시보드 입력값
const CLIP_COST_PER_SEC = 0.12;
const PREVIEW_COST = 0.02;

export interface ClipParams {
  kind: "clip" | "timelapse";
  assetId?: string;
  sourceCount?: number;
  motion?: string;
  length: number;
  bgm: string;
  format: string;
  preview: boolean;
}

export function createClip(
  db: DB,
  userId: string,
  p: ClipParams
): { clipId: string; credits: number } {
  // 가격 서버 계산
  let credits = 0;
  if (p.kind === "timelapse") {
    if ((p.sourceCount ?? 0) < 4) throw new JobError("BAD_REQUEST", "타임랩스는 컷 4장 이상 필요");
    credits = TIMELAPSE_PRICE;
  } else if (!p.preview) {
    credits = CLIP_PRICE[p.length] ?? 0;
    if (!credits) throw new JobError("BAD_REQUEST", `지원하지 않는 길이: ${p.length}초`);
  }

  // 소스 컷 소유권 검증
  let jobId: string | null = null;
  if (p.kind === "clip") {
    if (!p.assetId) throw new JobError("BAD_REQUEST", "소스 컷이 필요합니다");
    const a = db
      .prepare(
        `SELECT assets.job_id AS job_id, jobs.user_id AS owner
         FROM assets JOIN jobs ON jobs.id = assets.job_id WHERE assets.id = ?`
      )
      .get(p.assetId) as { job_id: string; owner: string } | undefined;
    if (!a || a.owner !== userId) throw new JobError("NOT_FOUND", "소스 컷 없음");
    jobId = a.job_id;
  }

  const clipId = newId("clip");
  return withTx(db, () => {
    try {
      hold(db, userId, clipId, credits, p.kind === "timelapse" ? "성장 타임랩스" : `무빙 클립 ${p.length}초`);
    } catch (e) {
      if (e instanceof LedgerError && e.code === "INSUFFICIENT") {
        throw new JobError("INSUFFICIENT", e.message);
      }
      throw e;
    }
    db.prepare(
      `INSERT INTO clips (id, user_id, kind, source_asset_id, source_count, motion, length, bgm, format, credits, preview, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?)`
    ).run(
      clipId, userId, p.kind, p.assetId ?? null, p.sourceCount ?? 1,
      p.motion ?? null, p.preview ? 3 : p.length, p.bgm, p.format,
      credits, p.preview ? 1 : 0, Date.now()
    );
    trackEvent(db, p.kind === "timelapse" ? "timelapse_create" : "video_convert", userId, {
      clip: clipId, jobId, credits, preview: p.preview,
    });
    return { clipId, credits };
  });
}

interface ClipRow {
  id: string; user_id: string; kind: string; source_asset_id: string | null;
  source_count: number; motion: string | null; length: number; bgm: string;
  format: string; credits: number; preview: number; status: string;
  created_at: number; finished_at: number | null;
}

function tickClip(db: DB, c: ClipRow): void {
  if (c.status === "done" || c.status === "failed") return;
  const elapsed = Date.now() - c.created_at;
  let next = c.status;
  if (elapsed < 1_000) next = "queued";
  else if (elapsed < CLIP_DURATION_MS) next = "running";
  else next = "done";
  if (next === c.status) return;
  if (next === "done") {
    withTx(db, () => {
      const cur = db.prepare("SELECT status FROM clips WHERE id = ?").get(c.id) as { status: string };
      if (cur.status === "done" || cur.status === "failed") return; // 멱등 가드
      const cost = c.preview ? PREVIEW_COST : Math.round(c.length * CLIP_COST_PER_SEC * 100) / 100;
      db.prepare(
        "UPDATE clips SET status = 'done', finished_at = ?, c2pa_manifest = ?, cost_usd = ? WHERE id = ?"
      ).run(Date.now(), `c2pa:urn:babystudio:clip:${c.id.slice(-6)}`, cost, c.id);
      confirmHold(db, c.id);
    });
  } else {
    db.prepare("UPDATE clips SET status = ? WHERE id = ?").run(next, c.id);
  }
}

/** 목록 조회 (조회 시점 tick) — 소스 컷의 잡·컷 인덱스 포함 (표시용) */
export function listClips(db: DB, userId: string) {
  const rows = db
    .prepare("SELECT * FROM clips WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .all(userId) as unknown as ClipRow[];
  for (const c of rows) tickClip(db, c);
  return db
    .prepare(
      `SELECT c.id, c.kind, c.motion, c.length, c.bgm, c.format, c.credits,
              c.preview, c.status, c.source_count, c.created_at,
              a.job_id AS job_id, a.idx AS cut_idx
       FROM clips c LEFT JOIN assets a ON a.id = c.source_asset_id
       WHERE c.user_id = ? ORDER BY c.created_at DESC LIMIT 50`
    )
    .all(userId);
}
