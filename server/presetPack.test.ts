// GPT·1K 프리셋 팩 = 기본 설정 테스트

import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "./db";
import { assemble, lint, routeVersion, seedPrompts } from "./prompts";
import { PRESET_AUTHOR, PRESET_PACK, GPT_ENGINE, FACE_RULE } from "@/lib/promptPresets";
import { getApp } from "@/lib/data";

let db: DB;

beforeEach(() => {
  db = createDb(":memory:");
  seedPrompts(db);
});

describe("프리셋 팩 시드", () => {
  it("20개 프리셋 전부 대응 테마의 live가 됨 (기존 live는 archived)", () => {
    for (const p of PRESET_PACK) {
      const live = db
        .prepare("SELECT author, positive_tpl FROM prompt_versions WHERE theme_id = ? AND status = 'live'")
        .get(p.themeId) as { author: string; positive_tpl: string };
      expect(live.author).toBe(PRESET_AUTHOR);
      expect(live.positive_tpl).toBe(p.prompt);
    }
    // 교체된 테마의 구 버전은 archived로 남음 (append-only)
    const old = db
      .prepare("SELECT COUNT(*) c FROM prompt_versions WHERE theme_id = 'dol-hanbok' AND status = 'archived'")
      .get() as { c: number };
    expect(old.c).toBeGreaterThan(0);
  });

  it("재시드 멱등 — 팩 버전이 중복 생성되지 않음", () => {
    seedPrompts(db);
    seedPrompts(db);
    const c = db
      .prepare("SELECT COUNT(*) c FROM prompt_versions WHERE author = ?")
      .get(PRESET_AUTHOR) as { c: number };
    expect(c.c).toBe(PRESET_PACK.length);
  });

  it("신규 테마 11종이 카탈로그·라우팅 모두 유효", () => {
    const newIds = ["flower-wreath", "milestone-100", "first-sit", "milk-bath",
      "growth-compare", "bear-knit", "one-balloon", "first-steps",
      "doljabi", "hanbok-closeup", "hanbok-family"];
    for (const id of newIds) {
      expect(getApp(id)).toBeTruthy();
      expect(routeVersion(db, id, "u").status).toBe("live");
    }
  });

  it("파라미터: GPT 단일 모델 + 1K 해상도 (플랫레이만 정방형)", () => {
    for (const p of PRESET_PACK) {
      const v = db
        .prepare("SELECT model_params FROM prompt_versions WHERE theme_id = ? AND status = 'live'")
        .get(p.themeId) as { model_params: string };
      const params = JSON.parse(v.model_params);
      expect(params.engine).toBe(GPT_ENGINE);
      expect(params.quality).toBe("1K");
      expect(params.resolution).toBe(p.aspect === "square" ? "1024x1024" : "1024x1536");
    }
  });

  it("조립: 얼굴 유지 규칙 + 1K 출력 규칙 + 안전 레이어 공존", () => {
    const asm = assemble(db, "milk-bath", "user-x", "서연이", "2026-02-01", {});
    expect(asm.positive).toContain(FACE_RULE);
    expect(asm.positive).toContain("해상도 1K");
    expect(asm.positive).toContain("밀크바스");
    expect(asm.negative).toContain("child-safety-locked");
    expect(lint(asm.positive)).toHaveLength(0); // 전 프리셋 린트 통과
  });
});
