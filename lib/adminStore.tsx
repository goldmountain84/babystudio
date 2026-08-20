"use client";

// 어드민 콘솔 목 스토어 — 고도화 기획서 §1 워크플로를 클라이언트에서 시뮬레이션.
// 실서비스: config-as-data 백엔드(IN-03) + RBAC + 불변 감사로그.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  ALERTS_SEED,
  AUDIT_SEED,
  BANNED_TOKENS,
  CHECKLIST_ITEMS,
  CHECKLIST_SEED,
  EXPERIMENTS_SEED,
  LIFECYCLE_STAGES,
  MOD_SEED,
  PROMPT_SEED,
  ROLE_ACTOR,
  THEME_STAGE_SEED,
  USERS_SEED,
  VOCAB_SEED,
  type AdminRole,
  type AdminUser,
  type Alert,
  type AuditEntry,
  type Experiment,
  type LifecycleStage,
  type ModItem,
  type ModelParams,
  type PromptVersion,
  type VocabEntry,
} from "./adminData";

interface AdminState {
  hydrated: boolean;
  role: AdminRole;
  actor: string;
  prompts: Record<string, PromptVersion[]>;
  vocab: VocabEntry[];
  experiments: Experiment[];
  modQueue: ModItem[];
  users: AdminUser[];
  alerts: Alert[];
  audit: AuditEntry[];
  themeStage: Record<string, LifecycleStage>;
  checklist: Record<string, boolean[]>;
  setRole: (r: AdminRole) => void;
  lint: (text: string) => string[];
  saveDraft: (
    themeId: string,
    data: { positive: string; themeNegative: string; params: ModelParams }
  ) => { ok: boolean; version?: string; violations?: string[] };
  requestReview: (themeId: string, vid: string) => void;
  approve: (
    themeId: string,
    vid: string
  ) => { ok: boolean; reason?: string };
  startCanary: (themeId: string, vid: string) => void;
  simulateCanaryTraffic: (
    themeId: string
  ) => { promoted: boolean; stopped: boolean; samples: number } | null;
  rollbackTo: (
    themeId: string,
    vid: string,
    reason: string
  ) => { ok: boolean; canaryStopped: boolean };
  moderate: (id: string, decision: "approved" | "blocked" | "escalated") => void;
  revealModItem: (id: string) => void;
  adjustCredits: (
    userId: string,
    delta: number,
    reason: string
  ) => { ok: boolean; reason?: string };
  logUserView: (userId: string, reason: string) => void;
  toggleCheck: (themeId: string, idx: number) => void;
  advanceStage: (
    themeId: string
  ) => { ok: boolean; reason?: string; next?: LifecycleStage };
  dismissAlert: (id: string) => void;
}

const Ctx = createContext<AdminState | null>(null);
const LS_KEY = "babystudio-admin-v1";

interface Persisted {
  role: AdminRole;
  prompts: Record<string, PromptVersion[]>;
  vocab: VocabEntry[];
  experiments: Experiment[];
  modQueue: ModItem[];
  users: AdminUser[];
  alerts: Alert[];
  audit: AuditEntry[];
  themeStage: Record<string, LifecycleStage>;
  checklist: Record<string, boolean[]>;
}

const DEFAULT: Persisted = {
  role: "운영자",
  prompts: PROMPT_SEED,
  vocab: VOCAB_SEED,
  experiments: EXPERIMENTS_SEED,
  modQueue: MOD_SEED,
  users: USERS_SEED,
  alerts: ALERTS_SEED,
  audit: AUDIT_SEED,
  themeStage: THEME_STAGE_SEED,
  checklist: CHECKLIST_SEED,
};

