// 생성 벤더 어댑터 (설계서 PC-08 · IN-06)
// - OPENAI_API_KEY 설정 시: OpenAI gpt-image-1 실사 생성 (프리셋 팩의 'GPT 이미지 (1K)')
// - 미설정 시: 시뮬레이터 폴백 (기존 동작 그대로)
// 실서비스 참고: 얼굴 유지는 업로드 원본과 함께 images/edits 엔드포인트 사용 —
// 데모는 업로드가 목이므로 프리셋 프롬프트 단독 text-to-image로 연동한다.

import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { type DB, audit } from "./db";

export type VendorName = "gpt-image" | "simulator";

export function activeVendor(): VendorName {
  return process.env.OPENAI_API_KEY ? "gpt-image" : "simulator";
}

/** 실사 모드 컷 수 상한 — 실비 보호 (기본 4컷, env로 조정) */
export function realCutLimit(): number {
  const n = Number(process.env.BABYSTUDIO_REAL_CUTS ?? 4);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 4;
}

export const REAL_COST_PER_IMAGE_USD = 0.063; // gpt-image-1 medium · 1024×1536 추정 단가

function assetsRoot(): string {
  return process.env.BABYSTUDIO_ASSETS ?? path.join(process.cwd(), "data", "assets");
}

export function jobImageDir(jobId: string): string {
  return path.join(assetsRoot(), jobId);
}

export function jobImagePath(jobId: string, idx: number): string {
  return path.join(jobImageDir(jobId), `${idx}.png`);
}

/** 실사 잡 여부 — 생성 킥오프 시 만든 마커로 판별 (스키마 무변경) */
export function isRealJob(jobId: string): boolean {
  return existsSync(path.join(jobImageDir(jobId), ".vendor"));
}

export function realImagesReady(jobId: string, count: number): boolean {
  const dir = jobImageDir(jobId);
  if (!existsSync(dir)) return false;
  if (existsSync(path.join(dir, ".error"))) return true; // 실패 확정 → 폴백 진행
  let ok = 0;
  for (let i = 0; i < count; i++) if (existsSync(jobImagePath(jobId, i))) ok++;
  return ok >= count;
}

export function realImageCount(jobId: string): number {
  const dir = jobImageDir(jobId);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(".png")).length;
}

// ── OpenAI 요청 구성 (테스트 가능하도록 순수 함수 분리) ──
export function buildImageRequest(
  prompt: string,
  resolution: string,
  n: number
): { model: string; prompt: string; n: number; size: string; quality: string } {
  // gpt-image-1 지원 사이즈: 1024x1024 · 1024x1536 · 1536x1024
  const size = resolution === "1024x1024" ? "1024x1024" : "1024x1536";
  return { model: "gpt-image-1", prompt, n, size, quality: "medium" };
}

/** 얼굴 유지 경로 결정: 참조 사진이 있으면 images/edits (참조 동봉), 없으면 text-to-image */
export function pickEndpoint(refCount: number): "edits" | "generations" {
  return refCount > 0 ? "edits" : "generations";
}

const REF_MIME: Record<string, string> = {
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic",
};

/** edits용 multipart 폼 — 참조 사진 최대 4장 동봉 (gpt-image-1 다중 입력) */
export function buildEditsForm(
  prompt: string,
  resolution: string,
  n: number,
  refPaths: string[]
): FormData {
  const p = buildImageRequest(prompt, resolution, n);
  const form = new FormData();
  form.append("model", p.model);
  form.append("prompt", p.prompt);
  form.append("n", String(p.n));
  form.append("size", p.size);
  form.append("quality", p.quality);
  for (const ref of refPaths.slice(0, 4)) {
    const ext = path.extname(ref).toLowerCase();
    form.append(
      "image[]",
      new Blob([new Uint8Array(readFileSync(ref))], { type: REF_MIME[ext] ?? "image/png" }),
      path.basename(ref)
    );
  }
  return form;
}

/** 백그라운드 실사 생성 — 잡 접수 직후 킥오프 (실서비스: 워커 큐)
 *  결과는 파일로 적재, 완료 판정은 jobs.tick이 realImagesReady로 수행. */
export function startRealGeneration(
  db: DB,
  jobId: string,
  prompt: string,
  resolution: string,
  count: number,
  refPaths: string[] = [] // 얼굴 참조 사진 — 있으면 images/edits로 얼굴 유지 생성
): void {
  const dir = jobImageDir(jobId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, ".vendor"), "gpt-image");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    writeFileSync(path.join(dir, ".error"), "NO_API_KEY");
    return;
  }
  const started = Date.now();
  const endpoint = pickEndpoint(refPaths.length);
  void (async () => {
    try {
      const res =
        endpoint === "edits"
          ? await fetch("https://api.openai.com/v1/images/edits", {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}` }, // Content-Type은 FormData가 설정
              body: buildEditsForm(prompt, resolution, count, refPaths),
              signal: AbortSignal.timeout(120_000),
            })
          : await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(buildImageRequest(prompt, resolution, count)),
              signal: AbortSignal.timeout(120_000),
            });
      if (!res.ok) {
        const errText = (await res.text()).slice(0, 300);
        throw new Error(`OpenAI ${res.status}: ${errText}`);
      }
      const data = (await res.json()) as { data: { b64_json?: string }[] };
      data.data.forEach((img, i) => {
        if (img.b64_json) {
          writeFileSync(jobImagePath(jobId, i), Buffer.from(img.b64_json, "base64"));
        }
      });
      audit(
        db,
        "시스템",
        `실사 생성 완료 — gpt-image/${endpoint} ${data.data.length}컷` +
          (endpoint === "edits" ? ` (얼굴 참조 ${Math.min(refPaths.length, 4)}장)` : "") +
          `, ${Math.round((Date.now() - started) / 1000)}s`,
        jobId
      );
    } catch (e) {
      writeFileSync(path.join(dir, ".error"), String(e).slice(0, 500));
      audit(
        db,
        "시스템",
        `실사 생성 실패(${endpoint}) → 시뮬레이터 폴백 (${String(e).slice(0, 80)})`,
        jobId
      );
    }
  })();
}
