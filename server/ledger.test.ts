// 크레딧 원장 불변식 테스트 (설계서 §6)

import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type DB } from "./db";
import {
  balance,
  confirmHold,
  grant,
  hold,
  LedgerError,
  manualAdjust,
  reconcile,
  refundHold,
  settleOrder,
} from "./ledger";

let db: DB;
const U = "usr_test";

beforeEach(() => {
  db = createDb(":memory:");
});

describe("credit ledger", () => {
  it("grant → balance 반영, balance_after 체인 무결", () => {
    grant(db, U, 12, "signup", U, "가입 보상");
    expect(balance(db, U)).toBe(12);
    expect(reconcile(db, U).ok).toBe(true);
  });

  it("hold는 즉시 차감, confirm은 추가 행 없이 확정", () => {
    grant(db, U, 12, "signup", U, "가입 보상");
    hold(db, U, "job1", 9, "테스트 잡");
    expect(balance(db, U)).toBe(3);
    confirmHold(db, "job1");
    expect(balance(db, U)).toBe(3);
    expect(reconcile(db, U).ok).toBe(true);
  });

  it("refund는 전액 반환", () => {
    grant(db, U, 12, "signup", U, "가입 보상");
    hold(db, U, "job1", 9, "테스트 잡");
    refundHold(db, "job1", "실패 자동 환불");
    expect(balance(db, U)).toBe(12);
    expect(reconcile(db, U).ok).toBe(true);
  });

  it("잔액 초과 hold는 INSUFFICIENT — 원장에 아무 것도 남지 않음", () => {
    grant(db, U, 5, "signup", U, "가입 보상");
    expect(() => hold(db, U, "job1", 9, "테스트")).toThrowError(LedgerError);
    expect(balance(db, U)).toBe(5);
    // hold 행도 롤백되어야 함
    const h = db.prepare("SELECT * FROM credit_holds WHERE job_id='job1'").get();
    expect(h).toBeUndefined();
  });

  it("이중 confirm/refund 차단 (hold 상태기계)", () => {
    grant(db, U, 12, "signup", U, "가입");
    hold(db, U, "job1", 9, "잡");
    confirmHold(db, "job1");
    expect(() => refundHold(db, "job1", "중복")).toThrowError(LedgerError);
    expect(balance(db, U)).toBe(3);
  });

  it("수동 조정: 100C 초과는 리드만", () => {
    grant(db, U, 5, "signup", U, "가입");
    expect(() => manualAdjust(db, U, 150, "이벤트", "CS")).toThrow(/리드/);
    expect(manualAdjust(db, U, 150, "이벤트", "리드")).toBe(155);
  });

  it("결제 웹훅 멱등: 같은 order_id 재수신은 무지급", () => {
    const r1 = settleOrder(db, "ord-1", U, 50, 4900);
    const r2 = settleOrder(db, "ord-1", U, 50, 4900);
    expect(r1.granted).toBe(true);
    expect(r2.granted).toBe(false);
    expect(balance(db, U)).toBe(50);
  });
});
