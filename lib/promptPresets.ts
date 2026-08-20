// GPT 전용 · 1K 프롬프트 프리셋 팩 (기획/리서치_AI아기사진_유행프롬프트 기반, 2026.08)
// 원본: baby_prompt_presets_gpt_1k.html — 4개 성장단계 × 5종.
// 이 팩이 프롬프트 컨트롤 플레인의 "기본 설정": 각 프롬프트가 대응 테마의 live 버전이 된다.
// 얼굴 유지·출력 규칙은 프롬프트 본문에 포함, 안전 레이어·네거티브 체인은 서버 조립이 추가 주입.

export const GPT_ENGINE = "GPT 이미지 (1K)";

export const FACE_RULE =
  "업로드한 아기 사진의 눈, 코, 입, 얼굴형과 표정 느낌을 그대로 유지해줘.";
const FAMILY_FACE_RULE =
  "업로드한 아기와 부모 사진 속 얼굴을 모두 그대로 유지해줘.";
const OUT_PORTRAIT = "사실적인 전문 스튜디오 사진 화질, 해상도 1K, 세로 구도(1024×1536).";
const OUT_SQUARE = "사실적인 전문 스튜디오 사진 화질, 해상도 1K, 정방형(1024×1024).";

export interface PromptPreset {
  themeId: string; // 대응 테마 (기존 교체 or 신규)
  title: string;
  pose: string;
  aspect: "portrait" | "square";
  prompt: string;
  memo: string;
}

