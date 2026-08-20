"use client";

// S12-B2~4 프롬프트 상세 — BE-2부터 전부 서버 API:
// 버전 체인·지표(version_metrics), 전이(4-eyes 서버 강제), 카나리 틱(자동 승격 배치), 린터(422)

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/lib/adminStore";
import { adminApi } from "@/lib/adminApi";
import {
  ENGINES,
  GLOBAL_NEGATIVE,
  KNOWN_VARS,
  MILESTONE_NEGATIVE,
  SAFETY_LAYER_PREVIEW,
  VOCAB_SEED,
} from "@/lib/adminData";
import { getApp } from "@/lib/data";
import { wordDiff } from "@/lib/diff";
import PhotoArt from "@/components/PhotoArt";

type Tab = "versions" | "editor" | "playground" | "vocab";

interface VersionRow {
  id: string;
  theme_id: string;
  version_no: number;
  status: "draft" | "review" | "approved" | "canary" | "live" | "archived";
  positive_tpl: string;
  theme_negative: string;
  model_params: string;
  canary_pct: number | null;
  author: string;
  approver: string | null;
  best_cut: number | null;
  regen: number | null;
  hi_res: number | null;
  fail: number | null;
  cost: number | null;
  samples: number | null;
}

const STATUS_LABEL: Record<VersionRow["status"], string> = {
  draft: "draft", review: "승인 대기", approved: "승인됨",
  canary: "canary", live: "live", archived: "archived",
};

