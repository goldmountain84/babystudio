"use client";

// S04 스튜디오 홈 — 마일스톤 탭 × 테마 '앱' 갤러리 (Higgsfield Apps 방식)

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MILESTONES, THEME_APPS, type MilestoneKey } from "@/lib/data";
import { currentMilestone, nextMilestone, useStore } from "@/lib/store";
import AppCard from "@/components/AppCard";
import PhotoArt from "@/components/PhotoArt";

type Tab = "all" | MilestoneKey;

export default function StudioHome() {
  const { hydrated, baby } = useStore();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [runs7d, setRuns7d] = useState<Map<string, number>>(new Map());

  // 트렌딩 실데이터 (H-03): 7일 실행수 기반 자동 큐레이션
  useEffect(() => {
    void fetch("/api/themes")
      .then((r) => r.json())
      .then((b: { themes: { id: string; runs7d: number }[] }) => {
        setRuns7d(new Map(b.themes.map((t) => [t.id, t.runs7d])));
      })
      .catch(() => {});
  }, []);

  // 아기 생일 기준 현재 시기 탭 자동 선택 (H-01)
  useEffect(() => {
    if (hydrated && baby?.birthday) setTab(currentMilestone(baby.birthday));
  }, [hydrated, baby?.birthday]);

  const dday = baby?.birthday ? nextMilestone(baby.birthday) : null;

  const apps = useMemo(() => {
    let list = THEME_APPS;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q)
      );
    } else if (tab !== "all") {
      list = list.filter((a) => a.milestone === tab);
    }
    return list;
  }, [tab, query]);

  // 실행수 상위 5종 — 데이터가 없으면 큐레이션 플래그로 폴백
  const ranked = [...THEME_APPS].sort(
    (a, b) => (runs7d.get(b.id) ?? 0) - (runs7d.get(a.id) ?? 0)
  );
  const hasRuns = (runs7d.get(ranked[0]?.id) ?? 0) > 0;
  const trending = hasRuns
    ? ranked.slice(0, 5)
    : THEME_APPS.filter((a) => a.trending);

  return (
    <main className="pb-20">
      {/* 검색 */}
      <div className="px-6 pt-5 md:px-10">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='🔍 앱 검색 — "한복", "케이크 스매시"…'
          className="w-full max-w-[360px] rounded-full border border-line bg-white px-5 py-2.5 text-[13px] outline-none focus:border-rose"
        />
      </div>

      {/* D-day 배너 (H-04 핵심 매출 트리거) */}
      {hydrated && baby && dday && (
        <div className="mx-6 mt-4 flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#F5D9C2] bg-gradient-to-r from-[#FFF1DB] to-blush px-6 py-4 md:mx-10">
          <span className="text-[26px]">🎂</span>
          <div className="flex-1">
            <b className="text-[14.5px]">
              {baby.name} {dday.label}까지 D-{dday.dday}
            </b>
            <br />
            <span className="text-[12.5px] text-sub">
              {dday.label} 섹션의 인기 앱으로 화보를 미리 준비하세요
            </span>
          </div>
          <button onClick={() => setTab(dday.milestone)} className="cta">
            {dday.label} 앱 보기
          </button>
        </div>
      )}
      {hydrated && !baby && (
        <div className="mx-6 mt-4 flex flex-wrap items-center gap-3.5 rounded-2xl border border-line bg-white px-6 py-4 md:mx-10">
          <span className="text-[26px]">👶</span>
          <div className="flex-1">
            <b className="text-[14.5px]">아직 아기 프로필이 없어요</b>
            <br />
            <span className="text-[12.5px] text-sub">
              사진 5장으로 AI 프로필을 만들면 모든 테마를 원탭으로 실행할 수 있어요
            </span>
          </div>
          <Link href="/onboarding" className="cta">
            프로필 만들기
          </Link>
        </div>
      )}

      {/* 마일스톤 탭 (1차 분류) */}
      <div className="flex flex-wrap gap-2 px-6 pb-1 pt-5 md:px-10">
        <button className={`pill ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>
          전체
        </button>
        {MILESTONES.map((m) => (
          <button
            key={m.key}
            className={`pill ${tab === m.key ? "on" : ""}`}
            onClick={() => {
              setTab(m.key);
              setQuery("");
            }}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* 앱 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4.5 px-6 pt-4 sm:grid-cols-2 md:px-10 lg:grid-cols-4">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
        {apps.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-sub">
            검색 결과가 없어요. 다른 키워드로 찾아보세요.
          </p>
        )}
      </div>

      {/* 트렌딩 */}
      <div className="px-6 pb-8 pt-8 md:px-10">
        <b className="text-sm">
          🔥 이번 주 트렌딩 앱{" "}
          {hasRuns && (
            <span className="text-[11px] font-medium text-sub">(7일 실행수 기준)</span>
          )}
        </b>
        <div className="mt-2.5 flex gap-3 overflow-x-auto pb-2">
          {trending.map((a) => (
            <Link key={a.id} href={`/studio/app/${a.id}`} className="flex-none">
              <PhotoArt
                gradient={a.gradient}
                caption={
                  hasRuns && (runs7d.get(a.id) ?? 0) > 0
                    ? `${a.name} · ${runs7d.get(a.id)}회`
                    : a.seasonDday != null
                      ? `${a.name} (시즌 D-${a.seasonDday})`
                      : a.name
                }
                className="h-[84px] w-[130px] transition-transform hover:-translate-y-0.5"
              />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
