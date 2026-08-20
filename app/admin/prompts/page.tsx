"use client";

// S12-B1 프롬프트 컨트롤 센터 목록 — BE-2부터 서버 API (prompt_versions + version_metrics)

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import { getApp } from "@/lib/data";

interface OverviewRow {
  theme_id: string;
  id: string;
  status: "live" | "canary";
  canary_pct: number | null;
  best_cut: number | null;
  regen: number | null;
  cost: number | null;
  samples: number | null;
  engine: string | null;
}

export default function PromptsIndex() {
  const { role, hydrated } = useAdmin();
  const [rows, setRows] = useState<OverviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    void adminApi("/prompts-overview", role).then((r) => {
      if (r.ok) setRows((r.body as { rows: OverviewRow[] }).rows);
      else setError((r.body as { message?: string }).message ?? "로드 실패");
    });
  }, [hydrated, role]);

  if (!hydrated) return null;

  const themes = new Map<string, { live?: OverviewRow; canary?: OverviewRow }>();
  for (const r of rows ?? []) {
    const t = themes.get(r.theme_id) ?? {};
    t[r.status] = r;
    themes.set(r.theme_id, t);
  }
  // 급락 우선 정렬
  const sorted = [...themes.entries()].sort(
    (a, b) => (a[1].live?.best_cut ?? 100) - (b[1].live?.best_cut ?? 100)
  );

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">🎛 프롬프트 컨트롤 센터</h1>
        <span className="text-[11.5px] text-sub">
          서버 버전 체인(BE-2) · 지표는 version_metrics 집계 · 모든 변경은 린트 → 4-eyes → 카나리를 거쳐 live
        </span>
      </div>

      {error && <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">🔴 {error}</div>}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-5">
        <table className="atable">
          <thead>
            <tr>
              <th>테마</th><th>live</th><th>카나리</th>
              <th>베스트컷</th><th>재생성</th><th>컷당 원가</th><th>표본</th><th>엔진</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([themeId, t]) => {
              const app = getApp(themeId);
              const low = (t.live?.best_cut ?? 100) < 50;
              return (
                <tr key={themeId}>
                  <td>
                    <b>{app?.name ?? themeId}</b>
                    <br /><span className="mono text-[10.5px] text-sub">{themeId}</span>
                  </td>
                  <td>{t.live ? <><span className="vs vs-live">live</span> <b className="mono">{t.live.id.split("@")[1]}</b></> : "—"}</td>
                  <td>{t.canary ? <><span className="vs vs-canary">canary {t.canary.canary_pct}%</span> <b className="mono">{t.canary.id.split("@")[1]}</b></> : "—"}</td>
                  <td className="num">
                    {t.live?.best_cut != null ? (
                      <b className={low ? "text-[#c0392b]" : ""}>{t.live.best_cut}%{low && " ⚠ 급락"}</b>
                    ) : "—"}
                  </td>
                  <td className="num">{t.live?.regen != null ? `${t.live.regen}%` : "—"}</td>
                  <td className="num">{t.live?.cost != null ? `₩${t.live.cost}` : "—"}</td>
                  <td className="num">{t.live?.samples?.toLocaleString() ?? "—"}</td>
                  <td className="text-[11px]">{t.live?.engine ?? "—"}</td>
                  <td>
                    <Link href={`/admin/prompts/${themeId}`} className="pill !py-1 text-[11px]">열기 →</Link>
                  </td>
                </tr>
              );
            })}
            {rows === null && !error && (
              <tr><td colSpan={9} className="py-6 text-center text-sub">서버에서 로드 중…</td></tr>
            )}
          </tbody>
        </table>
        <p className="mt-3 text-[11px] text-sub">
          시드 등록 테마(author 시스템-시드)는 CMS 정식 QA 전까지 기본 템플릿으로 운영 · 프롬프트 원문은 사용자 단말로 전송되지 않습니다
        </p>
      </div>
    </main>
  );
}
