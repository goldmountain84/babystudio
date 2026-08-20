// 실제 업로드 + 학습 게이트 + 얼굴 유지 경로 테스트

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { createDb, type DB } from "./db";
import { socialLogin, createBaby, trainBaby } from "./auth";
import { isolateFileRoots, seedPhotos } from "./testUtils";
import {
  listPhotos, photoCount, removePhotos, savePhoto, validatePhoto, MIN_PHOTOS,
} from "./uploads";
import { pickEndpoint, buildEditsForm } from "./vendor";
import { purgeUser } from "./purge";
import { uploadDir } from "./uploads";

let db: DB;
let userId: string;
let babyId: string;

beforeEach(() => {
  isolateFileRoots();
  db = createDb(":memory:");
  userId = socialLogin(db, "kakao", "업로드유저").userId;
  babyId = createBaby(db, userId, "서연이", "2026-05-24");
});

describe("업로드 검증 (O-01)", () => {
  it("형식·용량 검증", () => {
    expect(validatePhoto("image/jpeg", 1000).ok).toBe(true);
    expect(validatePhoto("image/heic", 1000).ok).toBe(true);
    expect(validatePhoto("application/pdf", 1000).ok).toBe(false);
    expect(validatePhoto("image/png", 21 * 1024 * 1024).ok).toBe(false);
    expect(validatePhoto("image/png", 0).ok).toBe(false);
  });

  it("저장·목록·삭제", () => {
    savePhoto(babyId, Buffer.from("a"), "image/png");
    savePhoto(babyId, Buffer.from("b"), "image/jpeg");
    expect(photoCount(babyId)).toBe(2);
    expect(listPhotos(babyId)[1]).toMatch(/1\.jpg$/);
    expect(removePhotos(babyId)).toBe(2);
    expect(photoCount(babyId)).toBe(0);
  });
});

describe("학습 게이트 (O-02 실제화)", () => {
  it("참조 3장 미만이면 학습 거부, 충족 시 통과", () => {
    expect(() => trainBaby(db, userId, babyId)).toThrow(/부족/);
    seedPhotos(babyId, MIN_PHOTOS);
    trainBaby(db, userId, babyId);
    const b = db.prepare("SELECT trained FROM baby_profiles WHERE id = ?").get(babyId) as { trained: number };
    expect(b.trained).toBe(1);
  });
});

describe("얼굴 유지 경로", () => {
  it("참조 있으면 edits, 없으면 generations", () => {
    expect(pickEndpoint(0)).toBe("generations");
    expect(pickEndpoint(3)).toBe("edits");
  });

  it("edits 폼: 참조 최대 4장 동봉 + 1K 파라미터", () => {
    seedPhotos(babyId, 6);
    const form = buildEditsForm("프롬프트", "1024x1536", 4, listPhotos(babyId));
    expect(form.get("model")).toBe("gpt-image-1");
    expect(form.get("size")).toBe("1024x1536");
    expect(form.getAll("image[]")).toHaveLength(4); // 6장 중 4장 상한
  });
});

describe("파기 시 참조 사진 파일 삭제 (TR-01 확장)", () => {
  it("purge → 업로드 파일 제거 + 영수증에 장수 기록", () => {
    seedPhotos(babyId, 3);
    trainBaby(db, userId, babyId);
    const receipt = purgeUser(db, userId);
    expect(receipt.items.find((i) => i.label.includes("참조 사진"))?.count).toBe(3);
    expect(existsSync(uploadDir(babyId))).toBe(false);
  });
});
