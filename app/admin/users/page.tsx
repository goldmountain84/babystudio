"use client";

// S12-F 사용자 360 & CS 콘솔 — BE-2부터 서버 API (실사용자·실원장)
// 열람 사유는 서버가 강제(DF-01: view_reason 없으면 400), 100C 초과는 서버 4-eyes(DF-03)

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";

const REASON_CODES = ["실패 보상", "CS 재량 보상", "이벤트 지급", "오지급 회수"];
const VIEW_REASONS = ["CS 문의 대응", "환불 처리", "모더레이션 확인", "결제 오류 조사"];

interface UserRow {
  id: string; name: string; provider: string; created_at: number;
  credits: number | null; jobs: number; baby: string | null;
}
interface User360 {
  user: { id: string; name: string; provider: string; created_at: number };
  babies: { id: string; name: string; birthday: string; trained: number }[];
  jobs: { id: string; theme_id: string; status: string; created_at: number }[];
  credits: number;
  ledger: { delta: number; type: string; reason: string; created_at: number }[];
  ledgerIntegrity: { ok: boolean };
}

export default function UsersConsole() {
  const { role, hydrated } = useAdmin();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<User360 | null>(null);
  const [pendingView, setPendingView] = useState<string | null>(null);
  const [delta, setDelta] = useState(9);
  const [reason, setReason] = useState(REASON_CODES[0]);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2800);
  };

  const loadList = useCallback(async () => {
    const r = await adminApi("/users", role);
    if (r.ok) { setUsers((r.body as { users: UserRow[] }).users); setError(null); }
    else setError((r.body as { message?: string }).message ?? "로드 실패");
  }, [role]);

  useEffect(() => {
    if (hydrated) void loadList();
  }, [hydrated, loadList]);

  const view = async (userId: string, viewReason: string) => {
    const r = await adminApi(`/users/${userId}?view_reason=${encodeURIComponent(viewReason)}`, role);
    if (r.ok) setDetail(r.body as unknown as User360);
    else flash(`🚫 ${(r.body as { message?: string }).message}`);
  };

  const adjust = async () => {
    if (!detail) return;
    const r = await adminApi(`/users/${detail.user.id}/credits`, role, {
      method: "POST",
      body: JSON.stringify({ delta, reason }),
    });
    if (r.ok) {
      flash(`✓ ${delta > 0 ? "+" : ""}${delta}C 조정 — 원장·감사로그 기록`);
      await view(detail.user.id, "조정 결과 확인");
      await loadList();
    } else {
      flash(`🚫 ${(r.body as { message?: string }).message}`);
    }
  };

  if (!hydrated) return null;

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[16px] font-extrabold">👤 사용자·CS 콘솔</h1>
        <span className="text-[11.5px] text-sub">
          서버 실데이터(BE-2) · 열람 사유·100C 게이트는 API가 강제 — UI는 표시일 뿐
        </span>
      </div>

      {error && <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">🔴 {error}</div>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <section className="overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">사용자 목록 <span className="num font-medium text-sub">({users?.length ?? "…"}명)</span></b>
          <table className="atable mt-3">
            <thead><tr><th>ID</th><th>이름</th><th>아기</th><th>크레딧</th><th>잡</th><th></th></tr></thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className={u.provider === "purged" ? "opacity-50" : ""}>
                  <td className="mono text-[11px]">{u.id.slice(0, 12)}…</td>
                  <td>{u.name}{u.provider === "purged" && " 🗑"}</td>
                  <td>{u.baby ?? "—"}</td>
                  <td className="num">{u.credits ?? 0}C</td>
                  <td className="num">{u.jobs}</td>
                  <td>
                    <button
                      className={`pill !py-0.5 text-[10.5px] ${detail?.user.id === u.id ? "sel" : ""}`}
                      onClick={() => setPendingView(u.id)}
                    >
                      360 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {!detail ? (
          <section className="flex items-center justify-center rounded-2xl border border-line bg-white p-5">
            <p className="py-14 text-center text-[12.5px] text-sub">
              👤 사용자를 선택하면 360 뷰가 열려요.<br />
              열람 사유는 서버가 요구하며 감사로그에 기록됩니다.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <b className="text-[13px]">사용자 360 — {detail.user.name}</b>
              <span className="mono text-[10.5px] text-sub">{detail.user.id}</span>
              <span className="num ml-auto text-[11.5px] text-sub">
                {detail.babies[0] ? `👶 ${detail.babies[0].name}` : "프로필 없음"} · 잡 {detail.jobs.length}건 ·
                원장 무결성 {detail.ledgerIntegrity.ok ? "✓" : "✗ 경보"}
              </span>
            </div>

            <div className="num mt-3 grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-cream py-3"><b className="text-lg">{detail.credits}</b><p className="text-[10.5px] text-sub">보유 크레딧</p></div>
              <div className="rounded-xl bg-cream py-3"><b className="text-lg">{detail.jobs.length}</b><p className="text-[10.5px] text-sub">생성 잡</p></div>
              <div className="rounded-xl bg-cream py-3"><b className="text-lg">{detail.ledger.length}</b><p className="text-[10.5px] text-sub">원장 항목</p></div>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-cream px-4 py-3.5">
              <b className="text-[12px]">크레딧 수동 조정 (서버 4-eyes 게이트)</b>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="number" value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                  className="num w-[76px] rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] outline-none focus:border-rose"
                />
                {REASON_CODES.map((r) => (
                  <button key={r} className={`pill !py-1 text-[11px] ${reason === r ? "sel" : ""}`} onClick={() => setReason(r)}>{r}</button>
                ))}
                <button className="cta !py-1.5 !text-[11.5px]" onClick={adjust}>실행</button>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <b className="text-[12px]">크레딧 원장 (서버 append-only)</b>
              <table className="atable mt-2">
                <thead><tr><th>시각</th><th>유형</th><th>금액</th><th>사유</th></tr></thead>
                <tbody>
                  {detail.ledger.map((l, i) => (
                    <tr key={i}>
                      <td className="num whitespace-nowrap">
                        {new Date(l.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td><span className={`vs ${l.delta > 0 ? "vs-live" : "vs-review"}`}>{l.type}</span></td>
                      <td className={`num font-bold ${l.delta > 0 ? "text-[#2b8a5e]" : "text-[#c0392b]"}`}>
                        {l.delta > 0 ? "+" : ""}{l.delta}C
                      </td>
                      <td>{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* 열람 사유 모달 (DF-01) — 서버가 사유 없으면 400 */}
      {pendingView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
          <div className="fadeup w-full max-w-[400px] rounded-2xl bg-white px-7 py-7">
            <b className="text-[15px]">🔏 개인정보 열람 사유</b>
            <p className="mt-2 text-[12px] text-sub">
              <b className="mono">{pendingView.slice(0, 14)}…</b>의 정보를 열람합니다. 사유가 서버 감사로그에 기록돼요.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {VIEW_REASONS.map((r) => (
                <button
                  key={r}
                  className="pill justify-start"
                  onClick={async () => {
                    const id = pendingView;
                    setPendingView(null);
                    await view(id, r);
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="mt-4 cursor-pointer text-[12px] text-sub hover:text-ink" onClick={() => setPendingView(null)}>취소</button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
