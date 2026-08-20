// 어드민 콘솔 시드 데이터 — 고도화 기획서 v2.0 §1 기준
// 실서비스: config-as-data (IN-03), 콘솔 저장 즉시 반영

export type VersionStatus =
  | "draft"
  | "review"
  | "approved"
  | "canary"
  | "live"
  | "archived";

export interface VersionMetrics {
  bestCut: number; // 베스트컷 선택률 %
  regen: number; // 재생성률 %
  hiRes: number; // 고해상도 전환율 %
  fail: number; // 실패율 %
  cost: number; // 컷당 원가 ₩
  samples: number; // 표본 잡 수
}

export interface ModelParams {
  engine: string;
  steps: number;
  cfg: number;
  loraWeight: number;
}

export interface PromptVersion {
  id: string; // "v14"
  status: VersionStatus;
  positive: string;
  themeNegative: string;
  params: ModelParams;
  metrics: VersionMetrics | null;
  author: string;
  approver: string | null;
  createdAt: string;
  canaryPct?: number;
}

export const ENGINES = [
  "Flux LoRA fine-tune",
  "InstantID zero-shot",
  "외부 API (Gemini image)",
];

// ── 네거티브 3단 상속 (PC-03) ──────────────────────────
export const GLOBAL_NEGATIVE =
  "deformed hands, extra fingers, fused fingers, distorted face, asymmetric eyes, watermark, text artifacts, low quality, oversharpened, plastic skin";

export const MILESTONE_NEGATIVE: Record<string, string> = {
  "dol-hanbok":
    "adult body proportions, standing unsupported, visible teeth, long hair",
  d100: "adult body proportions, sitting unsupported, visible teeth",
  season: "adult body proportions",
};

// 아동 안전 레이어 (PC-04) — 콘솔에서 편집 불가, 시스템 강제 주입
export const SAFETY_LAYER_PREVIEW =
  "child-safety negative set (32 tokens) — 시스템 강제 주입 · 열람 전용 · 우회 경로 없음";

// 금지 토큰 린터 (PC-04) — positive 저장 시 검사
export const BANNED_TOKENS = [
  "nude",
  "naked",
  "nsfw",
  "lingerie",
  "sexy",
  "undress",
  "sheer",
  "bikini",
  "노출",
  "시스루",
  "비키니",
  "성인",
  "섹시",
  "흡연",
  "celebrity",
  "실존인물",
];

// ── 변수 어휘 사전 (PC-02) ──────────────────────────────
export interface VocabEntry {
  key: string;
  group: string;
  fragment: string;
  usedBy: number; // 사용 테마 수
}

export const VOCAB_SEED: VocabEntry[] = [
  { key: "연분홍", group: "의상", fragment: "pale pink jeogori with saekdong stripe sleeves, fine silk texture", usedBy: 3 },
  { key: "색동", group: "의상", fragment: "vivid saekdong rainbow-striped hanbok, traditional festive pattern", usedBy: 3 },
  { key: "남색", group: "의상", fragment: "deep navy hanbok with gold geumbak stamping", usedBy: 2 },
  { key: "궁궐 마당", group: "배경", fragment: "korean royal palace courtyard, dancheong eaves, late afternoon light", usedBy: 4 },
  { key: "한옥 대청", group: "배경", fragment: "hanok wooden veranda, soft diffused daylight, paper doors", usedBy: 4 },
  { key: "전통 병풍", group: "배경", fragment: "traditional folding screen with minhwa painting, low celebration table", usedBy: 2 },
  { key: "구름 위", group: "배경", fragment: "dreamy cumulus cloudscape, pastel sky, volumetric light", usedBy: 2 },
  { key: "age_style", group: "자동", fragment: "(생일 기반 자동) e.g. 100-day-old infant proportions, supported sitting pose", usedBy: 22 },
];