export const PRESET_PACK: PromptPreset[] = [
  // ── 🍼 100일 (누워있는 시기 — 전 컷 눕기/기대기) ──────────
  {
    themeId: "b100-traditional",
    title: "클래식 백일상",
    pose: "눕기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 흰 배냇저고리를 입고 백일상 앞에 살짝 기대어 누운 백일 기념사진을 만들어줘. 상 위에는 백설기와 과일, 나무로 만든 '100' 숫자 소품과 꽃 리스가 놓여 있어. 순백과 파스텔 톤 배경, 부드러운 자연광, 전문 백일스냅 스튜디오 느낌.\n${OUT_PORTRAIT}`,
    memo: "백일스냅의 기본형. '100' 소품은 나무 블록/풍선으로 교체 가능.",
  },
  {
    themeId: "flower-wreath",
    title: "꽃 리스 순백 컷",
    pose: "눕기",
    aspect: "square",
    prompt: `${FACE_RULE} 흰 러그 위에 누워 있는 아기 주위를 파스텔 톤 생화 리스가 둥글게 감싸고 있는 백일 기념사진을 만들어줘. 아기는 흰 배냇저고리 차림으로 카메라를 바라보며 살짝 웃고 있어. 머리 위에서 내려다보는 오버헤드 앵글, 밝고 부드러운 자연광.\n${OUT_SQUARE}`,
    memo: "오버헤드 플랫레이 — 인스타 피드용 정방형.",
  },
  {
    themeId: "milestone-100",
    title: "D+100 마일스톤 블록",
    pose: "눕기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 크림색 니트 블랭킷 위에 누운 아기 옆에 'D+100' 나무 마일스톤 블록과 아기 곰인형이 놓여 있는 기념사진을 만들어줘. 파스텔 우주복, 창가에서 들어오는 부드러운 사이드 조명, 따뜻한 뉴트럴 톤, 얕은 심도.\n${OUT_PORTRAIT}`,
    memo: "해외 'milestone blanket' 트렌드의 100일 현지화 버전.",
  },
  {
    themeId: "bw-snap",
    title: "손·발 흑백 클로즈업",
    pose: "디테일",
    aspect: "square",
    prompt: `${FACE_RULE} 부모의 손가락을 꼭 잡은 아기의 작은 손을 클로즈업한 흑백 사진을 만들어줘. 니트 블랭킷 배경, 얕은 심도와 크리미한 보케, 피부와 손톱의 섬세한 질감, 파인아트 흑백 감성.\n${OUT_SQUARE}`,
    memo: "백일 액자·답례품 단골 컷. 발 버전으로 변형 가능.",
  },
  {
    themeId: "cloud-bed",
    title: "구름 위 낮잠 (판타지)",
    pose: "눕기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 흰 니트 블랭킷에 감싸인 아기가 분홍빛 노을 하늘에 떠 있는 포근한 구름 위에서 잠들어 있는 초현실 사진을 만들어줘. 은은하게 빛나는 구름, 꿈결 같은 시네마틱 조명, 파스텔 톤.\n${OUT_PORTRAIT}`,
    memo: "조사에서 확인된 '구름 위 아기' 바이럴 컷의 100일 버전.",
  },

  // ── 🌼 200일 (앉기 시작 — 앉은 포즈 중심) ─────────────────
  {
    themeId: "first-sit",
    title: "D+200 첫 앉기 기념",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 포근한 러그 위에 혼자 앉아 함박웃음을 짓는 아기와 그 옆의 'D+200' 나무 블록을 담은 기념사진을 만들어줘. 균형을 잡으려 양팔을 살짝 벌린 자연스러운 순간, 밝은 거실 배경의 부드러운 보케, 코지한 니트 의상, 따뜻한 자연광.\n${OUT_PORTRAIT}`,
    memo: "'첫 혼자 앉기' 트렌드 + 200일 마일스톤 결합.",
  },
  {
    themeId: "milk-bath",
    title: "밀크바스 플라워",
    pose: "앉기",
    aspect: "square",
    prompt: `${FACE_RULE} 하얀 우유빛 물이 담긴 욕조에 앉아 노는 아기와 물 위에 흩어진 파스텔 생화 꽃잎을 담은 밀크바스 기념사진을 만들어줘. 머리 위에서 내려다보는 앵글, 밝고 화사한 조명, 뽀얀 피부 톤, 감성 스튜디오 밀크바스 촬영 스타일.\n${OUT_SQUARE}`,
    memo: "200일 전후에만 예약이 몰리는 밀크바스 촬영 재현.",
  },
  {
    themeId: "growth-compare",
    title: "신생아 vs 200일 성장 비교",
    pose: "2분할",
    aspect: "square",
    prompt: `${FACE_RULE} 같은 아기의 성장 비교 2분할 사진을 만들어줘. 왼쪽은 니트 블랭킷에 감싸인 신생아 시절, 오른쪽은 같은 블랭킷 같은 자리에 앉아 웃고 있는 200일의 통통한 모습. 두 컷 모두 동일한 부드러운 자연광과 뉴트럴 톤, 하단에 'Newborn'과 'D+200' 캡션.\n${OUT_SQUARE}`,
    memo: "릴스 표지로 인기인 비포·애프터 포맷.",
  },
  {
    themeId: "fruit-baby",
    title: "과일 콘셉트 (수박 컷)",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 여름 감성의 과일 콘셉트 기념사진을 만들어줘. 아기가 큼직한 수박 반통 앞에 앉아 수박 조각을 두 손으로 잡고 신나 하는 모습. 초록 체크 러그, 미니 밀짚모자, 밝고 청량한 여름 자연광, 톡톡 튀는 색감.\n${OUT_PORTRAIT}`,
    memo: "계절 과일(딸기·귤·수박)로 교체하며 시즌 운영.",
  },
  {
    themeId: "bear-knit",
    title: "베어 니트 데일리 컷",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 곰돌이 귀가 달린 베이지 니트 후드 우주복을 입고 침대 위에 앉아 카메라를 바라보는 아기의 데일리 감성 사진을 만들어줘. 창가의 부드러운 역광, 크림·오트밀 톤, 얕은 심도, 홈스냅 무드.\n${OUT_PORTRAIT}`,
    memo: "'곰돌이 속싸개' 트렌드를 앉기 시기 니트룩으로 변형.",
  },

  // ── 🎂 돌 (서기/걸음마 — 모던 파스텔) ─────────────────────
  {
    themeId: "cake-smash",
    title: "케이크 스매시",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 첫 생일 케이크 스매시 사진을 만들어줘. 아기가 파스텔 버터크림 미니 케이크에 두 손을 푹 넣고 볼과 손에 크림을 묻힌 채 크게 웃는 순간. 배경에는 파스텔 풍선과 'ONE' 가랜드가 흐릿하게 보이고 바닥에는 콘페티, 밝고 화사한 스튜디오 조명.\n${OUT_PORTRAIT}`,
    memo: "돌 촬영 글로벌 1위 콘셉트.",
  },
  {
    themeId: "one-balloon",
    title: "ONE 풍선 스튜디오",
    pose: "서기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 크림색 배경의 스튜디오에서 대형 'ONE' 풍선 옆에 서서 풍선 줄을 잡고 있는 아기의 첫 생일 화보를 만들어줘. 파스텔 멜빵바지에 맨발, 골드 콘페티 풍선 몇 개, 부드럽고 균일한 스튜디오 조명, 미니멀한 구성.\n${OUT_PORTRAIT}`,
    memo: "모던 돌 화보의 기본 프리셋.",
  },
  {
    themeId: "first-steps",
    title: "첫 걸음마 순간",
    pose: "걷기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 햇살 가득한 거실에서 두 팔을 벌리고 아장아장 첫 걸음을 떼는 아기의 스냅사진을 만들어줘. 웃음이 터진 얼굴, 살짝 흔들리는 듯한 생동감 있는 순간 포착, 배경의 부드러운 보케, 따뜻한 골든아워 빛.\n${OUT_PORTRAIT}`,
    memo: "'첫 혼자 앉기' 트렌드의 돌 버전 — 걸음마 캔디드.",
  },
  {
    themeId: "dol-tux",
    title: "왕관 생일 왕자·공주",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 작은 골드 왕관을 쓰고 폭신한 크림 소파 위에 앉아 있는 아기의 첫 생일 기념 화보를 만들어줘. 튤 스커트(여아) 또는 보타이 세트(남아), 주변에 파스텔 풍선과 케이크 토퍼, 화사하고 밝은 파스텔 스튜디오 무드.\n${OUT_PORTRAIT}`,
    memo: "성별에 따라 의상 옵션 분기.",
  },
  {
    themeId: "family-shot",
    title: "가족 3인 돌 기념 컷",
    pose: "가족",
    aspect: "portrait",
    prompt: `${FAMILY_FACE_RULE} 크림색 스튜디오 배경 앞에서 부모가 아기를 사이에 두고 앉아 함께 웃는 첫 생일 가족사진을 만들어줘. 톤을 맞춘 베이지·화이트 세미 정장 의상, 'Happy 1st Birthday' 미니 가랜드, 부드러운 스튜디오 조명.\n${OUT_PORTRAIT}`,
    memo: "부모 사진 추가 업로드가 필요한 확장 프리셋.",
  },

  // ── 🇰🇷 돌 (한복) — 전통 돌스냅 필수 장면 ─────────────────
  {
    themeId: "dol-sang",
    title: "전통 돌상 정면 컷",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 색동저고리 돌복을 입고 복건(남아) 또는 조바위(여아)를 쓴 아기가 전통 돌상 앞에 앉아 있는 첫돌 기념사진을 만들어줘. 돌상 위에는 백설기, 수수팥떡, 과일, 실타래가 정갈하게 놓여 있고 뒤로는 '첫돌' 글자가 수놓인 병풍. 한복 스튜디오의 부드러운 조명, 단정하고 격조 있는 구도.\n${OUT_PORTRAIT}`,
    memo: "돌스냅 대표 컷. 남아/여아에 따라 쓰개 자동 분기.",
  },
  {
    themeId: "doljabi",
    title: "돌잡이 순간 포착",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 돌복을 입은 아기가 돌잡이 상 위의 물건들(실타래, 붓, 엽전 꾸러미, 청진기, 마이크) 중 하나를 향해 신나게 손을 뻗는 순간을 포착한 사진을 만들어줘. 호기심 가득한 표정, 주변에서 지켜보는 따뜻한 분위기, 자연스러운 스냅 감성의 조명.\n${OUT_PORTRAIT}`,
    memo: "잡는 물건을 옵션으로 선택하게 하면 재미 요소가 됨.",
  },
  {
    themeId: "dol-hanbok",
    title: "한옥 마루 골든아워",
    pose: "앉기",
    aspect: "portrait",
    prompt: `${FACE_RULE} 고운 한복을 입은 아기가 한옥 대청마루에 앉아 있고, 뒤로 기와지붕과 정갈한 마당이 보이는 야외 돌 기념사진을 만들어줘. 늦은 오후의 따뜻한 골든아워 햇살, 처마 밑 청사초롱, 은은한 필름 감성 색감.\n${OUT_PORTRAIT}`,
    memo: "스레드 한복 프롬프트 트렌드의 시그니처 무드.",
  },
  {
    themeId: "hanbok-closeup",
    title: "색동 한복 클로즈업",
    pose: "디테일",
    aspect: "portrait",
    prompt: `${FACE_RULE} 색동 소매의 한복을 입은 아기의 상반신 클로즈업 화보를 만들어줘. 은은한 미색 한지 느낌의 배경, 볼록한 볼과 맑은 눈망울이 돋보이는 정면 구도, 노리개 디테일, 부드럽고 고급스러운 스튜디오 조명.\n${OUT_PORTRAIT}`,
    memo: "액자 인쇄용 대표 클로즈업.",
  },
  {
    themeId: "hanbok-family",
    title: "가족 한복 3인 컷",
    pose: "가족",
    aspect: "portrait",
    prompt: `${FAMILY_FACE_RULE} 세 가족이 모두 톤을 맞춘 한복을 입고 한옥 병풍 앞에 앉아 있는 첫돌 가족사진을 만들어줘. 아기는 색동 돌복, 부모는 은은한 파스텔 한복, 단정한 정면 구도와 부드러운 스튜디오 조명, 격조 있는 전통 가족사진 무드.\n${OUT_PORTRAIT}`,
    memo: "부모 사진 추가 업로드 확장 프리셋 — 한복 버전.",
  },
];

export const PRESET_AUTHOR = "프리셋팩-GPT1K";
