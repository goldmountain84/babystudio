"use client";

// S12-C 테마 라이프사이클 CMS — 상태기계가 서버로 이동 (theme_stages·checklists)
// 게이트·GA 리드 승인은 API가 강제. 시즌 캘린더·랭킹 튜너는 데모 UI.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { THEME_APPS } from "@/lib/data";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import PhotoArt from "@/components/PhotoArt";

interface Board {
  stages: Record<string, string>;
  checklist: Record<string, boolean[]>;
  items: string[];
  lifecycle: string[];
}

const SEASON_CAL = [
  { month: "9월", theme: "단풍 소풍", state: "draft" },
  { month: "10월", theme: "핼러윈 꼬마 호박", state: "내부QA" },
  { month: "11월", theme: "첫눈", state: "soft-launch (D-7)" },
  { month: "12월", theme: "크리스마스", state: "draft · 멤버십 얼리액세스 예약" },
  { month: "2월", theme: "설날 세배", state: "내부QA (D-21)" },
];

export default function ThemeCms() {
  const { role, hydrated } = useAdmin();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [weights, setWeights] = useState({ season: 3, hot: 2, fresh: 1 });
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminApi("/themes-board", role);
    if (r.ok) { setBoard(r.body as unknown as Board); setError(null); }
    else setError((r.body as { message?: string }).message ?? "로드 실패");
  }, [role]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  };

  const act = async (themeId: string, action: "check" | "advance", idx?: number) => {
    const r = await adminApi("/themes-board", role, {
      method: "POST",
      body: JSON.stringify({ themeId, action, idx }),
    });
    if (!r.ok && action === "advance") flash(`🚫 ${(r.body as { message?: string }).message}`);
    if (r.ok && action === "advance") {
      flash(`✓ ${(r.body as { next: string }).next}(으)로 전이 — 서버 감사로그 기록`);
    }
    await load();
  };

  if (!hydrated) return null;

  const stageOf = (id: string) => board?.stages[id] ?? "GA";
  const sel = THEME_APPS.find((a) => a.id === selId);
  const selStage = sel ? stageOf(sel.id) : null;
  const selChecks = sel ? (board?.checklist[sel.id] ?? []) : [];
  const lifecycle = board?.lifecycle ?? [];
  const selNext =
    selStage && lifecycle.indexOf(selStage) < lifecycle.length - 1
      ? lifecycle[lifecycle.indexOf(selStage) + 1]
      : null;
  const gaCount = THEME_APPS.filter((a) => stageOf(a.id) === "GA").length;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">🗂 테마 라이프사이클 CMS</h1>
        <span className="text-[11.5px] text-sub">
          서버 상태기계(TC-01) — 체크리스트 게이트·GA 리드 승인은 API가 강제 · 현재 역할: <b>{role}</b>
        </span>
      </div>

      {error && <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">🔴 {error}</div>}

      <section className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <b className="text-[13px]">라이프사이클 보드 — GA {gaCount}종 운영 중 · 카드를 누르면 전이 패널이 열려요</b>
        <div className="mt-3 flex gap-3" style={{ minWidth: 900 }}>
          {lifecycle.map((stage) => {
            const items = THEME_APPS.filter((a) => stageOf(a.id) === stage);
            return (
              <div key={stage} className="w-[150px] flex-none rounded-xl bg-cream p-2.5">
                <p className="mb-2 text-[11px] font-extrabold text-sub">
                  {stage} <span className="num font-medium">({items.length})</span>
                </p>
                <div className="flex flex-col gap-2">
                  {items.slice(0, 4).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelId(a.id === selId ? null : a.id)}
                      className={`block cursor-pointer text-left ${selId === a.id ? "rounded-lg ring-2 ring-rose" : ""}`}
                    >
                      <PhotoArt gradient={a.gradient} caption={a.name} className="h-[52px] !rounded-lg text-[10px]" />
                    </button>
                  ))}
                  {items.length > 4 && <p className="text-center text-[10.5px] text-sub">+{items.length - 4}종</p>}
                  {items.length === 0 && <p className="py-3 text-center text-[10.5px] text-[#c5bac2]">—</p>}
                </div>
              </div>
            );
          })}
        </div>

        {sel && selStage && board && (
          <div className="fadeup mt-4 rounded-xl border border-rose/40 bg-[#fdf8f5] px-5 py-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <b className="text-[13px]">{sel.name}</b>
              <span className="vs vs-canary">{selStage}</span>
              {selNext && (
                <>
                  <span className="text-[11px] text-sub">→</span>
                  <span className="vs vs-draft">{selNext}</span>
                </>
              )}
              <Link href={`/admin/prompts/${sel.id}`} className="pill ml-auto !py-1 text-[10.5px]">
                프롬프트 체인 열기 →
              </Link>
            </div>
            <p className="mt-2 text-[11px] font-bold text-sub">
              전이 게이트 체크리스트 ({selChecks.filter(Boolean).length}/{board.items.length}) — 서버 저장
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
              {board.items.map((item, i) => (
                <label key={item} className="flex cursor-pointer items-center gap-1.5 text-[12px]">
                  <input
                    type="checkbox"
                    checked={selChecks[i] ?? false}
                    onChange={() => void act(sel.id, "check", i)}
                    className="accent-rose"
                  />
                  {item}
                </label>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                className="cta !py-1.5 !text-[11.5px]"
                disabled={!selNext}
                onClick={() => void act(sel.id, "advance")}
              >
                {selNext ? `${selNext}(으)로 전이` : "최종 단계"}
              </button>
              <span className="text-[10.5px] text-sub">
                미완 항목은 서버가 422로 거부 · GA 전이는 리드 역할 필요 (403)
              </span>
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">시즌 캘린더 (TC-02)</b>
          <p className="mt-1 text-[11px] text-sub">배치하면 노출 시작·종료·D-n 뱃지·얼리액세스가 자동 스케줄링됩니다</p>
          <div className="mt-3 flex flex-col gap-2">
            {SEASON_CAL.map((s) => (
              <div key={s.month} className="flex items-center gap-3 rounded-lg border border-line px-3.5 py-2.5 text-[12.5px]">
                <b className="num w-9 text-[#b07a1e]">{s.month}</b>
                <span className="font-bold">{s.theme}</span>
                <span className="ml-auto text-[11px] text-sub">{s.state}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">노출 랭킹 튜너 (TC-03)</b>
          <p className="mt-1 text-[11px] text-sub">
            정렬 점수 = 시즌×{weights.season} + 인기×{weights.hot} + 신규×{weights.fresh} · 트렌딩은 7일 실행수 실집계(H-03)
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {(
              [["season", "시즌 가중치"], ["hot", "인기 가중치"], ["fresh", "신규 가중치"]] as const
            ).map(([key, label]) => (
              <label key={key} className="text-[12px] font-bold text-sub">
                {label} <b className="num text-ink">{weights[key]}</b>
                <input
                  type="range" min={0} max={5} value={weights[key]}
                  onChange={(e) => setWeights((w) => ({ ...w, [key]: Number(e.target.value) }))}
                  className="mt-1 w-full accent-rose"
                />
              </label>
            ))}
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