// ── 프롬프트 버전 시드 (테마별) ─────────────────────────
export const PROMPT_SEED: Record<string, PromptVersion[]> = {
  "dol-hanbok": [
    {
      id: "v12",
      status: "archived",
      positive:
        "portrait of {baby}, wearing {outfit}, {background}, doljanchi celebration, studio lighting, {age_style}",
      themeNegative: "modern clothing, plastic accessories",
      params: { engine: "Flux LoRA fine-tune", steps: 28, cfg: 3.5, loraWeight: 0.9 },
      metrics: { bestCut: 54.1, regen: 24.3, hiRes: 9.8, fail: 2.6, cost: 156, samples: 1840 },
      author: "테마기획-지우",
      approver: "리드-시절",
      createdAt: "2026-07-02",
    },
    {
      id: "v14",
      status: "live",
      positive:
        "full-body portrait of {baby}, {outfit}, seated on silk cushion, {background}, traditional doljanchi first-birthday celebration, soft window light from left, 85mm f/2.0 shallow depth, professional studio photography, {age_style}",
      themeNegative: "modern clothing, plastic accessories, harsh flash shadows",
      params: { engine: "Flux LoRA fine-tune", steps: 32, cfg: 3.0, loraWeight: 0.85 },
      metrics: { bestCut: 61.2, regen: 18.7, hiRes: 12.4, fail: 1.8, cost: 142, samples: 5210 },
      author: "테마기획-지우",
      approver: "리드-시절",
      createdAt: "2026-07-28",
    },
    {
      id: "v15",
      status: "canary",
      canaryPct: 10,
      positive:
        "full-body portrait of {baby}, {outfit}, seated on embroidered silk cushion beside dol table, {background}, traditional doljanchi celebration, golden-hour window light, 85mm f/2.0, film-grade color, joyful open-mouth smile, {age_style}",
      themeNegative: "modern clothing, plastic accessories, harsh flash shadows",
      params: { engine: "Flux LoRA fine-tune", steps: 32, cfg: 2.8, loraWeight: 0.85 },
      metrics: { bestCut: 66.4, regen: 15.2, hiRes: 13.1, fail: 1.9, cost: 145, samples: 132 },
      author: "테마기획-하늘",
      approver: "리드-시절",
      createdAt: "2026-08-17",
    },
  ],
  "b100-traditional": [
    {
      id: "v8",
      status: "archived",
      positive:
        "portrait of {baby} at traditional baek-il table, {outfit}, {background}, rice cakes, studio photo, {age_style}",
      themeNegative: "birthday candles, western cake",
      params: { engine: "Flux LoRA fine-tune", steps: 28, cfg: 3.5, loraWeight: 0.9 },
      metrics: { bestCut: 57.9, regen: 21.0, hiRes: 10.2, fail: 2.2, cost: 149, samples: 3320 },
      author: "테마기획-지우",
      approver: "리드-시절",
      createdAt: "2026-07-10",
    },
    {
      id: "v9",
      status: "live",
      positive:
        "portrait of {baby} seated at traditional baek-il celebration table with baekseolgi and susupatteok, {outfit}, {background}, soft frontal daylight, celebratory yet serene mood, professional studio photography, {age_style}",
      themeNegative: "birthday candles, western cake, balloons",
      params: { engine: "Flux LoRA fine-tune", steps: 30, cfg: 3.2, loraWeight: 0.85 },
      metrics: { bestCut: 63.8, regen: 16.9, hiRes: 12.9, fail: 1.6, cost: 138, samples: 4110 },
      author: "테마기획-하늘",
      approver: "리드-시절",
      createdAt: "2026-08-04",
    },
  ],
  "angel-wings": [
    {
      id: "v6",
      status: "live",
      positive:
        "portrait of {baby} with soft white feathered angel wings, {outfit}, {background}, ethereal backlight halo, pastel tones, dreamy studio photography, {age_style}",
      themeNegative: "dark feathers, gothic elements",
      params: { engine: "InstantID zero-shot", steps: 24, cfg: 4.0, loraWeight: 0 },
      metrics: { bestCut: 59.4, regen: 19.8, hiRes: 8.1, fail: 2.4, cost: 96, samples: 6890 },
      author: "테마기획-지우",
      approver: "리드-시절",
      createdAt: "2026-07-20",
    },
  ],
  "first-snow": [
    {
      id: "v3",
      status: "live",
      positive:
        "portrait of {baby} in warm knitted winter wear, {background}, gentle falling snow bokeh, cold-blue and warm-skin contrast, cinematic winter photography, {age_style}",
      themeNegative: "rain, umbrella, summer clothing",
      params: { engine: "외부 API (Gemini image)", steps: 0, cfg: 0, loraWeight: 0 },
      metrics: { bestCut: 43.1, regen: 31.5, hiRes: 6.2, fail: 3.8, cost: 210, samples: 980 },
      author: "테마기획-하늘",
      approver: "리드-시절",
      createdAt: "2026-08-12",
    },
  ],
};

// ── RBAC (SH-01 · §1.5) ────────────────────────────────
export type AdminRole = "리드" | "운영자" | "모더레이터" | "CS";

export const ROLE_ACTOR: Record<AdminRole, string> = {
  리드: "리드-시절",
  운영자: "운영자-시절",
  모더레이터: "모더레이터-시절",
  CS: "CS-시절",
};

