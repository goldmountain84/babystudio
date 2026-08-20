// BE-1 · 잡 오케스트레이션 + 품질 게이트 (백엔드 설계서 §5)
// 실서비스: Redis 큐 + 워커 플릿. BE-1 데모 런타임: lazy tick —
// 조회 시점에 경과 시간으로 상태를 전이하고, 완료 처리는 멱등 트랜잭션으로 1회만 실행.

import { type DB, withTx, newId, trackEvent } from "./db";
import { hold, confirmHold, refundHold, LedgerError } from "./ledger";
import { assemble, seedPrompts } from "./prompts";
import { flagIfGrayZone } from "./moderation";
import { pushNotification } from "./notifications";
import { isMember } from "./subscriptions";
import {
  activeVendor,
  isRealJob,
  jobImagePath,
  realCutLimit,
  realImageCount,
  realImagesReady,
  REAL_COST_PER_IMAGE_USD,
  startRealGeneration,
} from "./vendor";
import { existsSync } from "node:fs";
import { getApp } from "@/lib/data";

// 시뮬레이션 타이밍 (실서비스: 워커 이벤트)
const T_QUEUED = 1_500;
const T_RUNNING = 8_000;
const T_POST = 11_000; // 이후 done

const OVERGEN_RATIO = 1.4; // Q-01: 내부 1.4배 생성 → 상위 N만 노출
const SIM_THRESHOLD = 0.82;

export class JobError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INSUFFICIENT" | "BAD_REQUEST",
    message: string
  ) {
    super(message);
  }
}

interface JobRow {
  id: string;
  idempotency_key: string | null;
  user_id: string;
  baby_id: string;
  type: string;
  theme_id: string | null;
  prompt_version_id: string | null;
  options: string;
  status: string;
  error: string | null;
  requested_cuts: number;
  created_at: number;
  finished_at: number | null;
}

// 결정적 유사도 시뮬레이션 (잡 id 시드) — 실서비스: face embedding cosine
function simScores(seedStr: string, n: number): number[] {
  let h = 2166136261;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return (h % 1000) / 1000;
  };
  for (let i = 0; i < seedStr.length; i++) h = (h ^ seedStr.charCodeAt(i)) >>> 0;
  return Array.from({ length: n }, () => Math.round((0.74 + rand() * 0.2) * 100) / 100);
}

export function createImageJob(
  db: DB,
  params: {
    userId: string;
    babyId: string;
    themeId: string;
    options: { outfit?: string; background?: string; forceFail?: boolean };
    idempotencyKey?: string;
  }
): { jobId: string; reused: boolean } {
  seedPrompts(db);
  const app = getApp(params.themeId);
  if (!app) throw new JobError("BAD_REQUEST", `없는 테마: ${params.themeId}`);
  // BE-4 (P-02): 멤버십 전용 테마 서버 강제 — 클라이언트 검증은 UX일 뿐
  if (app.memberOnly && !isMember(db, params.userId)) {
    throw new JobError("BAD_REQUEST", "멤버십 전용 테마입니다 — 구독 후 이용할 수 있어요");
  }

  // 멱등: 같은 키 재제출 → 기존 잡 반환 (설계서 §5)
  if (params.idempotencyKey) {
    const existing = db
      .prepare("SELECT id FROM jobs WHERE idempotency_key = ?")
      .get(params.idempotencyKey) as { id: string } | undefined;
    if (existing) return { jobId: existing.id, reused: true };
  }

  const baby = db
    .prepare("SELECT name, birthday, trained FROM baby_profiles WHERE id = ? AND user_id = ?")
    .get(params.babyId, params.userId) as
    | { name: string; birthday: string; trained: number }
    | undefined;
  if (!baby) throw new JobError("BAD_REQUEST", "아기 프로필이 없습니다");
  if (!baby.trained) throw new JobError("BAD_REQUEST", "AI 프로필 학습이 필요합니다");

  const credits = app.credits;
  // 실사 벤더 활성 시 컷 수 상한 적용 — 실비 보호 (vendor.ts)
  const vendor = activeVendor();
  const cuts = vendor === "gpt-image" ? Math.min(app.cuts, realCutLimit()) : app.cuts;
  const jobId = newId("job");

  const result = withTx(db, () => {
    // ① 프롬프트 조립 (버전 라우팅 포함) — 실패 시 과금 전에 중단
    const asm = assemble(db, params.themeId, params.userId, baby.name, baby.birthday, params.options);
    // ② 과금 예약
    try {
      hold(db, params.userId, jobId, credits, `${app.name} ${cuts}컷`);
    } catch (e) {
      if (e instanceof LedgerError && e.code === "INSUFFICIENT") {
        throw new JobError("INSUFFICIENT", e.message);
      }
      throw e;
    }
    // ③ 잡 접수
    db.prepare(
      `INSERT INTO jobs (id, idempotency_key, user_id, baby_id, type, theme_id, prompt_version_id, options, assembled_prompt, status, requested_cuts, created_at)
       VALUES (?, ?, ?, ?, 'image', ?, ?, ?, ?, 'queued', ?, ?)`
    ).run(
      jobId,
      params.idempotencyKey ?? null,
      params.userId,
      params.babyId,
      params.themeId,
      asm.versionId, // 실험 지표 귀속
      JSON.stringify(params.options),
      JSON.stringify(asm), // 서버 전용 — API 응답 금지
      cuts,
      Date.now()
    );
    trackEvent(db, "theme_run", params.userId, {
      theme: params.themeId,
      version: asm.versionId,
      credits,
      vendor,
    });
    return { jobId, reused: false, asm };
  });

  // 실사 벤더: 접수 직후 백그라운드 생성 킥오프 (실서비스: 워커 큐)
  if (vendor === "gpt-image") {
    const p = result.asm.params as { resolution?: string };
    startRealGeneration(
      db,
      jobId,
      // 이미지 API는 네거티브 파라미터가 없어 회피 지시를 본문에 병합
      `${result.asm.positive}\n\n반드시 피할 것: ${result.asm.negative}`,
      p.resolution ?? "1024x1536",
      cuts
    );
  }
  return { jobId: result.jobId, reused: false };
}

