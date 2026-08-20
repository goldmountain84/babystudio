import Link from "next/link";
import PhotoArt from "@/components/PhotoArt";

// S01 랜딩 — 3초 안에 가치 전달, 비회원도 테마 열람 가능 (SEO 유입)

const FAQS = [
  {
    q: "원본 사진은 어떻게 처리되나요?",
    a: "AI 학습이 끝나면 원본 사진은 즉시 삭제되며, 외부 모델 학습에 사용되지 않습니다. 마이페이지에서 학습 모델과 생성물 전체를 언제든 파기할 수 있어요.",
  },
  {
    q: "정말 무료로 사용할 수 있나요?",
    a: "가입만 하면 매월 3컷을 무료(워터마크 포함)로 만들 수 있어요. 신용카드 등록도 필요 없습니다.",
  },
  {
    q: "결과물이 마음에 들지 않으면요?",
    a: "생성 실패 시 크레딧은 자동 환불되고, 같은 옵션 재생성은 50% 크레딧으로 가능합니다.",
  },
  {
    q: "AI로 만든 사진임을 어떻게 알 수 있나요?",
    a: "모든 생성물에는 C2PA 메타데이터와 AI 제작 표시가 포함됩니다. 투명한 표시가 신뢰의 기본이라고 생각해요.",
  },
];

