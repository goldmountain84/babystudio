// 테마 '앱' 카탈로그 — 기획서 4.3 마일스톤 기반 분류 × 컨셉
// 실서비스에서는 관리자 CMS(S12)에서 관리되는 데이터

export type MilestoneKey =
  | "d50"
  | "d100"
  | "d200"
  | "dol"
  | "dol-hanbok"
  | "season";

export interface Milestone {
  key: MilestoneKey;
  emoji: string;
  label: string;
}

export const MILESTONES: Milestone[] = [
  { key: "d50", emoji: "🍼", label: "50일" },
  { key: "d100", emoji: "🎂", label: "100일" },
  { key: "d200", emoji: "🌈", label: "200일" },
  { key: "dol", emoji: "👗", label: "돌 · 일반의상" },
  { key: "dol-hanbok", emoji: "🇰🇷", label: "돌 · 한복" },
  { key: "season", emoji: "🌸", label: "시즌 · 가족" },
];

export type BadgeKind = "hot" | "new" | "season" | "free" | "lock";

export interface ThemeApp {
  id: string;
  name: string;
  desc: string;
  milestone: MilestoneKey;
  gradient: string; // .g-* class
  emoji: string;
  badges: BadgeKind[];
  cuts: number;
  credits: number; // 기본 옵션(10컷) 크레딧
  freeAvailable?: boolean;
  memberOnly?: boolean;
  seasonDday?: number;
  trending?: boolean;
  hasVideo?: boolean;
  options: {
    outfit?: string[];
    background?: string[];
  };
}

