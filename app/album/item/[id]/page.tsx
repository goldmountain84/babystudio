"use client";

// S07 결과 갤러리 — 다운로드 & 전환 포인트

import { use, useState } from "react";
import Link from "next/link";
import { getApp } from "@/lib/data";
import { useStore } from "@/lib/store";
import PhotoArt from "@/components/PhotoArt";

const CUT_EMOJIS = ["👶", "🥰", "😊", "🤗", "😴", "🍼", "🎀", "🌟", "💕", "🎉"];

export default function AlbumItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    hydrated,
    album,
    credits,
    unlockHiRes,
    setBestCut,
  } = useStore();
  const [selected, setSelected] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const item = album.find((i) => i.id === id);
  const app = item ? getApp(item.appId) : undefined;

  if (hydrated && (!item || !app)) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">앨범 아이템을 찾을 수 없어요.</p>
        <Link href="/album" className="cta mt-4">
          앨범으로
        </Link>
      </main>
    );
  }
  if (!item || !app) return null;

  const isHiRes = item.hiRes.includes(selected);
  const hasVideo = item.videos.includes(selected);
  // Q-01 품질 게이트를 통과한 컷의 실제 유사도 (서버 assets.similarity)
  const simScore = item.similarities[selected]?.toFixed(2) ?? "—";

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <main className="pb-16">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 md:px-10">
        <span className="text-sm font-bold">
          {app.name} 화보{" "}
          <span className="font-medium text-[#9a8e96]">
            · {item.cuts}컷 · 방금 완성 ✨
          </span>
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <Link href={`/share/${item.id}`} className="pill">
            🔗 공유하고 +1컷 받기
          </Link>
          <button
            className="cta"
            onClick={() => flash("고해상도 전체 저장은 데모에서 생략돼요 ⬇")}
          >
            ⬇ 전체 고해상도 저장
          </button>
        </div>
      </div>

      {/* 컷 그리드 */}
      <div className="grid grid-cols-3 gap-3 px-6 md:grid-cols-5 md:px-10">
        {Array.from({ length: item.cuts }).map((_, i) => {
          const best = i === item.bestCut;
          const unlocked = item.hiRes.includes(i);
          return (
            <button key={i} onClick={() => setSelected(i)} className="cursor-pointer">
              <PhotoArt
                gradient={app.gradient}
                emoji={CUT_EMOJIS[i % CUT_EMOJIS.length]}
                caption={best ? "★ 베스트" : undefined}
                watermark={!unlocked}
                video={item.videos.includes(i)}
                imgSrc={item.imageUrls[i]}
                className={`h-[110px] md:h-[130px] ${
                  best ? "outline outline-[3px] outline-offset-2 outline-gold" : ""
                } ${selected === i ? "ring-4 ring-rose/50" : "opacity-95"}`}
              />
            </button>
          );
        })}
      </div>

      {/* 선택 컷 상세 */}
      <div className="mx-6 mt-5 grid gap-5 rounded-[18px] border border-line bg-white p-5 shadow-[0_10px_30px_rgba(60,40,55,.07)] md:mx-10 md:grid-cols-[1.3fr_1fr]">
        <PhotoArt
          gradient={app.gradient}
          emoji={`👶${app.emoji}`}
          caption={`선택 컷 ${selected + 1} — ${app.name}`}
          watermark={!isHiRes}
          video={hasVideo}
          emojiSize={58}
          imgSrc={item.imageUrls[selected]}
          className="h-[240px] md:h-[300px]"
        />
        <div className="flex flex-col justify-center gap-2.5">
          <button
            className="cta big"
            disabled={isHiRes}
            onClick={async () => {
              // 실제 API: POST /api/assets/:id/hires (2C hold→confirm)
              const ok = await unlockHiRes(item.id, selected);
              if (ok) flash("워터마크 없는 고해상도 컷이 해금됐어요 ✨");
              else flash("크레딧이 부족해요 — 충전 후 이용해 주세요");
            }}
          >
            {isHiRes ? "✓ 고해상도 해금됨" : "⬇ 고해상도로 저장 (2C)"}
          </button>
          {hasVideo ? (
            <Link href="/video" className="cta ghost big">
              ✓ 영상 변환 완료 — 영상 스튜디오에서 보기
            </Link>
          ) : (
            <Link
              href={`/video?item=${item.id}&cut=${selected}`}
              className="cta ghost big"
            >
              🎬 이 컷, 영상으로 만들기 (10C~)
            </Link>
          )}
          <button
            className="pill justify-center !py-2.5"
            onClick={() => flash("재생성은 50% 크레딧으로 가능해요 (데모 생략)")}
          >
            🔁 이 컷 다시 생성 (50% 크레딧)
          </button>
          <div className="mt-1 flex justify-center gap-2">
            <button
              className="pill"
              onClick={() => {
                setBestCut(item.id, selected);
                flash("베스트컷으로 표시했어요 ♡");
              }}
            >
              ♡ 베스트컷 표시
            </button>
            <button
              className="pill hot"
              onClick={() => flash("공유 링크를 복사했어요! +1컷 🎁 (데모)")}
            >
              🔗 공유 +1컷
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11.5px] text-[#a99ba5]">
            품질 게이트 통과 · 얼굴 유사도 {simScore} (기준 0.82+)
            <br />
            보유 💎 {credits}C · 모든 생성물에는 AI 제작 표시(C2PA)가 포함됩니다
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
