// 실제 사진 업로드 (설계서 §4.1 · O-01)
// 데모 정책: 업로드 원본 = 얼굴 참조 아티팩트로 보관(gpt-image edits의 입력).
// 실서비스: S3 presigned 업로드 + 얼굴 검출·블러·동일인 판별, LoRA 학습 시엔 학습 후 원본 삭제.
// 파기(purge) 시 이 디렉토리 전체가 삭제된다.

import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 10;
export const MAX_SIZE = 20 * 1024 * 1024; // 20MB (O-01)
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

function uploadsRoot(): string {
  return process.env.BABYSTUDIO_UPLOADS ?? path.join(process.cwd(), "data", "uploads");
}

export function uploadDir(babyId: string): string {
  return path.join(uploadsRoot(), babyId);
}

export function validatePhoto(
  type: string,
  size: number
): { ok: true } | { ok: false; reason: string } {
  if (!OK_TYPES.has(type)) return { ok: false, reason: `지원하지 않는 형식 (${type || "unknown"})` };
  if (size > MAX_SIZE) return { ok: false, reason: "20MB 초과" };
  if (size === 0) return { ok: false, reason: "빈 파일" };
  return { ok: true };
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

export function savePhoto(babyId: string, buf: Buffer, type: string): string {
  const dir = uploadDir(babyId);
  mkdirSync(dir, { recursive: true });
  const idx = listPhotos(babyId).length;
  if (idx >= MAX_PHOTOS) throw new Error(`최대 ${MAX_PHOTOS}장까지 업로드할 수 있어요`);
  const file = path.join(dir, `${idx}.${EXT[type] ?? "png"}`);
  writeFileSync(file, buf);
  return file;
}

export function listPhotos(babyId: string): string[] {
  const dir = uploadDir(babyId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(jpg|png|webp|heic)$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

export function photoCount(babyId: string): number {
  return listPhotos(babyId).length;
}

export function removePhotos(babyId: string): number {
  const n = photoCount(babyId);
  rmSync(uploadDir(babyId), { recursive: true, force: true });
  return n;
}