export const THEME_APPS: ThemeApp[] = [
  // ── 50일
  {
    id: "flower-baby",
    name: "꽃 속의 아기",
    desc: "화사한 꽃에 파묻힌 50일 기념 스냅. 파스텔 톤의 몽글몽글한 감성 컷.",
    milestone: "d50",
    gradient: "g-flower",
    emoji: "🌷",
    badges: ["free"],
    cuts: 10,
    credits: 9,
    freeAvailable: true,
    hasVideo: true,
    options: {
      outfit: ["화이트 바디수트", "파스텔 로브", "꽃잎 모자"],
      background: ["튤립 정원", "수국 벽", "스튜디오 화이트"],
    },
  },
  {
    id: "cloud-bed",
    name: "구름 침대",
    desc: "구름 위에서 잠든 아기. 파스텔 보라빛 꿈나라 컨셉.",
    milestone: "d50",
    gradient: "g-cloud",
    emoji: "☁️",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    trending: true,
    hasVideo: true,
    options: {
      outfit: ["구름 잠옷", "화이트 스와들", "별무늬 우주복"],
      background: ["보랏빛 하늘", "핑크 노을", "은하수"],
    },
  },
  {
    id: "teddy-nap",
    name: "곰인형과 낮잠",
    desc: "커다란 곰인형 옆에서 새근새근. 따뜻한 베이지 톤 낮잠 스냅.",
    milestone: "d50",
    gradient: "g-b100",
    emoji: "🧸",
    badges: [],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["베이지 니트", "곰돌이 수트"],
      background: ["우드 침실", "니트 블랭킷"],
    },
  },
  {
    id: "bw-snap",
    name: "흑백 감성 스냅",
    desc: "빛과 그림자로 담는 클래식 흑백 신생아 화보.",
    milestone: "d50",
    gradient: "g-bw",
    emoji: "🎞️",
    badges: ["lock"],
    cuts: 10,
    credits: 9,
    memberOnly: true,
    options: {
      background: ["창가 자연광", "스튜디오 로우키"],
    },
  },
  // ── 100일
  {
    id: "flower-wreath",
    name: "꽃 리스 순백 컷",
    desc: "흰 러그에 누운 아기를 파스텔 생화 리스가 감싸는 오버헤드 플랫레이. 인스타 피드용 정방형.",
    milestone: "d100",
    gradient: "g-flower",
    emoji: "💐",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "milestone-100",
    name: "D+100 마일스톤 블록",
    desc: "니트 블랭킷 위 'D+100' 나무 블록과 곰인형 — 해외 마일스톤 블랭킷 트렌드의 100일 버전.",
    milestone: "d100",
    gradient: "g-cloud",
    emoji: "💯",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "b100-traditional",
    name: "백일상 전통 컨셉",
    desc: "전통 백일상 앞에서 남기는 격식 있는 기념 컷. 수수팥떡과 백설기까지 그대로.",
    milestone: "d100",
    gradient: "g-b100",
    emoji: "🎂",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    trending: true,
    hasVideo: true,
    options: {
      outfit: ["전통 백일복", "모던 한복", "화이트 드레스"],
      background: ["전통 병풍", "한옥 대청", "모던 스튜디오"],
    },
  },
  {
    id: "angel-wings",
    name: "천사 날개",
    desc: "새하얀 날개를 단 우리 집 천사. 무료 체험으로 가장 사랑받는 컨셉.",
    milestone: "d100",
    gradient: "g-angel",
    emoji: "👼",
    badges: ["free"],
    cuts: 3,
    credits: 0,
    freeAvailable: true,
    hasVideo: true,
    options: {
      outfit: ["화이트 튜튜", "천사 가운"],
      background: ["구름 위", "파스텔 하늘"],
    },
  },
  {
    id: "b100-balloon",
    name: "백일 풍선 파티",
    desc: "숫자 100 풍선과 함께하는 컬러풀 백일 파티 컨셉.",
    milestone: "d100",
    gradient: "g-balloon",
    emoji: "🎈",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    hasVideo: true,
    options: {
      outfit: ["파티 턱시도", "코랄 원피스"],
      background: ["파스텔 풍선월", "골드 벌룬"],
    },
  },
  {
    id: "flower-fairy",
    name: "꽃밭 요정",
    desc: "꽃잎 날리는 들판의 아기 요정. 동화 같은 야외 감성.",
    milestone: "d100",
    gradient: "g-flower",
    emoji: "🧚",
    badges: [],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["요정 드레스", "꽃잎 모자"],
      background: ["봄 들판", "라벤더 밭"],
    },
  },
  {
    id: "moon-star",
    name: "달과 별 꿈나라",
    desc: "초승달에 앉아 별을 만지는 아기. 밤하늘 감성 시그니처 컨셉.",
    milestone: "d100",
    gradient: "g-moon",
    emoji: "🌙",
    badges: ["lock"],
    cuts: 10,
    credits: 9,
    memberOnly: true,
    hasVideo: true,
    options: {
      outfit: ["별무늬 잠옷", "달빛 가운"],
      background: ["밤하늘", "은하수"],
    },
  },
  // ── 200일
  {
    id: "first-sit",
    name: "D+200 첫 앉기 기념",
    desc: "혼자 앉기 시작한 순간 — 'D+200' 블록과 함박웃음의 마일스톤 컷.",
    milestone: "d200",
    gradient: "g-flower",
    emoji: "🌼",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "milk-bath",
    name: "밀크바스 플라워",
    desc: "우유빛 욕조와 파스텔 꽃잎 — 200일 전후에만 가능한 시그니처 촬영.",
    milestone: "d200",
    gradient: "g-snow",
    emoji: "🛁",
    badges: ["new", "hot"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "growth-compare",
    name: "신생아 vs 200일 성장 비교",
    desc: "같은 블랭킷, 같은 자리 — 릴스 표지로 인기인 비포·애프터 2분할.",
    milestone: "d200",
    gradient: "g-bw",
    emoji: "🆚",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "bear-knit",
    name: "베어 니트 데일리 컷",
    desc: "곰돌이 귀 니트 후드와 창가 역광 — 홈스냅 감성 데일리.",
    milestone: "d200",
    gradient: "g-b100",
    emoji: "🧸",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "picnic",
    name: "피크닉 소풍",
    desc: "체크 돗자리 위 과일 바구니와 함께하는 화창한 소풍 컨셉.",
    milestone: "d200",
    gradient: "g-picnic",
    emoji: "🧺",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    trending: true,
    options: {
      outfit: ["멜빵바지", "체크 원피스"],
      background: ["잔디 공원", "가을 숲"],
    },
  },
  {
    id: "summer-sea",
    name: "여름 바다",
    desc: "모래사장과 파도, 밀짚모자. 시원한 여름 바다 스냅.",
    milestone: "d200",
    gradient: "g-sea",
    emoji: "🌊",
    badges: [],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["수영복", "밀짚모자 세트"],
      background: ["백사장", "파라솔 아래"],
    },
  },
  {
    id: "fruit-baby",
    name: "과일 콘셉트",
    desc: "수박 튜브, 복숭아 모자 — 상큼함 가득 과일 컨셉.",
    milestone: "d200",
    gradient: "g-fruit",
    emoji: "🍑",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["수박 수트", "복숭아 세트", "레몬 세트"],
      background: ["과일 마켓", "파스텔 스튜디오"],
    },
  },
  {
    id: "animal-pajama",
    name: "동물 잠옷 파티",
    desc: "곰돌이·토끼·병아리 잠옷을 입은 귀여움 폭발 컨셉.",
    milestone: "d200",
    gradient: "g-cloud",
    emoji: "🐰",
    badges: [],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["곰돌이", "토끼", "병아리"],
      background: ["침실", "쿠션 산"],
    },
  },
  // ── 돌 일반의상
  {
    id: "dol-tux",
    name: "턱시도 & 드레스 돌파티",
    desc: "첫 생일을 위한 격식 있는 파티 룩. 스몰웨딩풍 무드.",
    milestone: "dol",
    gradient: "g-tux",
    emoji: "🤵",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    hasVideo: true,
    options: {
      outfit: ["블랙 턱시도", "아이보리 드레스"],
      background: ["샹들리에 홀", "가든 웨딩"],
    },
  },
  {
    id: "cake-smash",
    name: "케이크 스매시",
    desc: "케이크를 마음껏 부수는 첫 생일 전통. 크림 범벅 웃음 폭발.",
    milestone: "dol",
    gradient: "g-cake",
    emoji: "🍰",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    trending: true,
    hasVideo: true,
    options: {
      outfit: ["파티 모자", "크라운 세트"],
      background: ["핑크 스튜디오", "블루 스튜디오"],
    },
  },
  {
    id: "one-balloon",
    name: "ONE 풍선 스튜디오",
    desc: "대형 'ONE' 풍선과 골드 콘페티 — 모던 돌 화보의 기본 프리셋.",
    milestone: "dol",
    gradient: "g-balloon",
    emoji: "🎈",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "first-steps",
    name: "첫 걸음마 순간",
    desc: "두 팔 벌리고 아장아장 — 골든아워 거실의 걸음마 캔디드.",
    milestone: "dol",
    gradient: "g-picnic",
    emoji: "👣",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "dream-job",
    name: "직업 드림 — 우주비행사·의사",
    desc: "우주비행사, 의사, 파일럿 — 아기의 미래를 미리 만나는 컨셉.",
    milestone: "dol",
    gradient: "g-dream",
    emoji: "🚀",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["우주비행사", "의사 가운", "파일럿"],
      background: ["우주 정거장", "진료실", "활주로"],
    },
  },
  // ── 돌 한복
  {
    id: "dol-hanbok",
    name: "돌잔치 한복",
    desc: "전통 궁궐 배경의 격조 있는 돌 한복 화보. 아기 얼굴 특징을 그대로 담아 10컷을 만들어드려요.",
    milestone: "dol-hanbok",
    gradient: "g-hanbok",
    emoji: "🎎",
    badges: ["hot"],
    cuts: 10,
    credits: 9,
    trending: true,
    hasVideo: true,
    options: {
      outfit: ["연분홍", "색동", "남색"],
      background: ["궁궐 마당", "한옥 대청", "모던 스튜디오"],
    },
  },
  {
    id: "dol-sang",
    name: "돌상 차림",
    desc: "돌잡이 소품과 전통 돌상 앞에서 남기는 기념 컷.",
    milestone: "dol-hanbok",
    gradient: "g-b100",
    emoji: "🥢",
    badges: [],
    cuts: 10,
    credits: 9,
    options: {
      outfit: ["색동 한복", "전통 조바위 세트"],
      background: ["전통 병풍", "모던 돌상"],
    },
  },
  {
    id: "doljabi",
    name: "돌잡이 순간 포착",
    desc: "실타래·붓·청진기·마이크 — 돌잡이 상에 손을 뻗는 순간의 스냅.",
    milestone: "dol-hanbok",
    gradient: "g-hanbok",
    emoji: "🎯",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "hanbok-closeup",
    name: "색동 한복 클로즈업",
    desc: "한지 배경, 노리개 디테일 — 액자 인쇄용 대표 클로즈업.",
    milestone: "dol-hanbok",
    gradient: "g-hanbok",
    emoji: "🌸",
    badges: ["new"],
    cuts: 10,
    credits: 9,
    options: {},
  },
  {
    id: "hanbok-family",
    name: "가족 한복 3인 컷",
    desc: "톤을 맞춘 가족 한복, 한옥 병풍 — 격조 있는 전통 가족사진 (부모 사진 추가 업로드).",
    milestone: "dol-hanbok",
    gradient: "g-hanbok",
    emoji: "👨‍👩‍👧",
    badges: ["new"],
    cuts: 10,
    credits: 12,
    options: {},
  },
  {
    id: "sebae",
    name: "설날 세배",
    desc: "복주머니 들고 꾸벅 — 명절 인사 컨셉.",
    milestone: "dol-hanbok",
    gradient: "g-hanbok",
    emoji: "🧧",
    badges: ["season"],
    cuts: 10,
    credits: 9,
    seasonDday: 21,
    options: {
      outfit: ["설빔 한복"],
      background: ["한옥 안방", "궁궐 설경"],
    },
  },
  // ── 시즌/가족
  {
    id: "first-snow",
    name: "첫눈",
    desc: "소복소복 첫눈 내리는 날의 겨울 감성 스냅. 시즌 한정.",
    milestone: "season",
    gradient: "g-snow",
    emoji: "❄️",
    badges: ["season"],
    cuts: 10,
    credits: 9,
    seasonDday: 7,
    trending: true,
    options: {
      outfit: ["니트 패딩 세트", "곰돌이 방한복"],
      background: ["눈 내리는 골목", "겨울 숲"],
    },
  },
  {
    id: "ghibli",
    name: "지브리풍 일러스트",
    desc: "동화책에서 튀어나온 듯한 따뜻한 애니메이션 일러스트 컨셉.",
    milestone: "season",
    gradient: "g-ghibli",
    emoji: "🌿",
    badges: ["lock"],
    cuts: 10,
    credits: 9,
    memberOnly: true,
    trending: true,
    options: {
      background: ["초록 들판", "숲속 오두막", "바닷마을"],
    },
  },
  {
    id: "family-shot",
    name: "가족 단체 컨셉",
    desc: "엄마 아빠와 함께 — 가족 모두가 주인공인 단체 화보.",
    milestone: "season",
    gradient: "g-picnic",
    emoji: "👨‍👩‍👧",
    badges: [],
    cuts: 10,
    credits: 12,
    options: {
      background: ["거실 스튜디오", "야외 공원"],
    },
  },
];

export const BADGE_LABEL: Record<BadgeKind, string> = {
  hot: "인기 🔥",
  new: "NEW",
  season: "시즌",
  free: "무료 가능",
  lock: "🔒 멤버십",
};

export const BADGE_CLASS: Record<BadgeKind, string> = {
  hot: "b-hot",
  new: "b-new",
  season: "b-season",
  free: "b-free",
  lock: "b-lock",
};

export function getApp(id: string): ThemeApp | undefined {
  return THEME_APPS.find((a) => a.id === id);
}

// 크레딧 가격 정책 (기획서 5.1)
export const PRICING = {
  hiResCredits: 2, // 고해상도 저장
  videoCredits: 10, // 무빙 클립 5초
  regenDiscount: 0.5, // 재생성 50%
} as const;

export const CREDIT_PACKS = [
  { credits: 50, price: 4900, bonus: 0 },
  { credits: 150, price: 12900, bonus: 15 },
  { credits: 400, price: 29900, bonus: 33 },
] as const;
