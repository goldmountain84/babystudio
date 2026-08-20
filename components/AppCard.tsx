"use client";

import Link from "next/link";
import { BADGE_CLASS, BADGE_LABEL, type ThemeApp } from "@/lib/data";
import PhotoArt from "./PhotoArt";

export default function AppCard({ app }: { app: ThemeApp }) {
  const locked = app.memberOnly;
  const priceLabel =
    app.credits === 0 ? `${app.cuts}컷 무료` : `${app.cuts}컷 · ${app.credits}C`;

  return (
    <div className="card fadeup transition-transform hover:-translate-y-1">
      <Link href={`/studio/app/${app.id}`}>
        <PhotoArt
          gradient={app.gradient}
          emoji={app.emoji}
          caption={app.name}
          video={app.hasVideo}
          className="h-[150px] !rounded-none"
        />
      </Link>
      <div className="px-3.5 py-3">
        <div className="mb-1.5 flex gap-1.5">
          {app.badges.map((b) => (
            <span key={b} className={`badge ${BADGE_CLASS[b]}`}>
              {b === "season" && app.seasonDday != null
                ? `시즌 D-${app.seasonDday}`
                : BADGE_LABEL[b]}
            </span>
          ))}
        </div>
        <b className="text-[13.5px]">{app.name}</b>
        <div className="mt-2 flex items-center">
          <span className="text-[11.5px] text-[#9a8e96]">{priceLabel}</span>
          <Link
            href={`/studio/app/${app.id}`}
            className={`cta ml-auto !px-3.5 !py-[7px] !text-[11.5px] ${locked ? "ghost" : ""}`}
          >
            {locked ? "해금하기" : "바로 만들기"}
          </Link>
        </div>
      </div>
    </div>
  );
}
