"use client";

// S12-A 대시보드 — 전면 실데이터 (경보=서버 규칙 엔진, KPI·주간 차트=DB 실집계)

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";

const KRW = (n: number) => `₩${n.toLocaleString()}`;

interface LiveStats {
  jobs: { total: number; failed: number; active: number };
  revenue: { krw: number; orders: number };
  credits: { issued: number; spent: number };
  costUsd: number;
  modPending: number;
  users: number;
  audit: { actor: string; action: string; target: string; created_at: number }[];
  kpi: { avgSimilarity: number; c2paCoverage: number; conversion: number; buyers: number };
  weekly: { day: string; v: number }[];
  canaries: { theme_id: string; id: string; canary_pct: number }[];
  alerts: { id: string; severity: "crit" | "warn" | "info"; text: string; href?: string }[];
}

export default function AdminDashboard() {
  const { role, hydrated } = useAdmin();
  const [live, setLive] = useState<LiveStats | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    void adminApi("/stats", role).then((r) => {
      if (r.ok) setLive(r.body as unknown as LiveStats);
    });
  }, [hydrated, role]);

  const alerts = (live?.alerts ?? []).filter((a) => !dismissed.includes(a.id));
  const maxJobs = Math.max(...(live?.weekly ?? []).map((d) => d.v), 1);
  const failRate = live && live.jobs.total > 0
    ? Math.round((live.jobs.failed / live.jobs.total) * 1000) / 10
    : 0;
  const margin = live && live.revenue.krw > 0
    ? Math.round((1 - (live.costUsd * 1400) / live.revenue.krw) * 100)
    : null;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      {/* 경보 — 서버 규칙 엔진 (DA-01) */}
      {alerts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {alerts.map((a) => (
            <div key={a.id} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[12.5px] alert-${a.severity}`}>
              <b className="shrink-0">
                {a.severity === "crit" ? "🔴 긴급" : a.severity === "warn" ? "🟡 주의" : "🔵 안내"}
              </b>
              <span className="flex-1">{a.text}</span>
              {a.href && <Link href={a.href} className="pill !py-1 text-[11px]">바로가기 →</Link>}
              <button
                onClick={() => setDismissed((d) => [...d, a.id])}
                className="cursor-pointer text-sub hover:text-ink"
                aria-label="경보 닫기"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 북극성 KPI — 전부 DB 실집계 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="stat">
          <span className="lb">24h 생성 잡</span>
          <p className="v">{live ? live.jobs.total.toLocaleString() : "…"}</p>
          <p className="d">
            진행 {live?.jobs.active ?? 0} · 실패율 {failRate}% (목표 &lt;2%)
          </p>
        </div>
        <div className="stat">
          <span className="lb">24h 원가 / 매출</span>
          <p className="v">{live ? `$${live.costUsd}` : "…"}</p>
          <p className="d">
            매출 {live ? KRW(live.revenue.krw) : "…"} ({live?.revenue.orders ?? 0}건)
            {margin != null && ` · 마진 ~${margin}%`}
          </p>
        </div>
        <div className="stat">
          <span className="lb">구매 전환율</span>
          <p className="v">{live ? `${live.kpi.conversion}%` : "…"}</p>
          <p className="d">
            구매자 {live?.kpi.buyers ?? 0} / 사용자 {live?.users ?? 0} · 목표 8%
          </p>
        </div>
        <div className="stat">
          <span className="lb">품질·신뢰</span>
          <p className="v">{live ? live.kpi.avgSimilarity.toFixed(2) : "…"}</p>
          <p className="d">
            노출 컷 유사도 평균 (목표 0.82+) · C2PA {live?.kpi.c2paCoverage ?? "…"}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* 주간 잡 — 실집계 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center">
            <b className="text-[13px]">최근 7일 생성 잡 (실집계)</b>
            <button
              className="pill ml-auto !py-1 text-[10.5px]"
              title="원장 체인 검증 + 24h 미결 hold 반환 (리드 전용)"
              onClick={async () => {
                const r = await adminApi("/reconcile", role, { method: "POST" });
                if (r.ok) {
                  const b = r.body as { usersChecked: number; chainsBroken: string[]; staleHoldsRefunded: number };
                  setReconcileMsg(`✓ 사용자 ${b.usersChecked} 검증 · 파손 ${b.chainsBroken.length} · 반환 ${b.staleHoldsRefunded}`);
                } else {
                  setReconcileMsg(`🚫 ${(r.body as { message?: string }).message}`);
                }
              }}
            >
              🔄 리컨실
            </button>
            {reconcileMsg && <span className="num ml-2 text-[10.5px] text-sub">{reconcileMsg}</span>}
          </div>
          <div className="bars" role="img" aria-label="최근 7일 일별 생성 잡 수">
            {(live?.weekly ?? []).map((d, i, arr) => (
              <div key={i} className="bar">
                <span className="tip">{d.v.toLocaleString()} 잡</span>
                {i === arr.length - 1 && (
                  <span className="text-[10px] font-bold text-rose-d num">{d.v.toLocaleString()}</span>
                )}
                <i
                  className="fill"
                  style={{
                    height: `${Math.max(2, Math.round((d.v / maxJobs) * 100))}%`,
                    opacity: i === arr.length - 1 ? 1 : 0.55,
                  }}
                />
                <span className="dl">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-sub">
            SQLite jobs 테이블 일별 집계 · 크레딧 발행 {live?.credits.issued ?? 0}C / 소진 {live?.credits.spent ?? 0}C
          </p>
        </section>

        {/* 운영 큐 — 실데이터 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">오늘의 운영 큐</b>
          <div className="mt-3 flex flex-col gap-2.5 text-[12.5px]">
            <Link href="/admin/moderation" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🛡 모더레이션 대기</span>
              <b className={`num ${(live?.modPending ?? 0) > 0 ? "text-rose-d" : ""}`}>
                {live?.modPending ?? "…"}건 · SLA 2h
              </b>
            </Link>
            <Link href="/admin/experiments" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🧪 카나리 진행</span>
              <b>{live ? (live.canaries.length > 0 ? live.canaries.map((c) => c.theme_id).join(", ") : "없음") : "…"}</b>
            </Link>
            <Link href="/admin/themes" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🗂 테마 라이프사이클</span>
              <b>보드 열기 →</b>
            </Link>
            <Link href="/admin/users" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>👤 활성 사용자</span>
              <b className="num">{live?.users ?? "…"}명</b>
            </Link>
          </div>
        </section>
      </div>

      {/* 감사로그 — 서버 */}
      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <b className="text-[13px]">🔏 감사로그 (append-only · 서버)</b>
        <div className="mt-3 overflow-x-auto">
          <table className="atable">
            <thead>
              <tr><th>시각</th><th>행위자</th><th>행위</th><th>대상</th></tr>
            </thead>
            <tbody>
              {(live?.audit ?? []).map((e, i) => (
                <tr key={i}>
                  <td className="num whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("ko-KR", {
                      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td>{e.actor}</td>
                  <td>{e.action}</td>
                  <td className="mono">{e.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
