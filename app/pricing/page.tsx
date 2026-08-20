"use client";

// S10 요금제 — 무료 · 패키지(앵커) · 멤버십 + 크레딧 팩

import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function Pricing() {
  const { hydrated, credits, addCredits, loggedIn } = useStore();
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const buyPack = async (c: number, price: number) => {
    if (!loggedIn) {
      flash("로그인 후 충전할 수 있어요");
      return;
    }
    // 실제 API: POST /api/orders (데모 PG) → 서명 웹훅 경유 원장 지급
    const ok = await addCredits(c, price);
    if (ok)
      flash(`💎 ${c} 크레딧이 충전됐어요! (데모 PG — 서명 웹훅 경유, ₩${price.toLocaleString()})`);
    else flash("결제 처리에 실패했어요 — 잠시 후 다시 시도해 주세요");
  };

  return (
    <main className="pb-16">
      <p className="serif mt-9 mb-1.5 text-center text-[26px] font-bold">
        필요한 만큼만, 부담 없이
      </p>
      <p className="text-center text-[13.5px] text-[#9a8e96]">
        기념일 한 번이면 패키지, 계속 남기고 싶다면 멤버십
      </p>

      <div className="mx-auto mt-7 grid max-w-[920px] gap-4.5 px-6 md:grid-cols-3">
        {/* 무료 */}
        <div className="card px-6 py-6 text-center">
          <b className="text-[15px]">무료</b>
          <p className="serif my-2.5 text-[28px]">₩0</p>
          <p className="text-[12.5px] leading-8 text-sub">
            월 3컷 (워터마크)
            <br />
            영상 3초 미리보기
            <br />
            앨범 30일 보관
            <br />
            미래아기 예측 1회
          </p>
          <button className="cta ghost mt-4 w-full" disabled>
            현재 플랜
          </button>
        </div>

        {/* 패키지 (앵커) */}
        <div className="relative rounded-[20px] border-2 border-rose bg-gradient-to-b from-white to-[#FFF4F0] px-6 py-6 text-center shadow-[0_18px_44px_rgba(232,97,140,.18)] md:scale-[1.04]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-rose px-3.5 py-1 text-[11px] font-extrabold text-white">
            가장 인기
          </span>
          <b className="text-[15px]">스튜디오 패키지</b>
          <p className="serif my-2.5 text-[28px]">
            ₩19,900 <span className="text-xs text-[#9a8e96]">/ 1회</span>
          </p>
          <p className="text-[12.5px] leading-8 text-sub">
            테마 앱 1종 화보 30컷
            <br />
            베스트컷 무빙 영상 1개
            <br />
            고해상도 전체 저장
            <br />
            워터마크 없음
          </p>
          <button
            className="cta big mt-4 w-full"
            onClick={() => buyPack(30, 19900)}
          >
            백일·돌 준비하기
          </button>
        </div>

        {/* 멤버십 */}
        <div className="card px-6 py-6 text-center">
          <b className="text-[15px]">멤버십</b>
          <p className="serif my-2.5 text-[28px]">
            ₩9,900 <span className="text-xs text-[#9a8e96]">/ 월</span>
          </p>
          <p className="text-[12.5px] leading-8 text-sub">
            매월 200 크레딧
            <br />
            전체 앱 + 🔒 전용 앱
            <br />
            우선 생성 큐 · 앨범 무기한
            <br />
            시즌 앱 얼리액세스
          </p>
          <button
            className="cta dark mt-4 w-full"
            onClick={() => buyPack(200, 9900)}
          >
            구독하기
          </button>
        </div>
      </div>

      {/* 크레딧 팩 */}
      <div className="mx-auto mt-6 max-w-[920px] px-6">
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-white px-5 py-4 text-[12.5px]">
          <b>💎 크레딧 팩</b>
          {CREDIT_PACKS.map((p) => (
            <button
              key={p.credits}
              className={`pill ${p.bonus === 15 ? "hot" : ""}`}
              onClick={() => buyPack(p.credits, p.price)}
            >
              {p.credits}C ₩{p.price.toLocaleString()}
              {p.bonus > 0 && <b> +{p.bonus}%</b>}
            </button>
          ))}
          <span className="ml-auto text-[#a99ba5]">
            이미지 1C · 고해상도 2C · 영상 10C~ · 크레딧 무기한 · 실패 시 자동
            환불
          </span>
        </div>
        {hydrated && loggedIn && (
          <p className="mt-3 text-center text-xs text-sub">
            현재 보유: <b className="text-rose-d">💎 {credits} 크레딧</b>
          </p>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
