"use client";

// S12-A 대시보드 — 운영자의 홈: 잡·원가·전환·경보·감사로그

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import { DASH } from "@/lib/adminData";

const KRW = (n: number) => `₩${n.toLocaleString()}`;

interface LiveStats {
  jobs: { total: number; failed: number; active: number };
  revenue: { krw: number; orders: number };
  credits: { issued: number; spent: number };
  costUsd: number;
  modPending: number;
  users: number;
  audit: { actor: string; action: string; target: string; created_at: number }[];
}

export default function AdminDashboard() {
  const { alerts, role, dismissAlert, hydrated } = useAdmin();
  const [live, setLive] = useState<LiveStats | null>(null);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);
  const maxJobs = Math.max(...DASH.weeklyJobs.map((d) => d.v));

  // BE-2: 실데이터 — GET /api/admin/stats (24h 윈도)
  useEffect(() => {
    if (!hydrated) return;
    void adminApi("/stats", role).then((r) => {
      if (r.ok) setLive(r.body as unknown as LiveStats);
    });
  }, [hydrated, role]);

  const pendingMod = live?.modPending ?? 0;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      {/* 경보 (PC-09·원가 경보) */}
      {hydrated && alerts.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-[12.5px] alert-${a.severity}`}
            >
              <b className="shrink-0">
                {a.severity === "crit" ? "🔴 긴급" : a.severity === "warn" ? "🟡 주의" : "🔵 안내"}
              </b>
              <span className="flex-1">{a.text}</span>
              {a.href && (
                <Link href={a.href} className="pill !py-1 text-[11px]">
                  바로가기 →
                </Link>
              )}
              <button
                onClick={() => dismissAlert(a.id)}
                className="cursor-pointer text-sub hover:text-ink"
                aria-label="경보 닫기"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 라이브 백엔드 (BE-2 실데이터) */}
      <div className="mb-3 rounded-2xl border border-[#2b8a5e]/30 bg-[#f4fbf7] px-5 py-3.5">
        <b className="text-[12px] text-[#2b8a5e]">● 라이브 백엔드 (24h · SQLite 원장 집계)</b>
        {live ? (
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <p className="num mt-1 flex-1 text-[12.5px]">
              잡 <b>{live.jobs.total}</b>건 (진행 {live.jobs.active} · 실패 {live.jobs.failed}) ·
              생성 원가 <b>${live.costUsd}</b> · 매출 <b>{KRW(live.revenue.krw)}</b> ({live.revenue.orders}건) ·
              크레딧 발행 <b>{live.credits.issued}C</b> / 소진 {live.credits.spent}C ·
              사용자 <b>{live.users}</b> · 모더레이션 대기{" "}
              <b className={pendingMod > 0 ? "text-rose-d" : ""}>{pendingMod}건</b>
            </p>
            <button
              className="pill !py-1 text-[10.5px]"
              title="원장 체인 검증 + 24h 미결 hold 반환 (리드 전용)"
              onClick={async () => {
                const r = await adminApi("/reconcile", role, { method: "POST" });
                if (r.ok) {
                  const b = r.body as { usersChecked: number; chainsBroken: string[]; staleHoldsRefunded: number };
                  setReconcileMsg(`✓ 사용자 ${b.usersChecked} 검증 · 체인 파손 ${b.chainsBroken.length} · 미결 hold 반환 ${b.staleHoldsRefunded}`);
                } else {
                  setReconcileMsg(`🚫 ${(r.body as { message?: string }).message}`);
                }
              }}
            >
              🔄 리컨실 실행
            </button>
            {reconcileMsg && <span className="num text-[11px] text-sub">{reconcileMsg}</span>}
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-sub">집계 로드 중…</p>
        )}
      </div>

      {/* 북극성 KPI 타일 (목표 지표 — 데모 수치) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="stat">
          <span className="lb">오늘 생성 잡</span>
          <p className="v">{DASH.todayJobs.toLocaleString()}</p>
          <p className="d">실패율 {DASH.failRate}% · 큐 p50 {DASH.queueP50}s / p95 {DASH.queueP95}s</p>
        </div>
        <div className="stat">
          <span className="lb">오늘 원가 / 매출</span>
          <p className="v">{KRW(DASH.todayCost)}</p>
          <p className="d">
            매출 {KRW(DASH.todayRevenue)} · 마진율{" "}
            {Math.round((1 - DASH.todayCost / DASH.todayRevenue) * 100)}%
          </p>
        </div>
        <div className="stat">
          <span className="lb">무료→유료 전환율</span>
          <p className="v">{DASH.conversion}%</p>
          <p className="d">목표 8% · 유사도 평균 {DASH.simScore} (목표 0.82+)</p>
        </div>
        <div className="stat">
          <span className="lb">신뢰 지표</span>
          <p className="v">{DASH.c2paCoverage}%</p>
          <p className="d">C2PA 커버리지 · 삭제 이행 평균 {DASH.deleteSlaMin}분 (SLA 60분)</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* 주간 잡 추이 — 단일 시리즈 바 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">최근 7일 생성 잡</b>
          <div className="bars" role="img" aria-label="최근 7일 일별 생성 잡 수">
            {DASH.weeklyJobs.map((d, i) => (
              <div key={d.day} className="bar">
                <span className="tip">{d.v.toLocaleString()} 잡</span>
                {i === DASH.weeklyJobs.length - 1 && (
                  <span className="text-[10px] font-bold text-rose-d num">
                    {d.v.toLocaleString()}
                  </span>
                )}
                <i
                  className="fill"
                  style={{
                    height: `${Math.round((d.v / maxJobs) * 100)}%`,
                    opacity: i === DASH.weeklyJobs.length - 1 ? 1 : 0.55,
                  }}
                />
                <span className="dl">{d.day}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10.5px] text-sub">
            주말(토·일) 피크 — 기념일 촬영 수요 패턴. 마우스 오버로 일별 수치 확인.
          </p>
        </section>

        {/* 오늘의 할 일 */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">오늘의 운영 큐</b>
          <div className="mt-3 flex flex-col gap-2.5 text-[12.5px]">
            <Link href="/admin/moderation" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🛡 모더레이션 대기</span>
              <b className={`num ${pendingMod > 0 ? "text-rose-d" : ""}`}>{pendingMod}건 · SLA 2h</b>
            </Link>
            <Link href="/admin/prompts" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🎛 카나리 진행 중</span>
              <b>dol-hanbok v15 (10%)</b>
            </Link>
            <Link href="/admin/themes" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🗓 시즌 스케줄</span>
              <b>설날 세배 D-21</b>
            </Link>
            <Link href="/admin/experiments" className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5 hover:border-rose">
              <span>🧪 실험 진행</span>
              <b>2건 running</b>
            </Link>
          </div>
        </section>
      </div>

      {/* 감사로그 — BE-2부터 서버 audit_log */}
      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <b className="text-[13px]">🔏 감사로그 (append-only · 서버)</b>
        <span className="ml-2 text-[11px] text-sub">
          어드민·시스템의 모든 쓰기 행위가 기록됩니다 — 위·변조 불가 (§1.5)
        </span>
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
              {live && live.audit.length === 0 && (
                <tr><td colSpan={4} className="text-center text-sub">아직 기록이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