function nowLabel(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  // 반환값이 필요한 액션은 업데이터 밖에서 최신 스냅숏으로 검증한다
  // (setState 업데이터의 동기 실행은 보장되지 않음)
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* fresh start */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addAudit = (s: Persisted, actor: string, action: string, target: string): Persisted => ({
    ...s,
    audit: [{ ts: nowLabel(), actor, action, target }, ...s.audit].slice(0, 80),
  });

  const actor = ROLE_ACTOR[state.role];

  const setRole = useCallback((r: AdminRole) => {
    setState((s) =>
      addAudit({ ...s, role: r }, ROLE_ACTOR[r], "역할 전환 (데모)", r)
    );
  }, []);

  const lint = useCallback((text: string): string[] => {
    const lower = text.toLowerCase();
    return BANNED_TOKENS.filter((t) => lower.includes(t.toLowerCase()));
  }, []);

  const saveDraft = useCallback(
    (
      themeId: string,
      data: { positive: string; themeNegative: string; params: ModelParams }
    ) => {
      const violations = lint(data.positive + " " + data.themeNegative);
      if (violations.length > 0) return { ok: false, violations };
      const cur = stateRef.current.prompts[themeId] ?? [];
      const maxN = cur.reduce(
        (m, v) => Math.max(m, parseInt(v.id.slice(1), 10) || 0),
        0
      );
      const version = `v${maxN + 1}`;
      setState((s) => {
        const list = s.prompts[themeId] ?? [];
        const nv: PromptVersion = {
          id: version,
          status: "draft",
          positive: data.positive,
          themeNegative: data.themeNegative,
          params: data.params,
          metrics: null,
          author: ROLE_ACTOR[s.role],
          approver: null,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        return addAudit(
          { ...s, prompts: { ...s.prompts, [themeId]: [...list, nv] } },
          ROLE_ACTOR[s.role],
          "draft 저장 · 린트 통과",
          `${themeId} ${version}`
        );
      });
      return { ok: true, version };
    },
    [lint]
  );

  const setVersionStatus = (
    s: Persisted,
    themeId: string,
    vid: string,
    patch: Partial<PromptVersion>
  ): Persisted => ({
    ...s,
    prompts: {
      ...s.prompts,
      [themeId]: (s.prompts[themeId] ?? []).map((v) =>
        v.id === vid ? { ...v, ...patch } : v
      ),
    },
  });

  const requestReview = useCallback((themeId: string, vid: string) => {
    setState((s) =>
      addAudit(
        setVersionStatus(s, themeId, vid, { status: "review" }),
        ROLE_ACTOR[s.role],
        "승인 요청 (4-eyes 1/2)",
        `${themeId} ${vid}`
      )
    );
  }, []);

  // 4-eyes 강제 (PB-10): 리드 역할만, 작성자 본인은 승인 불가
  const approve = useCallback(
    (themeId: string, vid: string): { ok: boolean; reason?: string } => {
      const s = stateRef.current;
      const me = ROLE_ACTOR[s.role];
      const v = (s.prompts[themeId] ?? []).find((x) => x.id === vid);
      if (!v) return { ok: false, reason: "버전을 찾을 수 없어요" };
      if (s.role !== "리드") {
        setState((prev) =>
          addAudit(prev, me, "승인 시도 거부 — 권한 없음", `${themeId} ${vid}`)
        );
        return { ok: false, reason: "승인 권한 없음 — 리드 역할만 승인할 수 있어요" };
      }
      if (v.author === me) {
        setState((prev) =>
          addAudit(prev, me, "승인 시도 거부 — 작성자 본인", `${themeId} ${vid}`)
        );
        return {
          ok: false,
          reason: "작성자 본인은 승인할 수 없어요 (4-eyes: 작성자 ≠ 승인자)",
        };
      }
      setState((prev) =>
        addAudit(
          setVersionStatus(prev, themeId, vid, { status: "approved", approver: me }),
          me,
          "버전 승인 (4-eyes 2/2)",
          `${themeId} ${vid}`
        )
      );
      return { ok: true };
    },
    []
  );

  const startCanary = useCallback((themeId: string, vid: string) => {
    setState((s) =>
      addAudit(
        setVersionStatus(s, themeId, vid, {
          status: "canary",
          canaryPct: 5,
          metrics: {
            bestCut: 0,
            regen: 0,
            hiRes: 0,
            fail: 0,
            cost: 145,
            samples: 0,
          },
        }),
        "시스템",
        "카나리 시작 (5%)",
        `${themeId} ${vid}`
      )
    );
  }, []);

  // 카나리 트래픽 시뮬레이션 → 표본 누적 → 유의성 도달 시 자동 승격/중단 (PC-06·07)
  const simulateCanaryTraffic = useCallback(
    (themeId: string) => {
      const snap = stateRef.current.prompts[themeId] ?? [];
      if (!snap.some((v) => v.status === "canary")) return null;
      let result: { promoted: boolean; stopped: boolean; samples: number } | null =
        null;
      const compute = (s: Persisted): Persisted => {
        const list = s.prompts[themeId] ?? [];
        const canary = list.find((v) => v.status === "canary");
        const live = list.find((v) => v.status === "live");
        if (!canary || !live || !live.metrics) return s;
        const prev = canary.metrics ?? {
          bestCut: 0, regen: 0, hiRes: 0, fail: 0, cost: 145, samples: 0,
        };
        const add = 50;
        const samples = prev.samples + add;
        // 표본이 쌓일수록 실제 성능으로 수렴 (데모: live 대비 +4~6%p 우세 가정, 노이즈 포함)
        const target = live.metrics.bestCut + 5;
        const noise = (Math.random() - 0.5) * 3;
        const bestCut =
          prev.samples === 0
            ? target + noise
            : (prev.bestCut * prev.samples + (target + noise) * add) / samples;
        const nm = {
          ...prev,
          samples,
          bestCut: Math.round(bestCut * 10) / 10,
          regen: Math.max(10, Math.round((live.metrics.regen - 3 + noise) * 10) / 10),
          hiRes: live.metrics.hiRes + 0.7,
          fail: live.metrics.fail,
        };
        let next = setVersionStatus(s, themeId, canary.id, { metrics: nm });
        next = addAudit(next, "시스템", `카나리 표본 +${add} (누적 ${samples})`, `${themeId} ${canary.id}`);
        if (samples >= 200) {
          if (nm.bestCut > live.metrics.bestCut) {
            next = setVersionStatus(next, themeId, live.id, { status: "archived" });
            next = setVersionStatus(next, themeId, canary.id, {
              status: "live",
              canaryPct: undefined,
            });
            next = addAudit(next, "시스템", "자동 승격 — 유의성 도달·우세 확인", `${themeId} ${canary.id} → live`);
            result = { promoted: true, stopped: false, samples };
          } else {
            next = setVersionStatus(next, themeId, canary.id, { status: "archived" });
            next = addAudit(next, "시스템", "카나리 자동 중단 — 열세", `${themeId} ${canary.id}`);
            result = { promoted: false, stopped: true, samples };
          }
        } else {
          result = { promoted: false, stopped: false, samples };
        }
        return next;
      };
      // 결과값이 필요하므로 스냅숏에서 즉시 계산 후 그 결과로 상태 교체
      const next = compute(stateRef.current);
      setState(next);
      return result;
    },
    []
  );

  // 롤백 (PB-14 · SH-04): 사유 필수, 카나리 진행 중이면 자동 중단
  const rollbackTo = useCallback(
    (themeId: string, vid: string, reason: string) => {
      const s = stateRef.current;
      const me = ROLE_ACTOR[s.role];
      const list = s.prompts[themeId] ?? [];
      const live = list.find((v) => v.status === "live");
      const canary = list.find((v) => v.status === "canary");
      const canaryStopped = Boolean(canary);
      let next = s;
      if (canary) {
        next = setVersionStatus(next, themeId, canary.id, {
          status: "archived",
          canaryPct: undefined,
        });
        next = addAudit(next, "시스템", "카나리 자동 중단 — 롤백 선행 조치", `${themeId} ${canary.id}`);
      }
      if (live) next = setVersionStatus(next, themeId, live.id, { status: "archived" });
      next = setVersionStatus(next, themeId, vid, { status: "live", canaryPct: undefined });
      next = addAudit(next, me, `롤백 실행 (사유: ${reason})`, `${themeId} ${vid} → live`);
      setState(next);
      return { ok: true, canaryStopped };
    },
    []
  );

  const moderate = useCallback(
    (id: string, decision: "approved" | "blocked" | "escalated") => {
      setState((s) =>
        addAudit(
          {
            ...s,
            modQueue: s.modQueue.map((m) =>
              m.id === id ? { ...m, status: decision } : m
            ),
          },
          ROLE_ACTOR[s.role],
          `모더레이션 ${decision === "approved" ? "승인" : decision === "blocked" ? "차단" : "에스컬레이션"}`,
          id
        )
      );
    },
    []
  );

  // 플래그 이미지 블러 해제 = 열람 감사 (DM-02)
  const revealModItem = useCallback((id: string) => {
    setState((s) =>
      addAudit(s, ROLE_ACTOR[s.role], "플래그 이미지 열람 (블러 해제)", id)
    );
  }, []);

  // 크레딧 조정 (DF-03): 사유 필수 + 100C 초과는 리드(4-eyes)만
  const adjustCredits = useCallback(
    (userId: string, delta: number, reason: string): { ok: boolean; reason?: string } => {
      const s = stateRef.current;
      const me = ROLE_ACTOR[s.role];
      if (Math.abs(delta) > 100 && s.role !== "리드") {
        setState((prev) =>
          addAudit(prev, me, `크레딧 조정 거부 — 100C 초과 (${delta})`, userId)
        );
        return {
          ok: false,
          reason: "100C 초과 조정은 4-eyes 승인 필요 — 리드 역할로 실행하세요",
        };
      }
      const user = s.users.find((u) => u.id === userId);
      if (!user) return { ok: false, reason: "사용자를 찾을 수 없어요" };
      if (delta < 0 && user.credits + delta < 0) {
        return { ok: false, reason: "잔액을 초과해 회수할 수 없어요" };
      }
      setState((prev) =>
        addAudit(
          {
            ...prev,
            users: prev.users.map((u) =>
              u.id === userId
                ? {
                    ...u,
                    credits: u.credits + delta,
                    ledger: [
                      { ts: nowLabel(), type: "수동조정" as const, amount: delta, reason },
                      ...u.ledger,
                    ],
                  }
                : u
            ),
          },
          me,
          `크레딧 수동조정 ${delta > 0 ? "+" : ""}${delta} (${reason})`,
          userId
        )
      );
      return { ok: true };
    },
    []
  );

  // 사용자 360 열람 감사 (DF-01) — 개인정보 열람도 로깅
  const logUserView = useCallback((userId: string, reason: string) => {
    setState((s) =>
      addAudit(s, ROLE_ACTOR[s.role], `사용자 정보 열람 (사유: ${reason})`, userId)
    );
  }, []);

  // 테마 상태 전이 게이트 (TC-01)
  const toggleCheck = useCallback((themeId: string, idx: number) => {
    setState((s) => {
      const cur = s.checklist[themeId] ?? CHECKLIST_ITEMS.map(() => false);
      const next = cur.map((v, i) => (i === idx ? !v : v));
      return { ...s, checklist: { ...s.checklist, [themeId]: next } };
    });
  }, []);

  const advanceStage = useCallback(
    (themeId: string): { ok: boolean; reason?: string; next?: LifecycleStage } => {
      const s = stateRef.current;
      const me = ROLE_ACTOR[s.role];
      const cur = s.themeStage[themeId] ?? "draft";
      const idx = LIFECYCLE_STAGES.indexOf(cur);
      if (idx < 0 || idx >= LIFECYCLE_STAGES.length - 1) {
        return { ok: false, reason: "더 전이할 단계가 없어요" };
      }
      const next = LIFECYCLE_STAGES[idx + 1];
      const checks = s.checklist[themeId] ?? CHECKLIST_ITEMS.map(() => false);
      const missing = CHECKLIST_ITEMS.filter((_, i) => !checks[i]);
      if (missing.length > 0) {
        setState((prev) =>
          addAudit(prev, me, `상태 전이 거부 — 체크리스트 ${CHECKLIST_ITEMS.length - missing.length}/${CHECKLIST_ITEMS.length}`, `${themeId} → ${next}`)
        );
        return { ok: false, reason: `체크리스트 미완: ${missing.join(", ")}` };
      }
      if (next === "GA" && s.role !== "리드") {
        setState((prev) =>
          addAudit(prev, me, "상태 전이 거부 — GA는 리드 승인 필요", `${themeId} → GA`)
        );
        return { ok: false, reason: "GA 전이는 리드 승인이 필요해요 — 리드 역할로 실행하세요" };
      }
      setState((prev) =>
        addAudit(
          { ...prev, themeStage: { ...prev.themeStage, [themeId]: next } },
          me,
          `테마 상태 전이 ${cur} → ${next}`,
          themeId
        )
      );
      return { ok: true, next };
    },
    []
  );

  const dismissAlert = useCallback((id: string) => {
    setState((s) => ({ ...s, alerts: s.alerts.filter((a) => a.id !== id) }));
  }, []);

  return (
    <Ctx.Provider
      value={{
        hydrated,
        ...state,
        actor,
        setRole,
        lint,
        saveDraft,
        requestReview,
        approve,
        startCanary,
        simulateCanaryTraffic,
        rollbackTo,
        moderate,
        revealModItem,
        adjustCredits,
        logUserView,
        toggleCheck,
        advanceStage,
        dismissAlert,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAdmin(): AdminState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