/** 상태 전이 tick — 멱등. 완료 트랜잭션은 status 가드로 1회만 실행 */
export function tick(db: DB, jobId: string): JobRow {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as unknown as JobRow | undefined;
  if (!job) throw new JobError("NOT_FOUND", "잡 없음");
  if (job.status === "done" || job.status === "failed") return job;

  const elapsed = Date.now() - job.created_at;
  const opts = JSON.parse(job.options) as { forceFail?: boolean };

  const REAL_TIMEOUT = 150_000; // 실사 생성 대기 상한 — 초과 시 시뮬레이터 폴백 완료

  let next: string = job.status;
  if (elapsed < T_QUEUED) next = "queued";
  else if (elapsed < T_RUNNING) next = "running";
  else if (elapsed < T_POST) next = "postprocess";
  else if (
    isRealJob(jobId) &&
    !realImagesReady(jobId, job.requested_cuts) &&
    elapsed < REAL_TIMEOUT
  ) {
    next = "postprocess"; // 실사 이미지 도착까지 후처리 단계 유지
  } else next = opts.forceFail ? "failed" : "done";

  if (next === job.status) return job;

  if (next === "failed") {
    withTx(db, () => {
      const cur = db.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId) as { status: string };
      if (cur.status === "failed" || cur.status === "done") return;
      db.prepare("UPDATE jobs SET status = 'failed', error = ?, finished_at = ? WHERE id = ?").run(
        "VENDOR_ERROR (simulated)",
        Date.now(),
        jobId
      );
      refundHold(db, jobId, "잡 실패 자동 환불"); // G-03
    });
  } else if (next === "done") {
    withTx(db, () => {
      const cur = db.prepare("SELECT status FROM jobs WHERE id = ?").get(jobId) as { status: string };
      if (cur.status === "done" || cur.status === "failed") return; // 멱등 가드
      // ── 품질 게이트 (Q-01) ──
      // 실사: 도착한 실이미지 수만큼 전부 노출 (과생성은 실비 — 시뮬레이터만 1.4배)
      const realN = isRealJob(jobId) ? realImageCount(jobId) : 0;
      const total = realN > 0 ? realN : Math.ceil(job.requested_cuts * OVERGEN_RATIO);
      const scores = simScores(jobId, total);
      const ranked = scores
        .map((s, i) => ({ s, i }))
        .sort((a, b) => b.s - a.s);
      const exposeCount = realN > 0 ? realN : job.requested_cuts;
      const exposedIdx = new Set(ranked.slice(0, exposeCount).map((r) => r.i));
      const ins = db.prepare(
        `INSERT INTO assets (id, job_id, idx, similarity, exposed, is_best, c2pa_manifest, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const best = ranked[0].i;
      scores.forEach((s, i) => {
        // BE-2 (TR-02): C2PA 매니페스트 스텁 — 실서비스: KMS 서명키로 서명 매니페스트 삽입
        const manifest = `c2pa:urn:babystudio:${jobId.slice(-6)}:${i}`;
        ins.run(newId("ast"), jobId, i, s, exposedIdx.has(i) ? 1 : 0, i === best ? 1 : 0, manifest, Date.now());
      });
      db.prepare("UPDATE jobs SET status = 'done', finished_at = ? WHERE id = ?").run(Date.now(), jobId);
      confirmHold(db, jobId); // 성공 → 확정
      // BE-3 (IN-06): 엔진별 원가 기록 — 벤더 협상·자체 GPU 판단의 데이터
      const asm = JSON.parse(job.options ? (db.prepare("SELECT assembled_prompt FROM jobs WHERE id = ?").get(jobId) as { assembled_prompt: string }).assembled_prompt : "{}") as { params?: { engine?: string } };
      const ENGINE_COST: Record<string, number> = {
        "GPT 이미지 (1K)": 0.07,
        "Flux LoRA fine-tune": 0.08,
        "InstantID zero-shot": 0.05,
        "외부 API (Gemini image)": 0.12,
      };
      const costUsd =
        realN > 0
          ? Math.round(REAL_COST_PER_IMAGE_USD * realN * 100) / 100 // 실사 실비
          : Math.round((ENGINE_COST[asm.params?.engine ?? ""] ?? 0.08) * total * 100) / 100;
      db.prepare("UPDATE jobs SET cost_usd = ? WHERE id = ?").run(costUsd, jobId);
      const gateMin = ranked[job.requested_cuts - 1]?.s ?? 1;
      // BE-2 (MD-02): 게이트 하한 근접 잡은 모더레이션 큐로 자동 플래그
      flagIfGrayZone(db, jobId, getApp(job.theme_id ?? "")?.name ?? job.theme_id ?? "?", gateMin);
      trackEvent(db, "job_done", job.user_id, {
        job: jobId,
        exposed: job.requested_cuts,
        generated: total,
        gate_pass_min: gateMin,
      });
      // BE-4: 생성 완료 알림 (실서비스: 카카오 알림톡 + 웹푸시)
      pushNotification(
        db,
        job.user_id,
        `job-${jobId}`,
        "job_done",
        "화보가 완성됐어요 ✨",
        `${getApp(job.theme_id ?? "")?.name ?? "화보"} ${job.requested_cuts}컷이 준비됐어요`,
        `/album/item/${jobId}`
      );
    });
  } else {
    db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(next, jobId);
  }
  return db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as unknown as JobRow;
}

/** API 응답용 뷰 — assembled_prompt는 절대 포함하지 않는다 */
export function jobView(db: DB, jobId: string) {
  const job = tick(db, jobId);
  const elapsed = Date.now() - job.created_at;
  const pct =
    job.status === "done" || job.status === "failed"
      ? 100
      : Math.min(99, Math.round((elapsed / T_POST) * 100));
  const assets =
    job.status === "done"
      ? (
          db
            .prepare(
              "SELECT id, idx, similarity, hi_res, is_best FROM assets WHERE job_id = ? AND exposed = 1 ORDER BY is_best DESC, similarity DESC"
            )
            .all(jobId) as { id: string; idx: number }[]
        ).map((a) => ({
          ...a,
          has_image: existsSync(jobImagePath(jobId, a.idx)) ? 1 : 0,
        }))
      : [];
  return {
    id: job.id,
    status: job.status,
    pct,
    themeId: job.theme_id,
    promptVersionId: job.prompt_version_id, // 버전 ID는 공개 가능 (원문은 아님)
    error: job.error,
    assets,
  };
}

export function unlockHiRes(db: DB, userId: string, assetId: string): void {
  withTx(db, () => {
    const a = db
      .prepare(
        `SELECT assets.id AS id, assets.hi_res AS hi_res, jobs.user_id AS owner
         FROM assets JOIN jobs ON jobs.id = assets.job_id WHERE assets.id = ?`
      )
      .get(assetId) as { id: string; hi_res: number; owner: string } | undefined;
    if (!a || a.owner !== userId) throw new JobError("NOT_FOUND", "컷 없음");
    if (a.hi_res) return; // 멱등
    const holdId = `hires-${assetId}`;
    hold(db, userId, holdId, 2, "고해상도 해금");
    confirmHold(db, holdId); // 즉시 처리형 과금
    db.prepare("UPDATE assets SET hi_res = 1 WHERE id = ?").run(assetId);
    trackEvent(db, "hires_unlock", userId, { asset: assetId });
  });
}
