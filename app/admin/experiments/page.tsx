"use client";

// S12-D 실험 플랫폼 — BE-3부터 서버 파생 (카나리 = 프롬프트 실험, 이력 = 감사로그)

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import { getApp } from "@/lib/data";

interface RunningRow {
  theme_id: string;
  canary_id: string; canary_pct: number; canary_best: number | null; canary_samples: number | null;
  live_id: string; live_best: number | null; live_samples: number | null;
}
interface HistoryRow { actor: string; action: string; target: string; created_at: number }
interface Fixture {
  name: string; kind: string; metricName: string; minSamples: number; note: string;
  variants: { name: string; traffic: number; metric: number; samples: number }[];
}

export default function Experiments() {
  const { role, hydrated } = useAdmin();
  const [data, setData] = useState<{ running: RunningRow[]; history: HistoryRow[]; fixtures: Fixture[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminApi("/experiments", role);
    if (r.ok) { setData(r.body as never); setError(null); }
    else setError((r.body as { message?: string }).message ?? "로드 실패");
  }, [role]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  const tick = async (themeId: string) => {
    const r = await adminApi(`/themes/${themeId}/canary-tick`, role, { method: "POST" });
    if (!r.ok) setToast(`🚫 ${(r.body as { message?: string }).message}`);
    else {
      const b = r.body as { promoted: boolean; stopped: boolean; samples: number };
      setToast(b.promoted ? `🎉 자동 승격 (표본 ${b.samples})` : b.stopped ? "⛔ 자동 중단 — 열세" : `표본 ${b.samples}/200`);
    }
    setTimeout(() => setToast(null), 2600);
    await load();
  };

  if (!hydrated) return null;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">🧪 실험 플랫폼</h1>
        <span className="text-[11.5px] text-sub">
          프롬프트 실험 = 서버 카나리(version_metrics) · 승격 판정은 배치가 자동 실행 (PC-06)
        </span>
      </div>

      {error && <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">🔴 {error}</div>}

      <div className="mt-4 flex flex-col gap-4">
        {/* 진행 중 (서버) */}
        {(data?.running ?? []).map((ex) => {
          const app = getApp(ex.theme_id);
          const cBest = ex.canary_best ?? 0;
          const lBest = ex.live_best ?? 0;
          const max = Math.max(cBest, lBest, 1);
          const samples = ex.canary_samples ?? 0;
          return (
            <section key={ex.theme_id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="vs vs-canary">running</span>
                <b className="text-[13.5px]">{app?.name ?? ex.theme_id} — {ex.live_id.split("@")[1]}(live) vs {ex.canary_id.split("@")[1]}(canary {ex.canary_pct}%)</b>
                <span className="pill !py-0.5 text-[10.5px]">프롬프트</span>
                <span className="num ml-auto text-[11.5px] text-sub">
                  베스트컷 선택률 % · 카나리 표본 {samples}/200
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { name: ex.live_id.split("@")[1], metric: lBest, n: ex.live_samples ?? 0, best: lBest >= cBest },
                  { name: ex.canary_id.split("@")[1], metric: cBest, n: samples, best: cBest > lBest },
                ].map((v) => (
                  <div key={v.name} className="flex items-center gap-3 text-[12px]">
                    <span className="w-[70px] font-bold">{v.name}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-cream">
                      <i className="block h-full rounded-r" style={{ width: `${(v.metric / max) * 100}%`, background: v.best ? "var(--color-rose)" : "#d9c9d2" }} />
                    </div>
                    <b className="num w-[72px] text-right">{v.metric}%{v.best && " ★"}</b>
                    <span className="num w-[88px] text-right text-[11px] text-sub">n={v.n.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <button className="cta !py-1.5 !text-[11.5px]" onClick={() => tick(ex.theme_id)}>배치 틱 실행 (+50)</button>
                <Link href={`/admin/prompts/${ex.theme_id}`} className="pill !py-1 text-[11px]">프롬프트 체인 →</Link>
                <span className="text-[10.5px] text-sub">표본 200 + 우세 시 서버가 자동 승격</span>
              </div>
            </section>
          );
        })}
        {data && data.running.length === 0 && (
          <section className="rounded-2xl border border-line bg-white p-8 text-center text-[12.5px] text-sub">
            진행 중인 카나리가 없어요 — 프롬프트 컨트롤 센터에서 draft → 승인 → 카나리를 시작하면 여기에 실험으로 나타납니다.
          </section>
        )}

        {/* 가격 실험 픽스처 */}
        {(data?.fixtures ?? []).map((ex) => {
          const best = [...ex.variants].sort((a, b) => b.metric - a.metric)[0];
          const max = Math.max(...ex.variants.map((v) => v.metric));
          return (
            <section key={ex.name} className="rounded-2xl border border-line bg-white p-5 opacity-90">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="vs vs-review">fixture</span>
                <b className="text-[13.5px]">{ex.name}</b>
                <span className="pill !py-0.5 text-[10.5px]">{ex.kind}</span>
                <span className="num ml-auto text-[11.5px] text-sub">{ex.metricName}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {ex.variants.map((v) => (
                  <div key={v.name} className="flex items-center gap-3 text-[12px]">
                    <span className="w-[90px] font-bold">{v.name}</span>
                    <span className="num w-[64px] text-sub">트래픽 {v.traffic}%</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-cream">
                      <i className="block h-full rounded-r" style={{ width: `${(v.metric / max) * 100}%`, background: v.name === best.name ? "var(--color-rose)" : "#d9c9d2" }} />
                    </div>
                    <b className="num w-[72px] text-right">{v.metric}%{v.name === best.name && " ★"}</b>
                    <span className="num w-[88px] text-right text-[11px] text-sub">n={v.samples.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-sub">{ex.note}</p>
            </section>
          );
        })}

        {/* 승격 이력 (감사로그 파생) */}
        {data && data.history.length > 0 && (
          <section className="overflow-x-auto rounded-2xl border border-line bg-white p-5">
            <b className="text-[13px]">승격·중단 이력 (감사로그 파생)</b>
            <table className="atable mt-3">
              <thead><tr><th>시각</th><th>행위자</th><th>이벤트</th><th>대상</th></tr></thead>
              <tbody>
                {data.history.map((h, i) => (
                  <tr key={i}>
                    <td className="num whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>{h.actor}</td>
                    <td>{h.action}</td>
                    <td className="mono">{h.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
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
