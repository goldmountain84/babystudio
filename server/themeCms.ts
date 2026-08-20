// S12-C · 테마 라이프사이클 상태기계 서버화 (TC-01)
// 전이 게이트: 체크리스트 5항목 완료 필수, GA 전이는 리드만 (서버 강제)

import { type DB, withTx, audit } from "./db";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_SEED,
  LIFECYCLE_STAGES,
  THEME_STAGE_SEED,
  type LifecycleStage,
} from "@/lib/adminData";
import { THEME_APPS } from "@/lib/data";

export class CmsError extends Error {
  constructor(public code: "GATE" | "FORBIDDEN" | "STATE", message: string) {
    super(message);
  }
}

export function seedThemeCms(db: DB): void {
  const insStage = db.prepare(
    "INSERT OR IGNORE INTO theme_stages (theme_id, stage, updated_at) VALUES (?, ?, ?)"
  );
  const insCheck = db.prepare(
    "INSERT OR IGNORE INTO theme_checklists (theme_id, item_idx, checked) VALUES (?, ?, ?)"
  );
  for (const app of THEME_APPS) {
    insStage.run(app.id, THEME_STAGE_SEED[app.id] ?? "GA", Date.now());
    const seed = CHECKLIST_SEED[app.id];
    CHECKLIST_ITEMS.forEach((_, i) => {
      insCheck.run(app.id, i, seed?.[i] ? 1 : THEME_STAGE_SEED[app.id] ? 0 : 1);
      // GA 시드 테마는 체크리스트 완료 상태로 시작
    });
  }
}

export function boardState(db: DB) {
  seedThemeCms(db);
  const stages = db.prepare("SELECT theme_id, stage FROM theme_stages").all() as {
    theme_id: string;
    stage: string;
  }[];
  const checks = db
    .prepare("SELECT theme_id, item_idx, checked FROM theme_checklists")
    .all() as { theme_id: string; item_idx: number; checked: number }[];
  const checklist: Record<string, boolean[]> = {};
  for (const c of checks) {
    (checklist[c.theme_id] ??= CHECKLIST_ITEMS.map(() => false))[c.item_idx] = Boolean(c.checked);
  }
  return {
    stages: Object.fromEntries(stages.map((s) => [s.theme_id, s.stage])),
    checklist,
    items: CHECKLIST_ITEMS,
    lifecycle: LIFECYCLE_STAGES,
  };
}

export function toggleCheck(db: DB, themeId: string, idx: number): void {
  seedThemeCms(db);
  db.prepare(
    "UPDATE theme_checklists SET checked = 1 - checked WHERE theme_id = ? AND item_idx = ?"
  ).run(themeId, idx);
}

export function advanceStage(
  db: DB,
  themeId: string,
  role: string,
  actor: string
): { next: LifecycleStage } {
  seedThemeCms(db);
  return withTx(db, () => {
    const cur = (
      db.prepare("SELECT stage FROM theme_stages WHERE theme_id = ?").get(themeId) as
        | { stage: LifecycleStage }
        | undefined
    )?.stage;
    if (!cur) throw new CmsError("STATE", "없는 테마");
    const idx = LIFECYCLE_STAGES.indexOf(cur);
    if (idx < 0 || idx >= LIFECYCLE_STAGES.length - 1) {
      throw new CmsError("STATE", "더 전이할 단계가 없어요");
    }
    const next = LIFECYCLE_STAGES[idx + 1];
    const checks = db
      .prepare("SELECT item_idx, checked FROM theme_checklists WHERE theme_id = ?")
      .all(themeId) as { item_idx: number; checked: number }[];
    const missing = CHECKLIST_ITEMS.filter((_, i) => !checks.find((c) => c.item_idx === i)?.checked);
    if (missing.length > 0) {
      audit(db, actor, `상태 전이 거부 — 체크리스트 미완 ${missing.length}건`, `${themeId} → ${next}`);
      throw new CmsError("GATE", `체크리스트 미완: ${missing.join(", ")}`);
    }
    if (next === "GA" && role !== "리드") {
      audit(db, actor, "상태 전이 거부 — GA는 리드 승인 필요", `${themeId} → GA`);
      throw new CmsError("FORBIDDEN", "GA 전이는 리드 승인이 필요해요");
    }
    db.prepare("UPDATE theme_stages SET stage = ?, updated_at = ? WHERE theme_id = ?").run(
      next,
      Date.now(),
      themeId
    );
    audit(db, actor, `테마 상태 전이 ${cur} → ${next}`, themeId);
    return { next };
  });
}
