"use client";

// S06 생성 진행 — 서버 잡 상태 폴링 (실서비스: SSE, §12 매핑)
// 단계·진행률·완료·실패(자동 환불)가 전부 서버 판정.

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, type JobServerView } from "@/lib/store";
import { getApp } from "@/lib/data";
import { WAIT_TIPS } from "@/lib/job";

const STAGES = [
  "대기열",
  "화보 생성",
  "품질 게이트 · 유사도 검사",
  "후처리 (업스케일·C2PA)",
] as const;

const STAGE_OF: Record<string, number> = {
  queued: 0,
  running: 1,
  postprocess: 2,
  done: 3,
  failed: 3,
};

export default function GeneratePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const { hydrated, loggedIn, baby, getJob, finishJob } = useStore();
  const [view, setView] = useState<JobServerView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const navigated = useRef(false);

  useEffect(() => {
    const tip = setInterval(() => setTipIdx((i) => (i + 1) % WAIT_TIPS.length), 3500);
    return () => clearInterval(tip);
  }, []);

  // 서버 폴링 (700ms) — 완료·실패 시 정리
  useEffect(() => {
    if (!hydrated || !loggedIn) return;
    let stop = false;
    const poll = async () => {
      const v = await getJob(jobId);
      if (stop) return;
      if (!v) {
        setNotFound(true);
        return;
      }
      setView(v);
      if (v.status === "done" && !navigated.current) {
        navigated.current = true;
        finishJob(jobId);
        setTimeout(() => router.push(`/album/item/${jobId}`), 1200);
        return;
      }
      if (v.status === "failed") {
        finishJob(jobId);
        return;
      }
      setTimeout(poll, 700);
    };
    void poll();
    return () => {
      stop = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, loggedIn, jobId]);

  if (hydrated && !loggedIn) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">로그인이 필요해요.</p>
        <Link href="/login" className="cta mt-4">로그인</Link>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">진행 중인 생성 작업을 찾을 수 없어요.</p>
        <Link href="/studio" className="cta mt-4">스튜디오로 돌아가기</Link>
      </main>
    );
  }

  const app = view?.themeId ? getApp(view.themeId) : undefined;
  const pct = view?.pct ?? 0;
  const stageIdx = view ? (STAGE_OF[view.status] ?? 0) : 0;
  const failed = view?.status === "failed";
  const done = view?.status === "done";

  return (
    <main className="mx-auto max-w-[420px] px-6 py-12">
      <div className="card fadeup px-7 py-10 text-center">
        <div className={failed ? "text-6xl" : "pulse-soft text-6xl"}>
          {failed ? "😢" : done ? "🎉" : "👶👗"}
        </div>
        <p className="serif mt-4 text-[19px] font-bold">
          {failed
            ? "생성에 실패했어요"
            : done
              ? "화보가 완성됐어요!"
              : `${baby?.name ?? "우리 아기"}의 ${app?.name ?? "화보"}를 만들고 있어요`}
        </p>

        {failed ? (
          <>
            <p className="mt-3 text-[12.5px] text-sub">
              크레딧은 자동으로 환불됐어요. 잠시 후 다시 시도해 주세요.
            </p>
            {view?.themeId && (
              <Link href={`/studio/app/${view.themeId}`} className="cta mt-5">
                🔁 다시 시도하기
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] font-bold">
              {STAGES.map((s, i) => (
                <span
                  key={s}
                  className={`rounded-full px-2.5 py-1 ${
                    i < stageIdx || done
                      ? "bg-[#e2f4ea] text-[#2b8a5e]"
                      : i === stageIdx
                        ? "bg-blush text-rose-d"
                        : "bg-cream text-[#c5bac2]"
                  }`}
                >
                  {i < stageIdx || done ? "✓ " : ""}
                  {s}
                </span>
              ))}
            </div>

            <div className="mx-auto mt-5 h-2 w-full overflow-hidden rounded bg-[#f0e4e0]">
              <i
                className="block h-full bg-gradient-to-r from-rose to-[#f0a1bc] transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-sub">
              {done
                ? "결과 갤러리로 이동할게요 ✨"
                : `${pct}% · 완성되면 알림을 보내드려요`}
            </p>

            {stageIdx === 2 && !done && (
              <p className="mt-3 text-[11px] text-sub">
                얼굴 유사도를 검사해 기준(0.82) 미달 컷은 자동으로 다시 만들고
                있어요 — 좋은 컷만 보여드릴게요
              </p>
            )}

            {!done && (
              <Link href="/studio" className="cta ghost mt-6 !text-[12.5px]">
                기다리는 동안 다른 테마 구경하기
              </Link>
            )}
          </>
        )}
      </div>

      {!failed && (
        <div className="fadeup mt-4 rounded-2xl border border-line bg-white px-5 py-3.5 text-center text-[12px] text-sub">
          💡 {WAIT_TIPS[tipIdx]}
        </div>
      )}
    </main>
  );
}
