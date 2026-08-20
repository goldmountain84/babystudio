"use client";

// 사용자 스토어 — BE-1부터 실제 API 기반 (백엔드 설계서 §12 매핑)
// 크레딧·잡·앨범·프로필의 진실은 서버 원장/DB. 클라이언트에는
// 세션 토큰 + 영상 클립(BE-3 전 목) + 표시용 오버레이(베스트컷 등)만 남는다.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { MilestoneKey } from "./data";

const API = "/api";

export interface BabyProfile {
  id: string;
  name: string;
  birthday: string;
  trained: boolean;
}

export interface Job {
  id: string;
  appId: string;
  status: "running" | "done" | "failed";
  startedAt: number;
  credits: number;
}

export interface AlbumItem {
  id: string; // = jobId
  appId: string;
  createdAt: number;
  cuts: number;
  bestCut: number;
  hiRes: number[];
  videos: number[];
  watermarked: boolean;
  assetIds: string[];
  similarities: number[];
  imageUrls: (string | null)[]; // 실사 생성분만 URL (시뮬레이터 컷은 null → 그라디언트)
}

// S08 영상 스튜디오 — BE-3부터 서버 워커 (clips 테이블, 가격 서버 계산)
export interface Clip {
  id: string;
  kind: "clip" | "timelapse";
  itemId: string | null; // 소스 컷의 잡(=앨범 아이템) id
  cutIdx: number | null;
  sourceCount: number;
  motion: string | null;
  length: number;
  bgm: string;
  format: string;
  credits: number;
  preview: boolean;
  status: "queued" | "running" | "done" | "failed";
  createdAt: number;
}

export interface ClipRequest {
  kind: "clip" | "timelapse";
  assetId?: string;
  sourceCount?: number;
  motion?: string;
  length: number;
  bgm: string;
  format: string;
  preview: boolean;
}

export interface PurgeReceipt {
  rootHash: string;
  purgedAt: string;
  items: { label: string; count: number }[];
}

export interface JobServerView {
  id: string;
  status: string;
  pct: number;
  themeId: string | null;
  promptVersionId: string | null;
  error: string | null;
  assets: { id: string; idx: number; similarity: number; hi_res: number; is_best: number; has_image?: number }[];
}

interface StoreState {
  hydrated: boolean;
  loggedIn: boolean;
  baby: BabyProfile | null;
  credits: number;
  freeCutsLeft: number;
  jobs: Job[];
  album: AlbumItem[];
  clips: Clip[];
  login: () => Promise<boolean>;
  logout: () => void;
  registerBaby: (name: string, birthday: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  startJob: (
    appId: string,
    opts: { outfit?: string; background?: string; credits: number }
  ) => Promise<{ ok: boolean; jobId?: string; error?: string }>;
  getJob: (jobId: string) => Promise<JobServerView | null>;
  finishJob: (jobId: string) => void;
  unlockHiRes: (itemId: string, cut: number) => Promise<boolean>;
  addCredits: (credits: number, amountKrw: number) => Promise<boolean>;
  spendCredits: (amount: number, reason: string) => Promise<{ ok: boolean; error?: string }>;
  vendor: "gpt-image" | "simulator";
  member: boolean;
  membership: Me["membership"];
  packagePrice: number;
  packageCredits: number;
  notifications: Notification[];
  unreadCount: number;
  markNotificationRead: (id?: number) => Promise<void>;
  subscribeMembership: () => Promise<{ ok: boolean; error?: string }>;
  cancelMembership: () => Promise<{ ok: boolean; error?: string }>;
  buyPackage: () => Promise<boolean>;
  setBestCut: (itemId: string, cut: number) => void;
  createClip: (
    params: ClipRequest
  ) => Promise<{ ok: boolean; error?: string }>;
  refreshClips: () => Promise<void>;
  purge: () => Promise<PurgeReceipt | null>;
  resetAll: () => void;
}

const StoreContext = createContext<StoreState | null>(null);

const LS_KEY = "babystudio-client-v2";
const LS_IDENTITY = "babystudio-identity";

interface Persisted {
  token: string | null;
  freeCutsLeft: number;
  activeJobs: Job[];
  bestOverride: Record<string, number>;
}

const DEFAULT: Persisted = {
  token: null,
  freeCutsLeft: 3,
  activeJobs: [],
  bestOverride: {},
};

interface Me {
  userId: string;
  credits: number;
  babies: { id: string; name: string; birthday: string; trained: number }[];
  membership: { status: "active" | "cancelled"; renewsAt: number; member: boolean } | null;
  pricing: { experiment: string; variant: string; price: number; credits: number };
  vendor: "gpt-image" | "simulator";
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: number;
  created_at: number;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [local, setLocal] = useState<Persisted>(DEFAULT);
  const [me, setMe] = useState<Me | null>(null);
  const [albumRaw, setAlbumRaw] = useState<
    { id: string; themeId: string; createdAt: number; assets: JobServerView["assets"] }[]
  >([]);
  const [hydrated, setHydrated] = useState(false);
  const localRef = useRef(local);
  localRef.current = local;

