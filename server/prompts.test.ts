// 프롬프트 컨트롤 플레인 테스트 (설계서 §7)

import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "./db";
import {
  approve,
  assemble,
  createDraft,
  promote,
  PromptError,
  requestReview,
  routeVersion,
  seedPrompts,
  startCanary,
} from "./prompts";

let db: DB;

beforeEach(() => {
  db = createDb(":memory:");
  seedPrompts(db);
});

describe("카나리 라우팅", () => {
  it("같은 사용자는 항상 같은 버전 (결정적 버킷)", () => {
    const a = routeVersion(db, "dol-hanbok", "user-A").id;
    for (let i = 0; i < 5; i++) {
      expect(routeVersion(db, "dol-hanbok", "user-A").id).toBe(a);
    }
  });

  it("카나리 10%면 대략 그 비율의 사용자가 카나리로 (±7%p)", () => {
    let canaryCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const v = routeVersion(db, "dol-hanbok", `user-${i}`);
      if (v.status === "canary") canaryCount++;
    }
    expect(canaryCount / N).toBeGreaterThan(0.03);
    expect(canaryCount / N).toBeLessThan(0.17);
  });

  it("live 없는 테마는 라우팅 불가", () => {
    expect(() => routeVersion(db, "no-such-theme", "u")).toThrowError(PromptError);
  });
});

describe("조립", () => {
  it("변수 치환 + 안전 레이어가 항상 포함", () => {
    const asm = assemble(db, "dol-hanbok", "user-A", "서연이", "2025-08-21", {
      outfit: "연분홍",
      background: "궁궐 마당",
    });
    expect(asm.positive).toContain("서연이");
    expect(asm.positive).toContain("pale pink jeogori"); // 어휘 사전 치환
    expect(asm.positive).toContain("month-old"); // age_style 자동 주입
    expect(asm.positive).not.toContain("{outfit}");
    expect(asm.negative).toContain("child-safety-locked"); // 안전 레이어
    expect(asm.negative).toContain("deformed hands"); // 글로벌 네거티브
  });
});

describe("상태기계 + 4-eyes (서버 강제)", () => {
  it("전체 워크플로: draft→review→approve→canary→promote", () => {
    // angel-wings: live만 있고 카나리 없는 테마
    const id = createDraft(
      db,
      "angel-wings",
      { positive: "test {baby} {age_style}", themeNegative: "", params: {} },
      "운영자-시절"
    );
    requestReview(db, id, "운영자-시절");
    approve(db, id, "리드-시절", "리드");
    startCanary(db, id, "리드-시절", 5);
    promote(db, id, "리드-시절");
    const live = db
      .prepare("SELECT id FROM prompt_versions WHERE theme_id='angel-wings' AND status='live'")
      .get() as { id: string };
    expect(live.id).toBe(id);
    // live는 정확히 1행 (partial unique index)
    const count = db
      .prepare("SELECT COUNT(*) AS c FROM prompt_versions WHERE theme_id='angel-wings' AND status='live'")
      .get() as { c: number };
    expect(count.c).toBe(1);
  });

  it("테마당 카나리 1개 — 진행 중이면 새 카나리 거부", () => {
    // dol-hanbok 시드: v15 canary 진행 중
    const id = createDraft(
      db,
      "dol-hanbok",
      { positive: "ok {baby}", themeNegative: "", params: {} },
      "운영자-시절"
    );
    requestReview(db, id, "운영자-시절");
    approve(db, id, "리드-시절", "리드");
    expect(() => startCanary(db, id, "리드-시절")).toThrow(/이미 카나리 진행 중/);
  });

  it("금지 토큰 draft는 저장 자체가 차단", () => {
    expect(() =>
      createDraft(db, "dol-hanbok", { positive: "a sexy pose", themeNegative: "", params: {} }, "운영자")
    ).toThrowError(PromptError);
  });

  it("작성자 본인 승인 차단 (4-eyes)", () => {
    const id = createDraft(
      db,
      "dol-hanbok",
      { positive: "ok {baby}", themeNegative: "", params: {} },
      "리드-시절"
    );
    requestReview(db, id, "리드-시절");
    expect(() => approve(db, id, "리드-시절", "리드")).toThrow(/작성자 본인/);
  });

  it("비리드 승인 차단", () => {
    const id = createDraft(
      db,
      "dol-hanbok",
      { positive: "ok {baby}", themeNegative: "", params: {} },
      "운영자-시절"
    );
    requestReview(db, id, "운영자-시절");
    expect(() => approve(db, id, "다른운영자", "운영자")).toThrow(/리드/);
  });

  it("promote 시 기존 카나리 자동 중단 (PB-14)", () => {
    // dol-hanbok 시드: v14 live, v15 canary → v12(archived)로 롤백하면 v15 카나리 중단
    promote(db, "dol-hanbok@v12", "리드-시절");
    const v15 = db.prepare("SELECT status FROM prompt_versions WHERE id='dol-hanbok@v15'").get() as {
      status: string;
    };
    expect(v15.status).toBe("archived");
    const live = db
      .prepare("SELECT id FROM prompt_versions WHERE theme_id='dol-hanbok' AND status='live'")
      .get() as { id: string };
    expect(live.id).toBe("dol-hanbok@v12");
  });
});
