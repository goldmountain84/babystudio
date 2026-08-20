// 데모용 생성 잡 시뮬레이션 파라미터
// 실서비스: Redis 큐 + 워커, SSE로 진행률 푸시 (기획서 7.1)

export const JOB_DURATION_MS = 11_500; // 서버 시뮬레이션(T_POST=11s)과 동기
export const CLIP_DURATION_MS = 10_000;

// S08 무빙 클립 옵션 (V-01: 프리셋별 원가 차등)
export const MOTION_PRESETS = [
  "방긋 미소",
  "까꿍 손흔들기",
  "시네마틱 줌",
  "눈 깜빡+옹알이",
] as const;

export const CLIP_LENGTHS = [
  { sec: 5, credits: 10, label: "5초 (10C)" },
  { sec: 10, credits: 18, label: "10초 (18C)" },
  { sec: 15, credits: 25, label: "15초+BGM (25C)" },
] as const;

export const BGM_OPTIONS = ["자장가", "돌잔치 축하", "없음"] as const;

export const CLIP_FORMATS = ["9:16 (릴스)", "1:1", "16:9"] as const;

export const TIMELAPSE_CREDITS = 30;

export const WAIT_TIPS = [
  "웃는 사진을 올리면 표정이 더 자연스러워요",
  "다양한 각도의 사진일수록 얼굴 유사도가 올라가요",
  "🎄 크리스마스 시즌 테마가 곧 공개돼요",
  "베스트컷은 워터마크 없이 바로 저장할 수 있어요",
];
