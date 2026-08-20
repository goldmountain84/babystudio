"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";

export default function SiteNav() {
  const {
    hydrated, loggedIn, baby, credits, member, logout,
    notifications, unreadCount, markNotificationRead,
  } = useStore();
  const [bellOpen, setBellOpen] = useState(false);

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
            {/* BE-4: 알림 센터 (CRM 저니 — 알림톡의 데모 대체) */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="pill relative cursor-pointer"
                aria-label="알림"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[9px] font-extrabold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="fadeup absolute right-0 top-11 z-50 w-[320px] rounded-2xl border border-line bg-white p-3 shadow-[0_18px_44px_rgba(60,40,55,.18)]">
                  <div className="flex items-center px-1 pb-2">
                    <b className="text-[12.5px]">알림</b>
                    {unreadCount > 0 && (
                      <button
                        className="ml-auto cursor-pointer text-[11px] text-sub hover:text-rose"
                        onClick={() => void markNotificationRead()}
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
                    {notifications.length === 0 && (
                      <p className="px-2 py-5 text-center text-[11.5px] text-sub">알림이 없어요</p>
                    )}
                    {notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link ?? "#"}
                        onClick={() => {
                          void markNotificationRead(n.id);
                          setBellOpen(false);
                        }}
                        className={`rounded-xl px-3 py-2 text-left hover:bg-cream ${n.read ? "opacity-55" : ""}`}
                      >
                        <p className="text-[12px] font-bold">
                          {n.type === "dday" ? "🎂 " : n.type === "job_done" ? "✨ " : "🔔 "}
                          {n.title}
                        </p>
                        <p className="text-[11px] text-sub">{n.body}</p>
                      </Link>
                    ))}
                  </div>
                  <p className="mt-2 border-t border-line px-1 pt-2 text-[10px] text-[#a99ba5]">
                    실서비스: 카카오 알림톡 + 웹푸시 (D-30→D-day 저니)
                  </p>
                </div>
              )}
            </div>
            {baby && (
              <Link href="/mypage" className="pill hot">
                👶 {baby.name} {member && "💎"} ▾
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
