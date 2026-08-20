"use client";

// S05 테마 앱 실행 시트 — 원탭 생성 (딤 배경 오버레이 시트)

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BADGE_CLASS, BADGE_LABEL, getApp } from "@/lib/data";
import { useStore } from "@/lib/store";
import PhotoArt from "@/components/PhotoArt";

export default function AppSheet({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const app = getApp(id);
  const { hydrated, loggedIn, baby, credits, freeCutsLeft, member, startJob } =
    useStore();

  const [outfit, setOutfit] = useState<string | undefined>(undefined);
  const [background, setBackground] = useState<string | undefined>(undefined);
    const [showAdvanced, setShowAdvanced] = useState(false);
  const [notEnough, setNotEnough] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (!app) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">존재하지 않는 테마 앱이에요.</p>
        <Link href="/studio" className="cta mt-4">
          스튜디오로 돌아가기
        </Link>
      </main>
    );
  }

  const totalCredits = app.credits;
  const isFree = app.credits === 0;
  const selOutfit = outfit ?? app.options.outfit?.[0];
  const selBg = background ?? app.options.background?.[0];

  const run = async () => {
    if (!loggedIn) return router.push("/login");
    if (!baby?.trained) return router.push("/onboarding");
    if (app.memberOnly && !member) return router.push("/pricing"); // 서버도 재검증 (BE-4)
    if (!isFree && credits < totalCredits) {
      setNotEnough(true);
      return;
    }
    if (isFree && freeCutsLeft <= 0) {
      setNotEnough(true);
      return;
    }
    setBusy(true);
    setServerError(null);
    // 실제 API: POST /api/jobs — 서버가 hold 후 큐에 접수 (§12 매핑)
    const r = await startJob(app.id, {
      outfit: selOutfit,
      background: selBg,
      credits: app.credits,
    });
    if (r.ok && r.jobId) {
      router.push(`/studio/generate/${r.jobId}`);
    } else {
      setBusy(false);
      if (r.error?.includes("부족")) setNotEnough(true);
      else setServerError(r.error ?? "생성 접수에 실패했어요");
    }
  };

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[rgba(51,43,51,.55)] px-4 py-10">
      <div className="fadeup mx-auto grid max-w-[840px] overflow-hidden rounded-[22px] bg-white shadow-[0_30px_80px_rgba(0,0,0,.3)] md:grid-cols-[1.05fr_1fr]">
        {/* 좌: 루핑 샘플 영상 */}
        <PhotoArt
          gradient={app.gradient}
          emoji={`👶${app.emoji}`}
          caption="샘플 결과 영상 — 음소거 자동 루프"
          video={app.hasVideo}
          emojiSize={64}
          className="min-h-[280px] !rounded-none md:min-h-[430px]"
        >
          <div className="absolute inset-x-3.5 bottom-3.5 flex gap-2">
            <div className={`ph ${app.gradient} h-[54px] w-[54px] border-2 border-white text-lg`}>📷</div>
            <div className={`ph ${app.gradient} h-[54px] w-[54px] border-2 border-white/50 text-lg opacity-80`}>📷</div>
            <div className={`ph ${app.gradient} h-[54px] w-[54px] border-2 border-white/50 text-lg opacity-80`}>▶</div>
          </div>
        </PhotoArt>

        {/* 우: 실행 패널 */}
        <div className="px-7 py-7">
          <button
            onClick={() => router.back()}
            className="float-right cursor-pointer text-lg text-sub hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
          <div className="flex gap-1.5">
            {app.badges.map((b) => (
              <span key={b} className={`badge ${BADGE_CLASS[b]}`}>
                {BADGE_LABEL[b]}
              </span>
            ))}
          </div>
          <h2 className="serif mt-3 mb-1.5 text-[25px] font-bold">{app.name}</h2>
          <p className="text-[13px] text-sub">
            {baby ? app.desc.replace("아기", `${baby.name}의`) : app.desc}
          </p>

          <button onClick={run} disabled={busy} className="cta big mt-5 mb-2.5 w-full">
            {busy
              ? "접수 중…"
              : `⚡ 바로 만들기 — ${isFree ? `무료 ${app.cuts}컷` : `${totalCredits} 크레딧`}`}
          </button>
          {serverError && (
            <p className="mb-2 text-center text-[11.5px] font-bold text-rose-d">
              {serverError}
            </p>
          )}
          <p className="text-center text-[11.5px] text-[#a99ba5]">
            {hydrated && (
              <>
                {isFree
                  ? `이번 달 무료 ${freeCutsLeft}회 남음`
                  : `보유 ${credits}C → 생성 후 ${credits - totalCredits}C`}{" "}
                · 실패 시 자동 환불 · 약 1~3분
              </>
            )}
          </p>

          {notEnough && (
            <div className="mt-3 rounded-xl border border-rose bg-blush px-4 py-3 text-center text-[12px]">
              {isFree ? (
                <>이번 달 무료 컷을 모두 사용했어요.</>
              ) : (
                <>
                  크레딧이 <b>{totalCredits - credits}C</b> 부족해요.
                </>
              )}
              <Link href="/pricing" className="cta mt-2 !py-1.5 !text-[11.5px]">
                💎 크레딧 충전하기
              </Link>
            </div>
          )}

          {/* 고급 옵션 (접힘 기본 — 원탭 우선) */}
          <div className="mt-4 border-t border-line pt-3.5">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="cursor-pointer text-[12.5px] font-bold text-[#6d6069]"
            >
              {showAdvanced ? "▴" : "▾"} 고급 옵션
            </button>
            {showAdvanced && (
              <div className="fadeup mt-2">
                {app.options.outfit && (
                  <>
                    <p className="mb-1 text-xs text-sub">의상</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.options.outfit.map((o) => (
                        <button
                          key={o}
                          className={`pill ${selOutfit === o ? "sel" : ""}`}
                          onClick={() => setOutfit(o)}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {app.options.background && (
                  <>
                    <p className="mb-1 mt-2.5 text-xs text-sub">배경</p>
                    <div className="flex flex-wrap gap-1.5">
                      {app.options.background.map((b) => (
                        <button
                          key={b}
                          className={`pill ${selBg === b ? "sel" : ""}`}
                          onClick={() => setBackground(b)}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {!isFree && (
                  <p className="mt-2.5 text-[11px] text-sub">
                    결과물: 사진 {app.cuts}컷 ({app.credits}C) · 영상 변환은
                    완성 후 결과 갤러리 → 영상 스튜디오에서
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[#a99ba5]">
            같은 테마도 매번 다른 컷이 나와요 · 생성물에는 AI 표시(C2PA)가
            포함돼요 · 생성: GPT 이미지 · 1K
          </p>
        </div>
      </div>
    </main>
  );
}