// 역할별 접근 가능 모듈 (경로 prefix) — 없는 모듈은 탭 미렌더 + 직접 접근 403
export const ROLE_ACCESS: Record<AdminRole, string[]> = {
  리드: [
    "/admin", "/admin/prompts", "/admin/themes", "/admin/experiments",
    "/admin/moderation", "/admin/users", "/admin/revenue",
  ],
  운영자: ["/admin", "/admin/prompts", "/admin/themes", "/admin/experiments", "/admin/revenue"],
  모더레이터: ["/admin", "/admin/moderation", "/admin/users"],
  CS: ["/admin", "/admin/moderation", "/admin/users"],
};

// 에디터 변수 밸리데이션 (PB-20)
export const KNOWN_VARS = ["baby", "outfit", "background", "age_style"];

// ── 테마 라이프사이클 상태기계 (TC-01) ──────────────────
export const LIFECYCLE_STAGES = [
  "draft", "내부QA", "soft-launch", "GA", "seasonal-hold", "sunset",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const THEME_STAGE_SEED: Record<string, LifecycleStage> = {
  "dol-hanbok": "GA", "b100-traditional": "GA", "angel-wings": "GA",
  "cake-smash": "GA", "first-snow": "soft-launch", sebae: "내부QA",
  ghibli: "GA", "dream-job": "soft-launch",
};

export const CHECKLIST_ITEMS = [
  "샘플 컷 6종 (동의 모델)",
  "안전 리뷰 통과",
  "가격·크레딧 설정",
  "다국어 카피 (한/영)",
  "커버 루핑 영상 트랜스코딩",
];

// 데모 편의: 일부 테마는 체크리스트 일부 완료 상태로 시작
export const CHECKLIST_SEED: Record<string, boolean[]> = {
  "first-snow": [true, true, true, false, true],
  sebae: [true, true, false, false, true],
  "dream-job": [true, false, true, true, false],
};

// ── 실험 플랫폼 (S12-D) ────────────────────────────────
export interface Experiment {
  id: string;
  kind: "프롬프트" | "가격" | "카피";
  name: string;
  variants: { name: string; traffic: number; metric: number; samples: number }[];
  metricName: string;
  minSamples: number;
  status: "running" | "promoted" | "stopped";
  winner?: string;
}

export const EXPERIMENTS_SEED: Experiment[] = [
  {
    id: "exp-11",
    kind: "프롬프트",
    name: "돌잔치 한복 v14(live) vs v15(canary)",
    variants: [
      { name: "v14", traffic: 90, metric: 61.2, samples: 5210 },
      { name: "v15", traffic: 10, metric: 66.4, samples: 132 },
    ],
    metricName: "베스트컷 선택률 %",
    minSamples: 200,
    status: "running",
  },
  {
    id: "exp-10",
    kind: "가격",
    name: "스튜디오 패키지 ₩19,900 vs ₩17,900 (신규 한정)",
    variants: [
      { name: "₩19,900", traffic: 50, metric: 7.4, samples: 1410 },
      { name: "₩17,900", traffic: 50, metric: 8.1, samples: 1385 },
    ],
    metricName: "무료→유료 전환율 %",
    minSamples: 2000,
    status: "running",
  },
  {
    id: "exp-09",
    kind: "프롬프트",
    name: "백일상 전통 v8 vs v9",
    variants: [
      { name: "v8", traffic: 0, metric: 57.9, samples: 3320 },
      { name: "v9", traffic: 100, metric: 63.8, samples: 4110 },
    ],
    metricName: "베스트컷 선택률 %",
    minSamples: 200,
    status: "promoted",
    winner: "v9",
  },
];

// ── 모더레이션 큐 (S12-E) ──────────────────────────────
export interface ModItem {
  id: string;
  type: "업로드" | "생성물" | "신고";
  target: string;
  reason: string;
  confidence: number; // 필터 확신도 %
  status: "pending" | "approved" | "blocked" | "escalated";
  receivedAt: string;
}

export const MOD_SEED: ModItem[] = [
  { id: "m-501", type: "업로드", target: "user u-3391 · 학습 사진 7장", reason: "연령 추정 회색지대 — 아동 아닌 인물 혼입 가능성", confidence: 62, status: "pending", receivedAt: "14:22" },
  { id: "m-502", type: "생성물", target: "job j-88712 · 여름 바다 10컷", reason: "의상 노출도 분류기 경계값 (수영복 테마 정상 범위 추정)", confidence: 55, status: "pending", receivedAt: "14:05" },
  { id: "m-503", type: "신고", target: "공유 페이지 s-2231", reason: "신고 사유: 타인 아기 사진 도용 의심", confidence: 0, status: "pending", receivedAt: "13:40" },
  { id: "m-504", type: "업로드", target: "user u-2205 · 학습 사진 5장", reason: "저화질 + 동일인 판별 실패", confidence: 88, status: "pending", receivedAt: "13:11" },
];

// ── 사용자·CS (S12-F) ──────────────────────────────────
export interface LedgerEntry {
  ts: string;
  type: "지급" | "차감" | "환불" | "수동조정";
  amount: number;
  reason: string;
}

export interface AdminUser {
  id: string;
  email: string;
  babyName: string;
  plan: string;
  credits: number;
  jobs: number;
  joinedAt: string;
  ledger: LedgerEntry[];
}

export const USERS_SEED: AdminUser[] = [
  {
    id: "u-1024",
    email: "sijeolsajin@gmail.com",
    babyName: "서연이",
    plan: "무료",
    credits: 5,
    jobs: 4,
    joinedAt: "2026-08-20",
    ledger: [
      { ts: "08-20 22:10", type: "지급", amount: 12, reason: "가입 보상" },
      { ts: "08-20 22:31", type: "차감", amount: -9, reason: "백일상 전통 10컷" },
      { ts: "08-20 23:02", type: "지급", amount: 50, reason: "크레딧 팩 구매" },
      { ts: "08-20 23:14", type: "차감", amount: -48, reason: "무빙클립·타임랩스" },
    ],
  },
  {
    id: "u-3391",
    email: "mina.park@example.com",
    babyName: "하율이",
    plan: "멤버십",
    credits: 164,
    jobs: 31,
    joinedAt: "2026-06-11",
    ledger: [
      { ts: "08-01 09:00", type: "지급", amount: 200, reason: "멤버십 월 갱신" },
      { ts: "08-14 20:20", type: "차감", amount: -36, reason: "타임랩스+클립" },
    ],
  },
  {
    id: "u-2205",
    email: "jslee@example.com",
    babyName: "도윤이",
    plan: "패키지",
    credits: 2,
    jobs: 12,
    joinedAt: "2026-07-03",
    ledger: [
      { ts: "07-03 11:00", type: "지급", amount: 12, reason: "가입 보상" },
      { ts: "07-29 18:40", type: "환불", amount: 9, reason: "잡 실패 자동 환불 j-8102" },
    ],
  },
];

// ── 대시보드 (S12-A) ───────────────────────────────────
export interface Alert {
  id: string;
  severity: "crit" | "warn" | "info";
  text: string;
  href?: string;
}

export const ALERTS_SEED: Alert[] = [
  { id: "al-1", severity: "crit", text: "첫눈(first-snow) 베스트컷 선택률 24h -18%p 급락 — 외부 API 벤더 모델 변경 의심 (PC-09 자동 감지)", href: "/admin/prompts/first-snow" },
  { id: "al-2", severity: "warn", text: "영상 생성 원가 일 예산 78% 소진 (17:00 기준) — 소진 시 무료 미리보기 큐 지연 전환" },
  { id: "al-3", severity: "info", text: "시즌 테마 '설날 세배' D-21 — 소프트런치 체크리스트 3/5 완료" },
];

export const DASH = {
  todayJobs: 1204,
  failRate: 2.1,
  queueP50: 41,
  queueP95: 168,
  todayCost: 312000,
  todayRevenue: 1912000,
  conversion: 7.4,
  weeklyJobs: [
    { day: "목", v: 820 },
    { day: "금", v: 1010 },
    { day: "토", v: 1370 },
    { day: "일", v: 1440 },
    { day: "월", v: 940 },
    { day: "화", v: 1180 },
    { day: "수", v: 1204 },
  ],
  simScore: 0.84, // 유사도 평균 (Q-01)
  deleteSlaMin: 38, // 삭제 이행 평균 (분)
  c2paCoverage: 100,
};

// ── 감사로그 ───────────────────────────────────────────
export interface AuditEntry {
  ts: string;
  actor: string;
  action: string;
  target: string;
}

export const AUDIT_SEED: AuditEntry[] = [
  { ts: "08-20 18:42", actor: "시스템", action: "카나리 시작 (10%)", target: "dol-hanbok v15" },
  { ts: "08-20 18:40", actor: "리드-시절", action: "버전 승인 (4-eyes)", target: "dol-hanbok v15" },
  { ts: "08-20 17:15", actor: "테마기획-하늘", action: "draft 저장 · 린트 통과", target: "dol-hanbok v15" },
  { ts: "08-19 11:02", actor: "시스템", action: "자동 승격 (유의성 도달)", target: "b100-traditional v9" },
  { ts: "08-18 15:30", actor: "CS-민서", action: "크레딧 수동 지급 +9 (실패 보상)", target: "u-2205" },
];
