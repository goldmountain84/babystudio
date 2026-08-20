"use client";

// S08 영상 스튜디오 — BE-3부터 서버 워커 (V-01·02)
// 가격·hold·완료 판정 전부 서버. UI는 접수와 폴링만.

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore, type Clip } from "@/lib/store";
import { getApp } from "@/lib/data";
import {
  BGM_OPTIONS,
  CLIP_FORMATS,
  CLIP_LENGTHS,
  MOTION_PRESETS,
  TIMELAPSE_CREDITS,
} from "@/lib/job";
import PhotoArt from "@/components/PhotoArt";

const CUT_EMOJIS = ["👶", "🥰", "😊", "🤗", "😴", "🍼", "🎀", "🌟", "💕", "🎉"];
const SERVER_CLIP_MS = 8_000; // 서버 워커 시뮬레이션 시간

export default function VideoStudioPage() {
  return (
    <Suspense>
      <VideoStudio />
    </Suspense>
  );
}

function VideoStudio() {
  const params = useSearchParams();
  const { hydrated, loggedIn, credits, album, clips, createClip, refreshClips } = useStore();

  const [srcItemId, setSrcItemId] = useState<string | null>(params.get("item"));
  const [srcCut, setSrcCut] = useState<number>(Number(params.get("cut") ?? 0) || 0);
  const [motion, setMotion] = useState<string>(MOTION_PRESETS[0]);
  const [lengthIdx, setLengthIdx] = useState(0);
  const [bgm, setBgm] = useState<string>(BGM_OPTIONS[0]);
  const [format, setFormat] = useState<string>(CLIP_FORMATS[0]);
  const [toast, setToast] = useState<string | null>(null);

  const [tlSel, setTlSel] = useState<{ itemId: string; cut: number }[]>([]);
  const [tlFormat, setTlFormat] = useState<string>(CLIP_FORMATS[2]);

  // 진행 중 클립 폴링 (서버 tick) + 진행률 표시용 시계
  const [now, setNow] = useState(() => Date.now());
  const hasActive = clips.some((c) => c.status === "queued" || c.status === "running");
  useEffect(() => {
    if (!hasActive) return;
    const t = setInterval(() => {
      setNow(Date.now());
      void refreshClips();
    }, 1200);
    return () => clearInterval(t);
  }, [hasActive, refreshClips]);

  const srcItem = useMemo(
    () => album.find((i) => i.id === srcItemId) ?? album[0] ?? null,
    [album, srcItemId]
  );
  const srcApp = srcItem ? getApp(srcItem.appId) : undefined;
  const clipCredits = CLIP_LENGTHS[lengthIdx].credits;

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2600);
  };

  const makeClip = async (preview: boolean) => {
    if (!srcItem) return;
    const assetId = srcItem.assetIds[srcCut];
    // 실제 API: POST /api/clips — 가격은 서버가 계산 (V-01)
    const r = await createClip({
      kind: "clip",
      assetId,
      motion,
      length: CLIP_LENGTHS[lengthIdx].sec,
      bgm: preview ? "없음" : bgm,
      format,
      preview,
    });
    if (!r.ok) flash(`🚫 ${r.error}`);
    else
      flash(
        preview
          ? "무료 3초 미리보기를 서버 워커가 만들고 있어요 (480p·워터마크)"
          : `무빙 클립 접수 완료 🎬 (서버 hold ${clipCredits}C)`
      );
  };

  const makeTimelapse = async () => {
    const r = await createClip({
      kind: "timelapse",
      sourceCount: tlSel.length,
      length: 20,
      bgm: "자장가",
      format: tlFormat,
      preview: false,
    });
    if (!r.ok) flash(`🚫 ${r.error}`);
    else {
      flash(`성장 타임랩스 접수 완료 🎞 (서버 hold ${TIMELAPSE_CREDITS}C)`);
      setTlSel([]);
    }
  };

  const toggleTlCut = (itemId: string, cut: number) => {
    setTlSel((sel) => {
      const exists = sel.some((s) => s.itemId === itemId && s.cut === cut);
      if (exists) return sel.filter((s) => !(s.itemId === itemId && s.cut === cut));
      if (sel.length >= 10) return sel;
      return [...sel, { itemId, cut }];
    });
  };

  if (hydrated && !loggedIn) {
    return (
      <main className="px-10 py-20 text-center">
        <p className="text-sm text-sub">로그인하면 영상 스튜디오를 사용할 수 있어요.</p>
        <Link href="/login" className="cta mt-4">로그인</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[960px] px-6 pb-20 pt-7 md:px-10">
      <h1 className="text-[16px] font-extrabold">
        🎬 영상 스튜디오{" "}
        <span className="text-[12px] font-medium text-sub">— 사진에 숨을 불어넣어요 (서버 워커)</span>
      </h1>

      {hydrated && album.length === 0 && (
        <div className="card mt-5 px-8 py-14 text-center">
          <span className="text-4xl">🎞</span>
          <p className="mt-3 text-sm font-bold">아직 영상으로 만들 화보 컷이 없어요</p>
          <p className="mt-1 text-xs text-sub">테마 앱으로 화보를 먼저 만들어 보세요</p>
          <Link href="/studio" className="cta mt-5">화보 만들러 가기</Link>
        </div>
      )}

      {album.length > 0 && (
        <>
          {/* ═══ 1) 무빙 클립 ═══ */}
          <section className="card mt-5 p-6">
            <b className="text-sm">1 · 무빙 클립</b>
            <span className="ml-2 text-[11px] text-sub">화보 컷 하나를 5~15초 움직이는 영상으로</span>
            <div className="mt-4 grid gap-5 md:grid-cols-[1fr_1.4fr]">
              <div>
                <p className="mb-1.5 text-xs font-bold text-sub">소스 컷 선택</p>
                {srcApp && srcItem && (
                  <PhotoArt
                    gradient={srcApp.gradient}
                    emoji={`👶${srcApp.emoji}`}
                    caption={`${srcApp.name} · 컷 ${srcCut + 1} · 유사도 ${srcItem.similarities[srcCut]?.toFixed(2) ?? "—"}`}
                    emojiSize={48}
                    className="h-[180px]"
                  />
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {album.map((item) => {
                    const app = getApp(item.appId);
                    if (!app) return null;
                    return (
                      <button
                        key={item.id}
                        className={`pill ${srcItem?.id === item.id ? "sel" : ""}`}
                        onClick={() => { setSrcItemId(item.id); setSrcCut(0); }}
                      >
                        {app.emoji} {app.name}
                      </button>
                    );
                  })}
                </div>
                {srcItem && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from({ length: srcItem.cuts }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSrcCut(i)}
                        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-sm transition-all ${
                          srcCut === i ? "border-rose bg-blush" : "border-line bg-cream hover:border-rose"
                        }`}
                      >
                        {CUT_EMOJIS[i % CUT_EMOJIS.length]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1.5 text-xs font-bold text-sub">모션 프리셋</p>
                <div className="flex flex-wrap gap-1.5">
                  {MOTION_PRESETS.map((m) => (
                    <button key={m} className={`pill ${motion === m ? "sel" : ""}`} onClick={() => setMotion(m)}>{m}</button>
                  ))}
                </div>
                <p className="mb-1.5 mt-3.5 text-xs font-bold text-sub">길이</p>
                <div className="flex flex-wrap gap-1.5">
                  {CLIP_LENGTHS.map((l, i) => (
                    <button key={l.sec} className={`pill ${lengthIdx === i ? "sel" : ""}`} onClick={() => setLengthIdx(i)}>{l.label}</button>
                  ))}
                </div>
                <p className="mb-1.5 mt-3.5 text-xs font-bold text-sub">BGM</p>
                <div className="flex flex-wrap gap-1.5">
                  {BGM_OPTIONS.map((b) => (
                    <button key={b} className={`pill ${bgm === b ? "sel" : ""}`} onClick={() => setBgm(b)}>{b === "없음" ? b : `♪ ${b}`}</button>
                  ))}
                </div>
                <p className="mb-1.5 mt-3.5 text-xs font-bold text-sub">포맷</p>
                <div className="flex flex-wrap gap-1.5">
                  {CLIP_FORMATS.map((f) => (
                    <button key={f} className={`pill ${format === f ? "sel" : ""}`} onClick={() => setFormat(f)}>{f}</button>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <button className="cta" onClick={() => makeClip(false)}>🎬 영상 생성 — {clipCredits}C</button>
                  <button className="cta ghost" onClick={() => makeClip(true)}>무료 3초 미리보기</button>
                  <span className="text-[11px] text-[#a99ba5]">보유 💎 {credits}C · 실패 시 자동 환불</span>
                </div>
                <p className="mt-2 text-[11px] text-[#a99ba5]">
                  미리보기는 480p·워터마크 · 풀버전 결제 시 같은 시드로 HD 재렌더 · 가격은 서버가 확정해요
                </p>
              </div>
            </div>
          </section>

          {/* ═══ 2) 성장 타임랩스 ═══ */}
          <section className="card mt-4 p-6">
            <b className="text-sm">2 · 성장 타임랩스</b>
            <span className="badge b-lock ml-2">유료 전용</span>
            <span className="ml-2 text-[11px] text-sub">시기별 컷 4~10장 — 돌잔치 식전 영상으로 인기</span>
            <div className="mt-4 grid grid-cols-4 gap-2.5">
              {["신생아", "50일", "백일", "돌"].map((stage, i) => (
                <PhotoArt key={stage} gradient={["g-cloud", "g-flower", "g-b100", "g-hanbok"][i]}
                  emoji={["🍼", "🌷", "🎂", "🎎"][i]} caption={stage} className="h-[72px]" />
              ))}
            </div>
            <p className="mb-1.5 mt-4 text-xs font-bold text-sub">컷 선택 ({tlSel.length}/10 · 최소 4장 — 서버 검증)</p>
            <div className="flex flex-col gap-2">
              {album.map((item) => {
                const app = getApp(item.appId);
                if (!app) return null;
                return (
                  <div key={item.id} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-[130px] truncate text-[11.5px] font-bold">{app.emoji} {app.name}</span>
                    {Array.from({ length: item.cuts }).map((_, i) => {
                      const sel = tlSel.some((s) => s.itemId === item.id && s.cut === i);
                      return (
                        <button key={i} onClick={() => toggleTlCut(item.id, i)}
                          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-[13px] transition-all ${
                            sel ? "border-rose bg-blush" : "border-line bg-cream hover:border-rose"
                          }`}>
                          {sel ? "✓" : CUT_EMOJIS[i % CUT_EMOJIS.length]}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <div className="flex gap-1.5">
                {CLIP_FORMATS.map((f) => (
                  <button key={f} className={`pill ${tlFormat === f ? "sel" : ""}`} onClick={() => setTlFormat(f)}>{f}</button>
                ))}
              </div>
              <button className="cta ghost" disabled={tlSel.length < 4} onClick={makeTimelapse}>
                🎞 타임랩스 만들기 — {TIMELAPSE_CREDITS}C
              </button>
            </div>
          </section>

          {/* ═══ 내 영상 (서버) ═══ */}
          {clips.length > 0 && (
            <section className="mt-7">
              <b className="text-[15px]">▶ 내 영상 <span className="text-[11px] font-medium text-sub">(서버 워커)</span></b>
              <div className="mt-2.5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
                {clips.map((c) => (
                  <ClipCard key={c.id} clip={c} now={now} />
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[#a99ba5]">
                모든 영상에 C2PA 매니페스트가 서명돼요 · MP4 다운로드·공유는 데모 생략
              </p>
            </section>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-[13px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function ClipCard({ clip, now }: { clip: Clip; now: number }) {
  const { album } = useStore();
  const running = clip.status === "queued" || clip.status === "running";
  const pct = running
    ? Math.min(99, Math.round(((now - clip.createdAt) / SERVER_CLIP_MS) * 100))
    : 100;
  const srcItem = album.find((i) => i.id === clip.itemId);
  const app = srcItem ? getApp(srcItem.appId) : undefined;
  const gradient = clip.kind === "timelapse" ? "g-dream" : (app?.gradient ?? "g-cloud");
  const title =
    clip.kind === "timelapse"
      ? `성장 타임랩스 · ${clip.sourceCount}컷`
      : `${app?.name ?? "무빙 클립"} · ${clip.motion ?? ""}`;

  return (
    <div>
      <PhotoArt
        gradient={gradient}
        emoji={running ? "⏳" : clip.kind === "timelapse" ? "🎞" : "🎬"}
        caption={running ? `서버 생성 중 ${Math.max(0, pct)}%` : `${clip.length}초 · ${clip.format}`}
        video={!running}
        watermark={clip.preview}
        className="h-[110px]"
      >
        {running && (
          <div className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded bg-white/30">
            <i className="block h-full bg-white transition-all" style={{ width: `${Math.max(0, pct)}%` }} />
          </div>
        )}
      </PhotoArt>
      <p className="mt-1 truncate text-[11px] font-semibold text-sub">
        {title}
        {clip.preview && " · 미리보기"}
        {clip.bgm !== "없음" && ` · ♪ ${clip.bgm}`}
      </p>
    </div>
  );
}