export default function Landing() {
  return (
    <main>
      {/* ── HERO ── */}
      <section className="grid items-center gap-10 px-6 py-14 md:grid-cols-[1.05fr_1fr] md:px-14 md:py-16">
        <div className="fadeup">
          <span className="pill hot">🍼 100일 · 200일 · 돌 — 시기별 전문 테마</span>
          <h1 className="serif mt-4 mb-3.5 text-4xl leading-[1.25] md:text-[40px]">
            스튜디오 안 가도,
            <br />
            우리 아기 <span className="text-rose">인생 화보</span>
          </h1>
          <p className="max-w-[400px] text-[15.5px] text-[#7d6f7a]">
            폰에 있는 아기 사진 5장이면 충분해요. AI가 백일상부터 돌잔치
            한복까지, 전문 스튜디오급 사진과 움직이는 영상을 만들어드립니다.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/login" className="cta big">
              📷 무료 3컷 만들기
            </Link>
            <Link href="/studio" className="cta ghost">
              ▶ 테마 구경하기
            </Link>
          </div>
          <p className="mt-3.5 text-xs text-[#a99ba5]">
            신용카드 불필요 · 원본 사진은 학습 후 즉시 삭제 🔒
          </p>
        </div>
        {/* hero collage */}
        <div className="relative">
          <div className="grid grid-cols-2 gap-3.5">
            <PhotoArt gradient="g-hanbok" emoji="👶🎎" caption="돌잔치 한복" video className="h-[190px]" />
            <PhotoArt gradient="g-angel" emoji="👼" caption="천사 날개" className="mt-10 h-[150px]" />
            <PhotoArt gradient="g-b100" emoji="🎂" caption="백일상" className="h-[150px]" />
            <PhotoArt gradient="g-moon" emoji="🌙⭐" caption="달과 별" video className="-mt-10 h-[190px]" />
          </div>
          <div className="absolute -bottom-3.5 -left-2 flex items-center gap-2 rounded-[14px] bg-white px-4 py-2.5 text-xs shadow-[0_12px_30px_rgba(60,40,55,.16)] md:-left-4">
            <b className="text-rose">★ 4.9</b>
            <span className="text-[#7d6f7a]">이번 주 12,480 가족이 화보를 만들었어요</span>
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ── */}
      <section className="px-6 py-12 md:px-14">
        <p className="serif mb-1.5 text-center text-[21px]">
          폰 사진이 <b className="text-rose">화보</b>가 되기까지, 딱 5분
        </p>
        <p className="mb-6 text-center text-[13px] text-[#9a8e96]">
          업로드 → 테마 선택 → 완성. 프롬프트도, 편집 기술도 필요 없어요
        </p>
        <div className="mx-auto grid max-w-[880px] grid-cols-3 gap-3.5">
          <div className="text-center">
            <PhotoArt gradient="g-bw" emoji="🤳" caption="원본 폰사진" className="h-[140px]" />
            <p className="mt-2 text-xs font-bold text-sub">1. 사진 5~10장 업로드</p>
          </div>
          <div className="text-center">
            <PhotoArt gradient="g-hanbok" emoji="👶🎎" caption="한복 돌잔치 화보" className="h-[140px]" />
            <p className="mt-2 text-xs font-bold text-sub">2. 테마 앱 원탭 실행</p>
          </div>
          <div className="text-center">
            <PhotoArt gradient="g-moon" emoji="🎬" caption="움직이는 영상" video className="h-[140px]" />
            <p className="mt-2 text-xs font-bold text-sub">3. 사진 + 무빙 영상 완성</p>
          </div>
        </div>
      </section>

      {/* ── MILESTONE STRIP ── */}
      <section className="bg-gradient-to-b from-cream to-[#FDF2EC] px-6 py-12 md:px-14">
        <p className="serif mb-1.5 text-center text-[21px]">
          아기의 <b className="text-rose">시기</b>에 딱 맞는 테마
        </p>
        <p className="mb-6 text-center text-[13px] text-[#9a8e96]">
          50일 · 100일 · 200일 · 돌 — 놓치면 다시 오지 않는 순간을 남기세요
        </p>
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-5">
          <PhotoArt gradient="g-cloud" emoji="🍼" caption="50일" className="h-[120px]" />
          <PhotoArt gradient="g-b100" emoji="🎂" caption="100일 (백일)" className="h-[120px]" />
          <PhotoArt gradient="g-picnic" emoji="🌈" caption="200일" className="h-[120px]" />
          <PhotoArt gradient="g-tux" emoji="👗" caption="돌 · 일반의상" className="h-[120px]" />
          <PhotoArt gradient="g-hanbok" emoji="🇰🇷" caption="돌 · 한복" className="col-span-2 h-[120px] md:col-span-1" />
        </div>
        <div className="mt-6 text-center">
          <Link href="/studio" className="cta dark">
            테마 앱 전체 보기 →
          </Link>
        </div>
      </section>

      {/* ── TRUST ── */}
      <section className="px-6 py-12 md:px-14">
        <div className="mx-auto grid max-w-[880px] gap-4 md:grid-cols-3">
          {[
            { emo: "🔒", title: "원본 즉시 삭제", desc: "AI 학습 완료 후 원본 사진은 즉시 파기. 외부 모델 학습에도 쓰지 않아요." },
            { emo: "🛡️", title: "아동 보호 최우선", desc: "보호자 확인, 이중 안전 필터, 부적절 변형 원천 차단." },
            { emo: "✅", title: "AI 제작 투명 표시", desc: "모든 생성물에 C2PA 메타데이터 포함. 소유권은 부모님께." },
          ].map((t) => (
            <div key={t.title} className="card px-5 py-6 text-center">
              <span className="text-3xl">{t.emo}</span>
              <p className="mt-2 text-sm font-extrabold">{t.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-sub">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-16 md:px-14">
        <p className="serif mb-5 text-center text-[21px]">자주 묻는 질문</p>
        <div className="mx-auto max-w-[720px]">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-b border-line py-3.5">
              <summary className="cursor-pointer list-none text-sm font-bold marker:hidden">
                <span className="mr-2 text-rose">Q.</span>
                {f.q}
              </summary>
              <p className="mt-2 pl-6 text-[13px] leading-relaxed text-sub">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-[11px] text-[#a99ba5] md:px-14">
        BabyStudio.ai · 이용약관 · 개인정보처리방침 · 고객센터 — 데모 빌드 (모든
        이미지는 플레이스홀더)
      </footer>
    </main>
  );
}
