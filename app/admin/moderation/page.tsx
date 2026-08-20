"use client";

// S12-E 모더레이션 큐 — BE-2부터 서버 API 기반 (moderation_items 테이블)
// 품질 게이트 하한 근접 잡이 자동 플래그되어 여기로 유입된다 (MD-02).

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";

interface ModItem {
  id: string;
  type: "upload" | "generation" | "report";
  target: string;
  reason: string;
  confidence: number;
  status: "pending" | "approved" | "blocked" | "escalated";
  decided_by: string | null;
  created_at: number;
}

const TYPE_LABEL = { upload: "업로드", generation: "생성물", report: "신고" } as const;

export default function Moderation() {
  const { role, hydrated } = useAdmin();
  const [items, setItems] = useState<ModItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await adminApi("/mod", role);
    if (r.ok) {
      setItems((r.body as { items: ModItem[] }).items);
      setError(null);
    } else {
      setError((r.body as { message?: string }).message ?? "로드 실패");
    }
  }, [role]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  const decide = async (id: string, decision: "approved" | "blocked" | "escalated") => {
    const r = await adminApi(`/mod/${id}/${decision}`, role, { method: "POST" });
    if (r.ok) {
      setToast("✓ 결정이 기록됐어요 (decided_by + 감사로그)");
      await load();
    } else {
      setToast(`🚫 ${(r.body as { message?: string }).message}`);
    }
    setTimeout(() => setToast(null), 2600);
  };

  if (!hydrated) return null;
  const pending = items?.filter((m) => m.status === "pending") ?? [];
  const resolved = items?.filter((m) => m.status !== "pending") ?? [];

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">🛡 모더레이션 큐</h1>
        <span className="text-[11.5px] text-sub">
          서버 큐(BE-2) · 품질 게이트 하한 근접 잡 자동 유입 · 결정 권한: 모더레이터·리드 (서버 강제)
        </span>
      </div>

      {error && (
        <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">
          🔴 {error}
        </div>
      )}

      <section className="mt-4 rounded-2xl border border-line bg-white p-5">
        <b className="text-[13px]">
          대기{" "}
          <span className={`num ${pending.length > 0 ? "text-rose-d" : ""}`}>
            {items ? `${pending.length}건` : "로딩…"}
          </span>{" "}
          <span className="font-medium text-sub">· SLA 2h</span>
        </b>
        <div className="mt-3 flex flex-col gap-2.5">
          {pending.map((m) => (
            <div key={m.id} className="rounded-xl border border-line px-4 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="pill !py-0.5 text-[10.5px]">{TYPE_LABEL[m.type]}</span>
                <b className="mono">{m.id}</b>
                <span className="text-sub">{m.target}</span>
                <span className="num ml-auto text-[11px] text-sub">
                  {m.confidence > 0 && `확신도 ${m.confidence}% · `}
                  {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 text-[12px]">{m.reason}</p>
              {m.type !== "report" && (
                <button
                  className="mt-2 block cursor-pointer"
                  onClick={() => setRevealed((r) => (r.includes(m.id) ? r : [...r, m.id]))}
                  aria-label="플래그 이미지 블러 해제"
                >
                  <div className="relative h-[72px] w-[110px] overflow-hidden rounded-lg">
                    <div
                      className="ph g-bw h-full w-full !rounded-lg"
                      style={{ filter: revealed.includes(m.id) ? "none" : "blur(9px)", transition: "filter .2s" }}
                    >
                      <span style={{ fontSize: 22 }}>📷</span>
                    </div>
                    {!revealed.includes(m.id) && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,.6)]">
                        클릭 해제 · 열람 기록됨
                      </span>
                    )}
                  </div>
                </button>
              )}
              <div className="mt-2 flex gap-2">
                <button className="pill !border-[#2b8a5e] !py-1 text-[11px] !text-[#2b8a5e]" onClick={() => decide(m.id, "approved")}>
                  ✓ 승인 (정상)
                </button>
                <button className="pill !border-[#c0392b] !py-1 text-[11px] !text-[#c0392b]" onClick={() => decide(m.id, "blocked")}>
                  ✕ 차단
                </button>
                <button className="pill !py-1 text-[11px]" onClick={() => decide(m.id, "escalated")}>
                  ↗ 에스컬레이션 (리드·법무)
                </button>
              </div>
            </div>
          ))}
          {items && pending.length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-sub">대기 항목이 없습니다 — SLA 준수 중 ✓</p>
          )}
        </div>
      </section>

      {resolved.length > 0 && (
        <section className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">처리 완료</b>
          <table className="atable mt-3">
            <thead><tr><th>ID</th><th>유형</th><th>대상</th><th>결정</th><th>결정자</th></tr></thead>
            <tbody>
              {resolved.map((m) => (
                <tr key={m.id}>
                  <td className="mono">{m.id}</td>
                  <td>{TYPE_LABEL[m.type]}</td>
                  <td>{m.target}</td>
                  <td>
                    <span className={`vs ${m.status === "approved" ? "vs-live" : m.status === "blocked" ? "vs-review" : "vs-canary"}`}>
                      {m.status === "approved" ? "승인" : m.status === "blocked" ? "차단" : "에스컬레이션"}
                    </span>
                  </td>
                  <td className="mono text-[11px]">{m.decided_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="mt-4 rounded-2xl border border-[#c0392b]/30 bg-[#fdf6f5] px-5 py-4 text-[12px]">
        <b className="text-[#c0392b]">CSAM 대응 프로토콜 (MD-05)</b>
        <p className="mt-1 text-sub">
          탐지 시 즉시 보존·격리 → 지정 담당자(리드) 단독 열람 → 수사기관/NCMEC 신고 → 계정 즉시 차단.
          이 절차는 문서화되어 있으며 훈련은 분기 1회 실시.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
