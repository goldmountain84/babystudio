"use client";

// 공유 랜딩 (R-05 · §3.3) — 공개 링크: 워터마크 컷만 노출 + "나도 만들기" 퍼널
// 비회원 유입 전환이 목적. 공유→가입 전환율을 별도 KPI로 추적(목표 8%).

import { use } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { getApp } from "@/lib/data";
import PhotoArt from "@/components/PhotoArt";

const CUT_EMOJIS = ["👶", "🥰", "😊", "🤗", "😴"];

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { hydrated, album, baby } = useStore();
  const item = album.find((i) => i.id === id);
  const app = item ? getApp(item.appId) : getApp("dol-hanbok");
  if (!hydrated || !app) return null;

  const name = baby?.name ?? "우리 아기";

  return (
    <main className="mx-auto max-w-[680px] px-6 pb-16 pt-10 text-center">
      <span className="pill hot">✨ {name}의 AI 화보가 도착했어요</span>
      <h1 className="serif mt-3 text-[26px] font-bold leading-snug">
        {app.name}
        <br />
        <span className="text-rose">{item?.cuts ?? 10}컷 화보</span>
      </h1>

      {/* 비포/애프터 */}
      <div className="mt-6 grid grid-cols-3 items-center gap-3">
        <PhotoArt gradient="g-bw" emoji="🤳" caption="평범한 폰사진" className="h-[120px]" />
        <span className="text-2xl text-rose">→</span>
        <PhotoArt gradient={app.gradient} emoji={`👶${app.emoji}`} caption="AI 스튜디오 화보" video className="h-[120px]" />
      </div>

      {/* 워터마크 컷 (공개 링크는 워터마크만) */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {CUT_EMOJIS.slice(0, 3).map((e, i) => (
          <PhotoArt
            key={i}
            gradient={app.gradient}
            emoji={e}
            watermark
            className="h-[110px]"
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-[#a99ba5]">
        공개 링크에는 워터마크 컷만 표시됩니다 · AI 제작 표시(C2PA) 포함
      </p>

      <div className="mt-7 rounded-2xl border border-line bg-white px-6 py-6">
        <p className="serif text-[18px] font-bold">
          우리 아기 사진 5장이면, 이런 화보가 나와요
        </p>
        <p className="mt-1 text-[12.5px] text-sub">
          가입하면 무료 3컷 · 신용카드 불필요 · 원본 사진 즉시 삭제 🔒
        </p>
        <Link href="/login" className="cta big mt-4">
          📷 나도 무료로 만들기
        </Link>
      </div>

      <p className="mt-4 text-[10.5px] text-[#a99ba5]">
        이 링크를 공유한 가족·친구가 가입하면 두 분 모두 +3컷을 받아요 (리퍼럴 이중 보상)
      </p>
    </main>
  );
}
