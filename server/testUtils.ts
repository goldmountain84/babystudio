// 테스트 공용 유틸 — 업로드/에셋 디렉토리를 임시 경로로 격리

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** 업로드·에셋 루트를 임시 디렉토리로 — 각 테스트 파일 beforeEach에서 호출 */
export function isolateFileRoots(): void {
  process.env.BABYSTUDIO_UPLOADS = mkdtempSync(path.join(tmpdir(), "bs-up-"));
  process.env.BABYSTUDIO_ASSETS = mkdtempSync(path.join(tmpdir(), "bs-as-"));
}

/** 학습 게이트 통과용 참조 사진 3장 시드 */
export function seedPhotos(babyId: string, n = 3): void {
  const dir = path.join(process.env.BABYSTUDIO_UPLOADS!, babyId);
  mkdirSync(dir, { recursive: true });
  for (let i = 0; i < n; i++) {
    writeFileSync(path.join(dir, `${i}.png`), PNG_1PX);
  }
}
