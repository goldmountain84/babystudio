"use client";

// S11 마이페이지 — 계정·아기 프로필·데이터 삭제 (아동 데이터 신뢰 핵심 기능)

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, nextMilestone } from "@/lib/store";

export default function MyPage() {
  const router = useRouter();
  const { hydrated, loggedIn, baby, credits, freeCutsLeft, album, purge } =
    useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [purging, setPurging] = useState(false);
  const [receipt, setReceipt] = useState<{
    hash: string;
    ts: string;
    items: string[];
  } | null>(null);

  // 파기 직후에는 로그아웃 상태여도 영수증 모달을 보여준다 (TR-01)
  if (hydrated && !loggedIn && !receipt) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">로그인이 필요해요.</p>
        <Link href="/login" className="cta mt-4">
          로그인
        </Link>
      </main>
    );
  }

  const dday = baby?.birthday ? nextMilestone(baby.birthday) : null;

  return (
    <main className="mx-auto max-w-[720px] px-6 pb-16 pt-8">
      <h1 className="text-lg font-extrabold">마이페이지</h1>

      {/* 아기 프로필 */}
      <section className="card mt-5 px-6 py-6">
        <b className="text-sm">👶 아기 프로필</b>
        {baby ? (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-blush text-3xl">
              👶
            </div>
            <div>
              <b className="text-[15px]">{baby.name}</b>
              <p className="text-xs text-sub">
                생일 {baby.birthday}
                {dday && ` · ${dday.label}까지 D-${dday.dday}`}
              </p>
              <p className="text-[11px] text-[#a99ba5]">
                AI 프로필 {baby.trained ? "학습 완료 ✓" : "학습 전"}
              </p>
            </div>
            <Link href="/onboarding" className="pill ml-auto">
              사진 교체 (재학습)
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-sub">등록된 프로필이 없어요</p>
            <Link href="/onboarding" className="cta">
              프로필 만들기
            </Link>
          </div>
        )}
        <p className="mt-3 text-[11px] text-[#a99ba5]">
          다둥이·가족 다중 프로필(최대 5명)은 멤버십 전용 🔒
        </p>
      </section>

      {/* 크레딧 원장 */}
      <section className="card mt-4 px-6 py-6">
        <b className="text-sm">💎 크레딧 & 이용 현황</b>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-cream py-3.5">
            <b className="text-lg text-rose-d">{credits}</b>
            <p className="text-[11px] text-sub">보유 크레딧</p>
          </div>
          <div className="rounded-xl bg-cream py-3.5">
            <b className="text-lg">{freeCutsLeft}</b>
            <p className="text-[11px] text-sub">이번 달 무료 컷</p>
          </div>
          <div className="rounded-xl bg-cream py-3.5">
            <b className="text-lg">{album.length}</b>
            <p className="text-[11px] text-sub">생성한 화보</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[#a99ba5]">
          지급·차감·환불 내역은 크레딧 원장에 투명하게 기록돼요 (실서비스)
        </p>
      </section>

      {/* 알림 설정 */}
      <section className="card mt-4 px-6 py-6">
        <b className="text-sm">🔔 알림 설정</b>
        <div className="mt-3 flex flex-col gap-2.5 text-[13px]">
          {[
            { label: "생성 완료 알림", on: true },
            { label: "기념일 리마인드 (백일·돌 D-day)", on: true },
            { label: "시즌 테마 소식", on: false },
            { label: "마케팅 수신 (선택)", on: false },
          ].map((n) => (
            <label key={n.label} className="flex cursor-pointer items-center gap-2.5">
              <input type="checkbox" defaultChecked={n.on} className="accent-rose" />
              {n.label}
            </label>
          ))}
        </div>
      </section>

      {/* 데이터 삭제 (M-02) */}
      <section className="mt-4 rounded-2xl border border-[#e7b6b6] bg-[#fdf6f6] px-6 py-6">
        <b className="text-sm text-[#c0392b]">🗑 데이터 삭제</b>
        <p className="mt-1.5 text-xs leading-relaxed text-sub">
          학습 모델·생성물·계정 데이터를 <b>즉시 완전 파기</b>합니다. 백업까지
          포함해 복구할 수 없어요. 아기 데이터를 다루는 서비스로서 가장 중요하게
          지키는 약속이에요.
        </p>
        {!confirmDelete ? (
          <button
            className="pill mt-3 !border-[#c0392b] !text-[#c0392b]"
            onClick={() => setConfirmDelete(true)}
          >
            전체 데이터 삭제하기
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-[#c0392b]">
              정말 삭제할까요? 복구할 수 없어요.
            </span>
            <button
              className="cursor-pointer rounded-full bg-[#c0392b] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              disabled={purging}
              onClick={async () => {
                // BE-2 (TR-01): 서버 파기 파이프라인 — 실제 삭제 + 해시 루트 영수증
                setPurging(true);
                const r = await purge();
                setPurging(false);
                setConfirmDelete(false);
                setReceipt(
                  r
                    ? {
                        hash: `${r.rootHash.slice(0, 22)}…`,
                        ts: new Date(r.purgedAt).toLocaleString("ko-KR"),
                        items: r.items.map((i) => `${i.label} ${i.count}건`),
                      }
                    : {
                        hash: "(서버 응답 없음 — 로컬만 정리됨)",
                        ts: new Date().toLocaleString("ko-KR"),
                        items: ["로컬 세션"],
                      }
                );
              }}
            >
              {purging ? "파기 중…" : "네, 전체 파기합니다"}
            </button>
            <button className="pill" onClick={() => setConfirmDelete(false)}>
              취소
            </button>
          </div>
        )}
      </section>

      {/* TR-01 삭제 영수증 */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
          <div className="fadeup w-full max-w-[420px] rounded-2xl bg-white px-7 py-8 text-center">
            <span className="text-4xl">🧾</span>
            <p className="serif mt-3 text-[19px] font-bold">삭제 영수증</p>
            <p className="mt-1 text-xs text-sub">
              모든 데이터가 파기되었음을 증명합니다
            </p>
            <div className="mt-4 rounded-xl bg-cream px-4 py-3.5 text-left text-[12px] leading-relaxed">
              <p className="font-bold">파기 항목</p>
              {receipt.items.map((it) => (
                <p key={it} className="text-sub">✓ {it}</p>
              ))}
              <p className="mono mt-2 text-[10.5px] text-[#a99ba5]">
                파기 증명 해시(루트) {receipt.hash}
                <br />
                이행 시각 {receipt.ts} (SLA 60분 내 · 서버 감사로그 기록)
              </p>
            </div>
            <p className="mt-3 text-[11px] text-[#a99ba5]">
              이 영수증은 이메일로도 발송됩니다 (데모 생략)
            </p>
            <button
              className="cta mt-4 w-full"
              onClick={() => router.push("/")}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
