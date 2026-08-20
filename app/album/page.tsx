"use client";

// S09 마이 앨범 — 타임라인 그룹, 보관 정책, 굿즈(V2 예고)

import Link from "next/link";
import { useStore } from "@/lib/store";
import { getApp } from "@/lib/data";
import PhotoArt from "@/components/PhotoArt";

export default function AlbumPage() {
  const { hydrated, baby, album, loggedIn } = useStore();

  if (hydrated && !loggedIn) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">로그인하면 앨범을 볼 수 있어요.</p>
        <Link href="/login" className="cta mt-4">
          로그인
        </Link>
      </main>
    );
  }

  // 월 단위 타임라인 그룹핑 (AL-01)
  const groups = new Map<string, typeof album>();
  for (const item of album) {
    const d = new Date(item.createdAt);
    const key = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <main className="mx-auto max-w-[960px] px-6 pb-16 pt-6 md:px-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-extrabold">
          {baby ? `${baby.name}의 앨범` : "마이 앨범"}
        </h1>
        <div className="ml-auto flex gap-2">
          <span className="pill sel">사진</span>
          <Link href="/video" className="pill">
            ▶ 영상 스튜디오
          </Link>
          <span className="pill">👨‍👩‍👧 공유앨범 (가족 초대)</span>
        </div>
      </div>

      {album.length === 0 && hydrated && (
        <div className="card mt-6 px-8 py-14 text-center">
          <span className="text-4xl">📷</span>
          <p className="mt-3 text-sm font-bold">아직 만든 화보가 없어요</p>
          <p className="mt-1 text-xs text-sub">
            테마 앱을 실행하면 여기에 화보가 차곡차곡 쌓여요
          </p>
          <Link href="/studio" className="cta mt-5">
            첫 화보 만들러 가기
          </Link>
        </div>
      )}

      {[...groups.entries()].map(([month, items]) => (
        <section key={month} className="mt-7">
          <b className="text-[15px]">{month}</b>
          <div className="mt-2.5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
            {items.map((item) => {
              const app = getApp(item.appId);
              if (!app) return null;
              return (
                <Link key={item.id} href={`/album/item/${item.id}`}>
                  <PhotoArt
                    gradient={app.gradient}
                    emoji={app.emoji}
                    caption={`${app.name} ${item.cuts}컷${item.videos.length ? ` · ▶ 영상 ${item.videos.length}` : ""}`}
                    imgSrc={item.imageUrls.find((u) => u) ?? null}
                    className="h-[120px] transition-transform hover:-translate-y-1"
                  />
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {/* 굿즈 (V2 예고) */}
      <section className="mt-10 grid gap-3 md:grid-cols-3">
        {[
          { emo: "🖼", name: "액자 만들기", price: "₩29,000~ (V2 예정)" },
          { emo: "📖", name: "성장 포토북", price: "₩39,000~ (V2 예정)" },
          { emo: "💌", name: "돌잔치 초대장", price: "모바일 무료 / 인쇄 유료" },
        ].map((g) => (
          <div key={g.name} className="card px-5 py-5 text-center opacity-80">
            <span className="text-2xl">{g.emo}</span>
            <p className="mt-1 text-[13px] font-bold">{g.name}</p>
            <p className="text-[11px] text-sub">{g.price}</p>
          </div>
        ))}
      </section>

      <p className="mt-8 rounded-xl border border-line bg-white px-5 py-3 text-center text-[11.5px] text-sub">
        무료 플랜: 생성 후 30일 보관 · 멤버십은 무기한 보관돼요
      </p>
    </main>
  );
}
