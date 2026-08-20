// S12-C 테마 라이프사이클 상태기계 테스트 (서버화)

import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "./db";
import { advanceStage, boardState, CmsError, seedThemeCms, toggleCheck } from "./themeCms";

let db: DB;

beforeEach(() => {
  db = createDb(":memory:");
  seedThemeCms(db);
});

describe("테마 상태기계 (TC-01)", () => {
  it("시드: 전 테마 스테이지 + 체크리스트, 재시드 멱등", () => {
    const b = boardState(db);
    expect(Object.keys(b.stages).length).toBeGreaterThanOrEqual(33);
    expect(b.stages["first-snow"]).toBe("soft-launch");
    seedThemeCms(db);
    expect(boardState(db).stages["first-snow"]).toBe("soft-launch"); // 덮어쓰기 없음
  });

  it("체크리스트 미완이면 전이 거부 (게이트)", () => {
    // first-snow 시드: 4/5 (다국어 미완)
    expect(() => advanceStage(db, "first-snow", "리드", "lead-t")).toThrowError(CmsError);
    try {
      advanceStage(db, "first-snow", "리드", "lead-t");
    } catch (e) {
      expect((e as CmsError).message).toContain("다국어");
    }
  });

  it("GA 전이는 리드만 — 완료 후 운영자는 403성 거부, 리드는 성공", () => {
    // 미완 항목 완료
    const checks = boardState(db).checklist["first-snow"];
    checks.forEach((c, i) => {
      if (!c) toggleCheck(db, "first-snow", i);
    });
    expect(() => advanceStage(db, "first-snow", "운영자", "op-t")).toThrow(/리드/);
    const r = advanceStage(db, "first-snow", "리드", "lead-t");
    expect(r.next).toBe("GA");
    expect(boardState(db).stages["first-snow"]).toBe("GA");
    // 감사로그 기록
    const a = db.prepare("SELECT action FROM audit_log ORDER BY id DESC LIMIT 1").get() as { action: string };
    expect(a.action).toContain("soft-launch → GA");
  });
});
