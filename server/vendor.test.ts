// 벤더 어댑터 테스트 — 네트워크 없이 요청 구성·폴백 판정 검증

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  activeVendor,
  buildImageRequest,
  isRealJob,
  jobImagePath,
  realCutLimit,
  realImageCount,
  realImagesReady,
} from "./vendor";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(path.join(tmpdir(), "bs-assets-"));
  vi.stubEnv("BABYSTUDIO_ASSETS", tmp);
});

afterEach(() => vi.unstubAllEnvs());

describe("벤더 선택", () => {
  it("키 없으면 시뮬레이터, 있으면 gpt-image", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(activeVendor()).toBe("simulator");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(activeVendor()).toBe("gpt-image");
  });

  it("실사 컷 상한: 기본 4, env로 조정, 최대 10", () => {
    vi.stubEnv("BABYSTUDIO_REAL_CUTS", "");
    expect(realCutLimit()).toBe(4);
    vi.stubEnv("BABYSTUDIO_REAL_CUTS", "2");
    expect(realCutLimit()).toBe(2);
    vi.stubEnv("BABYSTUDIO_REAL_CUTS", "99");
    expect(realCutLimit()).toBe(10);
  });
});

describe("OpenAI 요청 구성", () => {
  it("1K 프리셋 해상도 매핑 (세로 기본·플랫레이 정방형)", () => {
    const p = buildImageRequest("테스트 프롬프트", "1024x1536", 4);
    expect(p).toEqual({
      model: "gpt-image-1", prompt: "테스트 프롬프트", n: 4, size: "1024x1536", quality: "medium",
    });
    expect(buildImageRequest("x", "1024x1024", 2).size).toBe("1024x1024");
  });
});

describe("실사 파일 판정", () => {
  it("마커·이미지 도착·에러 폴백", () => {
    const jobId = "job-test";
    expect(isRealJob(jobId)).toBe(false);
    const dir = path.join(tmp, jobId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, ".vendor"), "gpt-image");
    expect(isRealJob(jobId)).toBe(true);
    expect(realImagesReady(jobId, 2)).toBe(false); // 아직 미도착
    writeFileSync(jobImagePath(jobId, 0), Buffer.from("png"));
    writeFileSync(jobImagePath(jobId, 1), Buffer.from("png"));
    expect(realImagesReady(jobId, 2)).toBe(true);
    expect(realImageCount(jobId)).toBe(2);
    // 에러 마커 = 폴백 진행 신호
    const jobId2 = "job-err";
    mkdirSync(path.join(tmp, jobId2), { recursive: true });
    writeFileSync(path.join(tmp, jobId2, ".vendor"), "gpt-image");
    writeFileSync(path.join(tmp, jobId2, ".error"), "boom");
    expect(realImagesReady(jobId2, 4)).toBe(true);
    expect(realImageCount(jobId2)).toBe(0);
  });
});
