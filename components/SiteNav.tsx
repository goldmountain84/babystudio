"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";

export default function SiteNav() {
  const { hydrated, loggedIn, baby, credits, logout } = useStore();

  return (
    <nav className="sticky top-0 z-50 flex items-center gap-6 border-b border-line bg-cream/95 px-6 py-4 backdrop-blur md:px-10">
      <Link href="/" className="text-[17px] font-extrabold tracking-tight">
        Baby<em className="not-italic text-rose">Studio</em>.ai
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        <Link href="/studio" className="text-[13.5px] font-medium text-[#6d6069] hover:text-rose">
          테마 앱
        </Link>
        <Link href="/pricing" className="text-[13.5px] font-medium text-[#6d6069] hover:text-rose">
          요금
        </Link>
        <Link href="/video" className="text-[13.5px] font-medium text-[#6d6069] hover:text-rose">
          영상
        </Link>
        <Link href="/album" className="text-[13.5px] font-medium text-[#6d6069] hover:text-rose">
          앨범
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        {hydrated && loggedIn ? (
          <>
            {baby && (
              <Link href="/mypage" className="pill hot">
                👶 {baby.name} ▾
              </Link>
            )}
            <Link href="/pricing" className="pill" title="크레딧 충전">
              💎 {credits} 크레딧
            </Link>
            <Link
              href="/mypage"
              className="hidden text-[13.5px] font-semibold text-[#6d6069] hover:text-rose md:block"
            >
              MY
            </Link>
            <button
              onClick={logout}
              className="hidden cursor-pointer text-[12px] text-sub hover:text-rose md:block"
            >
              로그아웃
            </button>
            <Link
              href="/admin"
              className="hidden text-[12px] text-sub hover:text-rose md:block"
              title="운영 콘솔 (내부)"
            >
              ⚙
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[13.5px] font-semibold">
              로그인
            </Link>
            <Link href="/login" className="cta">
              무료로 시작하기
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