  const api = useCallback(
    async (path: string, init?: RequestInit & { token?: string | null }) => {
      const token = init?.token ?? localRef.current.token;
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers ?? {}),
        },
      });
      const body = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body };
    },
    []
  );

  const mapClip = (c: Record<string, unknown>): Clip => ({
    id: c.id as string,
    kind: c.kind as Clip["kind"],
    itemId: (c.job_id as string | null) ?? null,
    cutIdx: (c.cut_idx as number | null) ?? null,
    sourceCount: c.source_count as number,
    motion: (c.motion as string | null) ?? null,
    length: c.length as number,
    bgm: c.bgm as string,
    format: c.format as string,
    credits: c.credits as number,
    preview: Boolean(c.preview),
    status: c.status as Clip["status"],
    createdAt: c.created_at as number,
  });

  const [clips, setClips] = useState<Clip[]>([]);

  const refreshClips = useCallback(async () => {
    if (!localRef.current.token) return;
    const r = await api("/clips");
    if (r.ok) setClips((r.body as { clips: Record<string, unknown>[] }).clips.map(mapClip));
  }, [api]);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    if (!localRef.current.token) return;
    const [meRes, albumRes, clipRes, notiRes] = await Promise.all([
      api("/me"),
      api("/albums"),
      api("/clips"),
      api("/notifications"),
    ]);
    if (meRes.status === 401) {
      // 세션 만료 → 로그아웃 상태로
      setLocal((s) => ({ ...s, token: null }));
      setMe(null);
      setAlbumRaw([]);
      setClips([]);
      setNotifications([]);
      return;
    }
    if (meRes.ok) setMe(meRes.body as Me);
    if (albumRes.ok) setAlbumRaw((albumRes.body as { items: typeof albumRaw }).items);
    if (clipRes.ok) setClips((clipRes.body as { clips: Record<string, unknown>[] }).clips.map(mapClip));
    if (notiRes.ok) setNotifications((notiRes.body as { notifications: Notification[] }).notifications);
  }, [api]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setLocal({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      /* fresh */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LS_KEY, JSON.stringify(local));
  }, [local, hydrated]);

  // 토큰 복원 시 서버 상태 로드
  useEffect(() => {
    if (hydrated && local.token) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, local.token]);

  const login = useCallback(async (): Promise<boolean> => {
    // 브라우저별 데모 아이덴티티 — resetAll(파기) 후에는 새 계정으로
    let identity = localStorage.getItem(LS_IDENTITY);
    if (!identity) {
      identity = `demo-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(LS_IDENTITY, identity);
    }
    const r = await api("/auth/kakao", {
      method: "POST",
      body: JSON.stringify({ name: identity, guardian: true }),
      token: null,
    });
    if (!r.ok) return false;
    const token = (r.body as { token: string }).token;
    setLocal((s) => ({ ...s, token }));
    return true;
  }, [api]);

  const logout = useCallback(() => {
    setLocal((s) => ({ ...s, token: null, activeJobs: [] }));
    setMe(null);
    setAlbumRaw([]);
    setClips([]);
  }, []);

  const registerBaby = useCallback(
    async (name: string, birthday: string): Promise<boolean> => {
      const created = await api("/babies", {
        method: "POST",
        body: JSON.stringify({ name, birthday }),
      });
      if (!created.ok) return false;
      const babyId = (created.body as { babyId: string }).babyId;
      const trained = await api(`/babies/${babyId}/train`, { method: "POST" });
      if (!trained.ok) return false;
      await refresh();
      return true;
    },
    [api, refresh]
  );

  const startJob = useCallback(
    async (
      appId: string,
      opts: { outfit?: string; background?: string; credits: number }
    ): Promise<{ ok: boolean; jobId?: string; error?: string }> => {
      const babyId = me?.babies[0]?.id;
      if (!babyId) return { ok: false, error: "아기 프로필이 필요해요" };
      const r = await api("/jobs", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          babyId,
          themeId: appId,
          options: { outfit: opts.outfit, background: opts.background },
        }),
      });
      if (!r.ok) {
        return { ok: false, error: (r.body as { message?: string }).message ?? "생성 실패" };
      }
      const jobId = (r.body as { jobId: string }).jobId;
      setLocal((s) => ({
        ...s,
        freeCutsLeft: opts.credits === 0 ? Math.max(0, s.freeCutsLeft - 1) : s.freeCutsLeft,
        activeJobs: [
          ...s.activeJobs.filter((j) => j.id !== jobId),
          { id: jobId, appId, status: "running" as const, startedAt: Date.now(), credits: opts.credits },
        ],
      }));
      void refresh(); // hold 반영된 잔액
      return { ok: true, jobId };
    },
    [api, me, refresh]
  );

  const getJob = useCallback(
    async (jobId: string): Promise<JobServerView | null> => {
      const r = await api(`/jobs/${jobId}`);
      return r.ok ? (r.body as JobServerView) : null;
    },
    [api]
  );

  const finishJob = useCallback(
    (jobId: string) => {
      setLocal((s) => ({ ...s, activeJobs: s.activeJobs.filter((j) => j.id !== jobId) }));
      void refresh();
    },
    [refresh]
  );

  const unlockHiRes = useCallback(
    async (itemId: string, cut: number): Promise<boolean> => {
      const item = albumRaw.find((i) => i.id === itemId);
      const assetId = item?.assets[cut]?.id;
      if (!assetId) return false;
      const r = await api(`/assets/${assetId}/hires`, { method: "POST" });
      if (r.ok) await refresh();
      return r.ok;
    },
    [api, albumRaw, refresh]
  );

  const addCredits = useCallback(
    async (credits: number, amountKrw: number): Promise<boolean> => {
      const r = await api("/orders", {
        method: "POST",
        body: JSON.stringify({ credits, amount: amountKrw }),
      });
      if (r.ok) await refresh();
      return r.ok;
    },
    [api, refresh]
  );

  const spendCredits = useCallback(
    async (amount: number, reason: string): Promise<{ ok: boolean; error?: string }> => {
      if (amount === 0) return { ok: true };
      const r = await api("/credits/spend", {
        method: "POST",
        body: JSON.stringify({ amount, reason }),
      });
      if (r.ok) await refresh();
      return r.ok
        ? { ok: true }
        : { ok: false, error: (r.body as { message?: string }).message ?? "차감 실패" };
    },
    [api, refresh]
  );

  const setBestCut = useCallback((itemId: string, cut: number) => {
    setLocal((s) => ({ ...s, bestOverride: { ...s.bestOverride, [itemId]: cut } }));
  }, []);

  // BE-3: 서버 영상 워커 — 가격·hold·완료 판정 전부 서버 (POST /api/clips)
  const createClip = useCallback(
    async (params: ClipRequest): Promise<{ ok: boolean; error?: string }> => {
      const r = await api("/clips", { method: "POST", body: JSON.stringify(params) });
      if (r.ok) {
        await refresh();
        return { ok: true };
      }
      return { ok: false, error: (r.body as { message?: string }).message ?? "생성 실패" };
    },
    [api, refresh]
  );

  const resetAll = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_IDENTITY);
    setLocal(DEFAULT);
    setMe(null);
    setAlbumRaw([]);
    setClips([]);
  }, []);

  // ── BE-4: 멤버십·알림·패키지 ─────────────────────────
  const markNotificationRead = useCallback(
    async (id?: number) => {
      await api("/notifications/read", { method: "POST", body: JSON.stringify({ id }) });
      setNotifications((n) =>
        n.map((x) => (id == null || x.id === id ? { ...x, read: 1 } : x))
      );
    },
    [api]
  );

  const subscribeMembership = useCallback(async () => {
    const r = await api("/subscriptions", { method: "POST" });
    if (r.ok) await refresh();
    return r.ok
      ? { ok: true }
      : { ok: false, error: (r.body as { message?: string }).message ?? "구독 실패" };
  }, [api, refresh]);

  const cancelMembership = useCallback(async () => {
    const r = await api("/subscriptions/cancel", { method: "POST" });
    if (r.ok) await refresh();
    return r.ok
      ? { ok: true }
      : { ok: false, error: (r.body as { message?: string }).message ?? "해지 실패" };
  }, [api, refresh]);

  // 패키지 구매 — 가격·크레딧은 서버 실험 배정이 확정
  const buyPackage = useCallback(async () => {
    const r = await api("/orders", {
      method: "POST",
      body: JSON.stringify({ context: "package" }),
    });
    if (r.ok) await refresh();
    return r.ok;
  }, [api, refresh]);

  // BE-2 (TR-01): 서버 파기 파이프라인 + 해시 영수증 → 로컬 아이덴티티 폐기
  const purge = useCallback(async (): Promise<PurgeReceipt | null> => {
    const r = await api("/me/purge", { method: "POST" });
    const receipt = r.ok
      ? ((r.body as { receipt: PurgeReceipt }).receipt ?? null)
      : null;
    resetAll();
    return receipt;
  }, [api, resetAll]);

  // ── 파생 뷰 ──────────────────────────────────────────
  const babyRow = me?.babies[0];
  const baby: BabyProfile | null = babyRow
    ? { id: babyRow.id, name: babyRow.name, birthday: babyRow.birthday, trained: !!babyRow.trained }
    : null;

  // 영상 변환 표시: 완료된 유료 클립의 소스 컷 (서버 clips에서 파생)
  const videoMarks = new Map<string, number[]>();
  for (const c of clips) {
    if (c.kind === "clip" && !c.preview && c.status === "done" && c.itemId != null && c.cutIdx != null) {
      videoMarks.set(c.itemId, [...new Set([...(videoMarks.get(c.itemId) ?? []), c.cutIdx])]);
    }
  }

  const album: AlbumItem[] = albumRaw.map((i) => {
    const serverBest = i.assets.findIndex((a) => a.is_best === 1);
    // 서버 assets는 유사도 정렬 — cutIdx(원본 idx)를 뷰 인덱스로 변환
    const idxToView = new Map(i.assets.map((a, viewIdx) => [a.idx, viewIdx]));
    const videos = (videoMarks.get(i.id) ?? [])
      .map((originalIdx) => idxToView.get(originalIdx))
      .filter((x): x is number => x !== undefined);
    return {
      id: i.id,
      appId: i.themeId,
      createdAt: i.createdAt,
      cuts: i.assets.length,
      bestCut: local.bestOverride[i.id] ?? (serverBest >= 0 ? serverBest : 0),
      hiRes: i.assets.map((a, idx) => (a.hi_res ? idx : -1)).filter((x) => x >= 0),
      videos,
      watermarked: true,
      assetIds: i.assets.map((a) => a.id),
      similarities: i.assets.map((a) => a.similarity),
      imageUrls: i.assets.map((a) =>
        a.has_image && local.token
          ? `/api/assets/${a.id}/image?token=${local.token}`
          : null
      ),
    };
  });

  return (
    <StoreContext.Provider
      value={{
        hydrated,
        loggedIn: Boolean(local.token),
        baby,
        credits: me?.credits ?? 0,
        freeCutsLeft: local.freeCutsLeft,
        jobs: local.activeJobs,
        album,
        clips,
        vendor: me?.vendor ?? "simulator",
        member: me?.membership?.member ?? false,
        membership: me?.membership ?? null,
        packagePrice: me?.pricing?.price ?? 19900,
        packageCredits: me?.pricing?.credits ?? 30,
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        markNotificationRead,
        subscribeMembership,
        cancelMembership,
        buyPackage,
        login,
        logout,
        registerBaby,
        refresh,
        startJob,
        getJob,
        finishJob,
        unlockHiRes,
        addCredits,
        spendCredits,
        setBestCut,
        createClip,
        refreshClips,
        purge,
        resetAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ── D-day 유틸 (변경 없음) ──────────────────────────────
export interface DdayInfo {
  label: string;
  dday: number;
  milestone: MilestoneKey;
}

export function nextMilestone(birthday: string): DdayInfo | null {
  const birth = new Date(birthday + "T00:00:00");
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - birth.getTime()) / 86400000);
  const targets: { at: number; label: string; milestone: MilestoneKey }[] = [
    { at: 50, label: "50일", milestone: "d50" },
    { at: 100, label: "백일", milestone: "d100" },
    { at: 200, label: "200일", milestone: "d200" },
    { at: 365, label: "첫돌", milestone: "dol-hanbok" },
  ];
  for (const t of targets) {
    if (days <= t.at) {
      return { label: t.label, dday: t.at - days, milestone: t.milestone };
    }
  }
  return null;
}

export function currentMilestone(birthday: string | undefined): MilestoneKey {
  if (!birthday) return "d100";
  return nextMilestone(birthday)?.milestone ?? "season";
}
