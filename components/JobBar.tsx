"use client";

// 진행 중인 생성 잡 미니바 — 사이트 어디서든 하단 고정 노출 (S04 H-06)

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { getApp } from "@/lib/data";
import { JOB_DURATION_MS } from "@/lib/job";

export default function JobBar() {
  const { jobs } = useStore();
  const pathname = usePathname();
  const [now, setNow] = useState(() => Date.now());

  const running = jobs.filter(
    (j) => j.status === "running" && now - j.startedAt < JOB_DURATION_MS
  );

  useEffect(() => {
    if (jobs.some((j) => j.status === "running")) {
      const t = setInterval(() => setNow(Date.now()), 500);
      return () => clearInterval(t);
    }
  }, [jobs]);

  if (running.length === 0 || pathname.startsWith("/studio/generate")) {
    return null;
  }

  const job = running[0];
  const app = getApp(job.appId);
  const pct = Math.min(
    99,
    Math.round(((now - job.startedAt) / JOB_DURATION_MS) * 100)
  );
  const remainSec = Math.max(
    1,
    Math.ceil((JOB_DURATION_MS - (now - job.startedAt)) / 1000)
  );

  return (
    <Link
      href={`/studio/generate/${job.id}`}
      className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3.5 bg-ink px-6 py-3 text-[12.5px] text-white md:px-10"
    >
      <span>✨ {app?.name ?? "화보"} 생성 중…</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-white/20">
        <i
          className="block h-full bg-gradient-to-r from-rose to-[#f0a1bc] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <b>{pct}%</b>
      <span className="text-[#c8bcc4]">· 약 {remainSec}초 남음</span>
    </Link>
  );
}