export default function PromptDetail({
  params,
}: {
  params: Promise<{ themeId: string }>;
}) {
  const { themeId } = use(params);
  const { role, actor, hydrated } = useAdmin();
  const app = getApp(themeId);

  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("versions");
  const [compareId, setCompareId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 에디터
  const [positive, setPositive] = useState<string | null>(null);
  const [themeNeg, setThemeNeg] = useState<string | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [violations, setViolations] = useState<string[]>([]);

  // 플레이그라운드 / 롤백 모달
  const [pgA, setPgA] = useState<string | null>(null);
  const [pgB, setPgB] = useState<string | null>(null);
  const [pgResult, setPgResult] = useState<{ vid: string; scores: number[] }[] | null>(null);
  const [rollbackVid, setRollbackVid] = useState<string | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");

  const load = useCallback(async () => {
    const r = await adminApi(`/versions/detail?theme=${themeId}`, role);
    if (r.ok) {
      setVersions((r.body as { versions: VersionRow[] }).versions);
      setLoadError(null);
    } else {
      setLoadError((r.body as { message?: string }).message ?? "로드 실패");
    }
  }, [role, themeId]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  const live = versions?.find((v) => v.status === "live");
  const canary = versions?.find((v) => v.status === "canary");
  const compare = versions?.find((v) => v.id === compareId);
  const milestoneNeg = useMemo(
    () => MILESTONE_NEGATIVE[themeId] ?? (app ? MILESTONE_NEGATIVE[app.milestone] : "") ?? "",
    [themeId, app]
  );

  const edPositive = positive ?? live?.positive_tpl ?? "";
  const edThemeNeg = themeNeg ?? live?.theme_negative ?? "";
  const edEngine = engine ?? (live ? (JSON.parse(live.model_params) as { engine: string }).engine : ENGINES[0]);
  const unknownVars = [...edPositive.matchAll(/\{(\w+)\}/g)]
    .map((m) => m[1])
    .filter((v) => !KNOWN_VARS.includes(v));

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 3200);
  };

  const act = async (vid: string, action: string, body?: Record<string, unknown>) => {
    const r = await adminApi(`/versions/${encodeURIComponent(vid)}/${action}`, role, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.ok) {
      flash(`✓ ${vid.split("@")[1]} ${action} 완료 — 서버 감사로그 기록`);
      await load();
    } else {
      flash(`🚫 ${(r.body as { message?: string }).message}`);
    }
    return r.ok;
  };

  const saveDraft = async () => {
    const r = await adminApi("/versions", role, {
      method: "POST",
      body: JSON.stringify({
        themeId,
        positive: edPositive,
        themeNegative: edThemeNeg,
        params: { engine: edEngine, steps: 30, cfg: 3.0 },
      }),
    });
    if (r.ok) {
      setViolations([]);
      flash(`✓ ${(r.body as { versionId: string }).versionId.split("@")[1]} draft 저장 — 서버 린트 통과`);
      setTab("versions");
      await load();
    } else if (r.status === 422) {
      const msg = (r.body as { message?: string }).message ?? "";
      setViolations(msg.replace("금지 토큰: ", "").split(", "));
      flash("🚫 서버 린터 차단 — 금지 토큰 발견 (보안팀 알림)");
    } else {
      flash(`🚫 ${(r.body as { message?: string }).message}`);
    }
  };

  const tick = async () => {
    const r = await adminApi(`/themes/${themeId}/canary-tick`, role, { method: "POST" });
    if (!r.ok) return flash(`🚫 ${(r.body as { message?: string }).message}`);
    const b = r.body as { promoted: boolean; stopped: boolean; samples: number; canaryBest: number; liveBest: number };
    if (b.promoted) flash(`🎉 자동 승격 — 표본 ${b.samples}, ${b.canaryBest}% > ${b.liveBest}% (서버 판정)`);
    else if (b.stopped) flash(`⛔ 카나리 자동 중단 — 열세 (${b.canaryBest}% ≤ ${b.liveBest}%)`);
    else flash(`카나리 표본 누적 ${b.samples}/200 (현재 ${b.canaryBest}%)`);
    await load();
  };

  const runPlayground = () => {
    const picks = [pgA ?? live?.id, pgB].filter(Boolean) as string[];
    if (picks.length === 0) return;
    setPgResult(
      picks.map((vid) => ({
        vid,
        scores: Array.from({ length: 4 }, () => Math.round((0.76 + Math.random() * 0.17) * 100) / 100),
      }))
    );
  };

  if (!hydrated) return null;
  if (!app) {
    return (
      <main className="px-10 py-16 text-center text-sm text-sub">
        없는 테마입니다. <Link href="/admin/prompts" className="text-rose">← 목록</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1120px] px-6 py-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/prompts" className="text-[12px] text-sub hover:text-rose">← 목록</Link>
        <h1 className="text-[16px] font-extrabold">{app.name}</h1>
        <span className="mono text-[11px] text-sub">{themeId}</span>
        {live && <span className="vs vs-live">live {live.id.split("@")[1]}</span>}
        {canary && <span className="vs vs-canary">canary {canary.id.split("@")[1]} · {canary.canary_pct}%</span>}
        <div className="ml-auto flex gap-1.5">
          {(["versions", "editor", "playground", "vocab"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pill !py-1.5 text-[11.5px] ${tab === t ? "on" : ""}`}>
              {t === "versions" ? "버전·워크플로" : t === "editor" ? "에디터" : t === "playground" ? "플레이그라운드" : "어휘 사전"}
            </button>
          ))}
        </div>
      </div>

      {loadError && <div className="alert-crit mt-4 rounded-lg px-4 py-3 text-[12.5px]">🔴 {loadError}</div>}

      {/* ═══ 버전·워크플로 ═══ */}
      {tab === "versions" && versions && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <section className="rounded-2xl border border-line bg-white p-5">
            <b className="text-[13px]">버전 체인 (서버 · append-only)</b>
            <div className="mt-3 flex flex-col gap-2.5">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`rounded-xl border px-4 py-3 ${
                    v.status === "live" ? "border-[#2b8a5e]/40 bg-[#f4fbf7]"
                    : v.status === "canary" ? "border-[#7a5fbf]/40 bg-[#f8f6fc]"
                    : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="mono text-[13px]">{v.id.split("@")[1]}</b>
                    <span className={`vs vs-${v.status}`}>
                      {STATUS_LABEL[v.status]}{v.status === "canary" && ` ${v.canary_pct}%`}
                    </span>
                    <span className="text-[11px] text-sub">
                      {v.author}{v.approver && ` → 승인 ${v.approver}`}
                    </span>
                    <div className="ml-auto flex gap-1.5">
                      <button className="pill !py-1 text-[10.5px]" onClick={() => setCompareId(compareId === v.id ? null : v.id)}>
                        {compareId === v.id ? "diff 해제" : "live와 diff"}
                      </button>
                      {v.status === "draft" && (
                        <button className="pill !py-1 text-[10.5px]" onClick={() => act(v.id, "review")}>승인 요청</button>
                      )}
                      {v.status === "review" && (
                        <button
                          className={`pill hot !py-1 text-[10.5px] ${role !== "리드" || v.author === actor ? "opacity-45" : ""}`}
                          title={v.author === actor ? "작성자 본인 승인 불가 (4-eyes)" : role !== "리드" ? "리드만 승인 가능" : "승인"}
                          onClick={() => act(v.id, "approve")}
                        >
                          리드 승인 (4-eyes)
                        </button>
                      )}
                      {v.status === "approved" && (
                        <button className="pill hot !py-1 text-[10.5px]" onClick={() => act(v.id, "canary", { pct: 5 })}>
                          카나리 5% 시작
                        </button>
                      )}
                      {v.status === "archived" && v.samples != null && (
                        <button className="pill !py-1 text-[10.5px]" onClick={() => { setRollbackVid(v.id); setRollbackReason(""); }}>
                          이 버전으로 롤백
                        </button>
                      )}
                    </div>
                  </div>
                  {v.samples != null && v.samples > 0 && (
                    <p className="num mt-1.5 text-[11.5px] text-sub">
                      베스트컷 <b className="text-ink">{v.best_cut}%</b> · 재생성 {v.regen}% ·
                      고해상도 {v.hi_res}% · 실패 {v.fail}% · 컷당 ₩{v.cost} · 표본 {v.samples.toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {canary && live && (
              <div className="mt-4 rounded-xl border border-[#7a5fbf]/30 bg-[#f8f6fc] px-4 py-3.5">
                <b className="text-[12.5px]">🧪 카나리 — 자동 승격 조건: 표본 200 + live 대비 우세 (서버 배치 판정)</b>
                <div className="num mt-2 flex items-center gap-3 text-[12px]">
                  <span>표본 {canary.samples ?? 0}/200</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#e5def2]">
                    <i className="block h-full bg-[#7a5fbf]" style={{ width: `${Math.min(100, ((canary.samples ?? 0) / 200) * 100)}%` }} />
                  </div>
                  <span>{canary.samples ? `카나리 ${canary.best_cut}% vs live ${live.best_cut}%` : "표본 수집 전"}</span>
                </div>
                <button className="cta mt-2.5 !py-1.5 !text-[11.5px]" onClick={tick}>
                  배치 틱 실행 (+50 잡 집계)
                </button>
                <span className="ml-2 text-[10.5px] text-sub">실서비스: 15분 배치 자동 실행</span>
              </div>
            )}
          </section>

          {/* diff + 네거티브 체인 */}
          <section className="rounded-2xl border border-line bg-white p-5">
            <b className="text-[13px]">diff — {compare && live ? `${live.id.split("@")[1]} → ${compare.id.split("@")[1]}` : "버전을 선택하세요"}</b>
            {compare && live ? (
              <>
                <p className="mt-3 text-[11px] font-bold text-sub">positive</p>
                <p className="mt-1 rounded-lg bg-cream p-3 text-[12px] leading-relaxed">
                  {wordDiff(live.positive_tpl, compare.positive_tpl).map((p, i) => (
                    <span key={i} className={p.kind === "del" ? "diff-del" : p.kind === "ins" ? "diff-ins" : ""}>{p.text} </span>
                  ))}
                </p>
                <p className="mt-3 text-[11px] font-bold text-sub">theme negative</p>
                <p className="mt-1 rounded-lg bg-cream p-3 text-[12px]">
                  {wordDiff(live.theme_negative || "(없음)", compare.theme_negative || "(없음)").map((p, i) => (
                    <span key={i} className={p.kind === "del" ? "diff-del" : p.kind === "ins" ? "diff-ins" : ""}>{p.text} </span>
                  ))}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[12px] text-sub">버전 카드에서 &quot;live와 diff&quot;를 누르면 단어 단위 변경점이 표시됩니다.</p>
            )}

            <div className="mt-5 border-t border-line pt-4">
              <b className="text-[13px]">네거티브 3단 상속 (PC-03)</b>
              <div className="mt-2 flex flex-col gap-2 text-[11.5px]">
                <div className="rounded-lg border border-line bg-cream px-3 py-2">
                  <b>글로벌</b> <span className="text-sub">(전 테마 공통 · 리드만 수정)</span>
                  <p className="mono mt-1 text-[10.5px] text-sub">{GLOBAL_NEGATIVE}</p>
                </div>
                {milestoneNeg && (
                  <div className="rounded-lg border border-line bg-cream px-3 py-2">
                    <b>마일스톤</b> <span className="text-sub">({app.milestone})</span>
                    <p className="mono mt-1 text-[10.5px] text-sub">{milestoneNeg}</p>
                  </div>
                )}
                <div className="rounded-lg border border-[#7a5fbf]/40 bg-[#f8f6fc] px-3 py-2">
                  <b>🔒 아동 안전 레이어 (PC-04)</b>
                  <p className="mono mt-1 text-[10.5px] text-sub">{SAFETY_LAYER_PREVIEW} — 서버 배포 상수, 조립 시 강제 주입</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══ 에디터 ═══ */}
      {tab === "editor" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-line bg-white p-5">
            <b className="text-[13px]">새 draft 작성 <span className="font-medium text-sub">(live {live?.id.split("@")[1]} 프리필 · 저장 = 서버 린트 → 새 버전)</span></b>
            <p className="mt-3 text-[11px] font-bold text-sub">
              positive template — 변수: {KNOWN_VARS.map((v) => <code key={v} className="tok mr-1">{`{${v}}`}</code>)}
            </p>
            <textarea
              value={edPositive}
              onChange={(e) => setPositive(e.target.value)}
              rows={5}
              className="mono mt-1.5 w-full rounded-xl border border-line bg-cream p-3 text-[12px] leading-relaxed outline-none focus:border-rose"
            />
            <p className="mt-3 text-[11px] font-bold text-sub">theme negative</p>
            <textarea
              value={edThemeNeg}
              onChange={(e) => setThemeNeg(e.target.value)}
              rows={2}
              className="mono mt-1.5 w-full rounded-xl border border-line bg-cream p-3 text-[12px] outline-none focus:border-rose"
            />
            {unknownVars.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#b07a1e] bg-[#fff8ec] px-4 py-2.5 text-[12px]">
                <b className="text-[#b07a1e]">⚠ 미정의 변수 (PB-20)</b>{" "}
                {unknownVars.map((v) => <code key={v} className="tok mr-1">{`{${v}}`}</code>)}
                — 생성 시 빈 문자열로 치환됩니다 (저장 가능).
              </div>
            )}
            {violations.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#c0392b] bg-[#fdf1ef] px-4 py-3 text-[12px]">
                <b className="text-[#c0392b]">🚫 서버 린터 (PC-04) — 저장 차단</b>
                <p className="mt-1">발견: {violations.map((v) => <code key={v} className="tok mr-1">{v}</code>)}</p>
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button className="cta" onClick={saveDraft}>draft 저장 (서버 린트)</button>
              <span className="text-[11px] text-sub">저장 → 승인 요청 → 리드 승인 → 카나리 → live</span>
            </div>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5">
            <b className="text-[13px]">모델 파라미터 (PC-08)</b>
            <div className="mt-3 flex flex-col gap-1.5">
              {ENGINES.map((e) => (
                <button key={e} className={`pill justify-start ${edEngine === e ? "sel" : ""}`} onClick={() => setEngine(e)}>{e}</button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-[#7a5fbf]/40 bg-[#f8f6fc] px-3.5 py-3 text-[11.5px]">
              <b>🔒 안전 불변식 (서버 강제)</b>
              <ul className="mt-1 list-disc pl-4 text-[11px] leading-relaxed text-sub">
                <li>린터·4-eyes·역할 검사는 전부 API에서 재검증 — UI는 표시일 뿐</li>
                <li>안전 네거티브는 조립 시 강제 주입 + 조립 결과 재린트</li>
                <li>원문 열람도 감사로그 기록</li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {/* ═══ 플레이그라운드 ═══ */}
      {tab === "playground" && versions && (
        <section className="mt-4 rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">플레이그라운드 (PC-05) — 내부 테스트 프로필 · 시드 고정 비교</b>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-bold text-sub">버전 A</span>
            {versions.map((v) => (
              <button key={v.id} className={`pill !py-1 text-[11px] ${(pgA ?? live?.id) === v.id ? "sel" : ""}`} onClick={() => setPgA(v.id)}>
                {v.id.split("@")[1]}
              </button>
            ))}
            <span className="ml-4 text-[11.5px] font-bold text-sub">버전 B</span>
            {versions.filter((v) => v.id !== (pgA ?? live?.id)).map((v) => (
              <button key={v.id} className={`pill !py-1 text-[11px] ${pgB === v.id ? "sel" : ""}`} onClick={() => setPgB(pgB === v.id ? null : v.id)}>
                {v.id.split("@")[1]}
              </button>
            ))}
            <button className="cta ml-auto !py-2 !text-[12px]" onClick={runPlayground}>
              ⚡ 시드 고정 4컷 생성 {pgB ? "(A/B 블라인드)" : ""}
            </button>
          </div>
          {pgResult && (
            <div className={`mt-4 grid gap-4 ${pgResult.length > 1 ? "md:grid-cols-2" : ""}`}>
              {pgResult.map((r, ri) => {
                const best = r.scores.indexOf(Math.max(...r.scores));
                return (
                  <div key={r.vid}>
                    <b className="text-[12px]">{pgResult.length > 1 ? `${ri === 0 ? "A" : "B"}안` : r.vid.split("@")[1]}
                      <span className="ml-1.5 font-medium text-sub">(판정 후 공개: {r.vid.split("@")[1]})</span></b>
                    <div className="mt-1.5 grid grid-cols-4 gap-2">
                      {r.scores.map((s, i) => (
                        <div key={i}>
                          <PhotoArt gradient={app.gradient} emoji={["👶", "🥰", "😊", "🤗"][i]} caption={`seed 7742+${i}`}
                            className={`h-[92px] ${i === best ? "outline outline-2 outline-offset-2 outline-gold" : ""}`} />
                          <p className={`num mt-1 text-center text-[10.5px] font-bold ${s >= 0.82 ? "text-[#2b8a5e]" : "text-[#c0392b]"}`}>
                            유사도 {s.toFixed(2)}{s < 0.82 && " · 게이트 미달"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ 어휘 사전 ═══ */}
      {tab === "vocab" && (
        <section className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white p-5">
          <b className="text-[13px]">변수 어휘 사전 (PC-02) — 서버 조립 시 치환되는 실제 매핑</b>
          <table className="atable mt-3">
            <thead><tr><th>옵션 키</th><th>그룹</th><th>프롬프트 조각</th><th>사용 테마</th></tr></thead>
            <tbody>
              {VOCAB_SEED.map((v) => (
                <tr key={v.key}>
                  <td><b>{v.key}</b></td><td>{v.group}</td>
                  <td className="mono text-[11px]">{v.fragment}</td>
                  <td className="num">{v.usedBy}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 롤백 모달 (SH-04) — 서버 promote(reason) */}
      {rollbackVid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
          <div className="fadeup w-full max-w-[420px] rounded-2xl bg-white px-7 py-7">
            <b className="text-[15px]">↩ {rollbackVid.split("@")[1]}(으)로 롤백할까요?</b>
            <p className="mt-2 text-[12px] leading-relaxed text-sub">
              현재 live는 archived로 전환되고 즉시 반영됩니다.
              {canary && <> 진행 중인 카나리는 자동 중단됩니다 (PB-14).</>} 사유가 서버 감사로그에 기록됩니다.
            </p>
            <input
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              placeholder="사유 (필수)"
              className="mt-3 w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-[12.5px] outline-none focus:border-rose"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="pill" onClick={() => setRollbackVid(null)}>취소</button>
              <button
                className="cta !py-2 !text-[12px]"
                disabled={rollbackReason.trim().length < 2}
                onClick={async () => {
                  const vid = rollbackVid;
                  setRollbackVid(null);
                  await act(vid, "promote", { reason: rollbackReason.trim() });
                }}
              >
                롤백 실행
              </button>
            </div>
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
