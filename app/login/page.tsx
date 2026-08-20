"use client";

// S02 회원가입/로그인 — 소셜 로그인 (데모: 클릭 시 즉시 로그인 처리)

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

const PROVIDERS = [
  { key: "kakao", label: "💬 카카오로 계속하기", cls: "bg-[#FEE500] text-[#3C1E1E]" },
  { key: "google", label: "G 구글로 계속하기", cls: "border border-line bg-white" },
  { key: "apple", label: " 애플로 계속하기", cls: "bg-ink text-white" },
];

export default function Login() {
  const router = useRouter();
  const { login, refresh } = useStore();
  const [guardian, setGuardian] = useState(false);
  const [warn, setWarn] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!guardian) {
      setWarn(true);
      return;
    }
    setBusy(true);
    const ok = await login(); // 실제 API: POST /api/auth/kakao → 세션 토큰
    if (ok) {
      await refresh();
      router.push("/onboarding"); // 프로필 있으면 온보딩이 스튜디오로 안내
    }
    setBusy(false);
  };

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6 py-12">
      <div className="card fadeup w-full max-w-[380px] px-8 py-9 text-center">
        <p className="serif text-[22px] font-bold">3초 만에 시작하기</p>
        <p className="mt-1 text-[13px] text-sub">가입 즉시 무료 3컷 지급 🎁</p>

        <div className="mt-6 flex flex-col gap-2.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              onClick={handleLogin}
              disabled={busy}
              className={`cursor-pointer rounded-xl py-3 text-[13.5px] font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${p.cls}`}
            >
              {busy ? "로그인 중…" : p.label}
            </button>
          ))}
          <button
            onClick={handleLogin}
            className="cursor-pointer py-2 text-xs font-semibold text-sub hover:text-rose"
          >
            이메일로 가입
          </button>
        </div>

        <label
          className={`mt-4 flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 text-left text-[11.5px] leading-relaxed ${
            warn && !guardian ? "border-rose bg-blush" : "border-line bg-cream"
          }`}
        >
          <input
            type="checkbox"
            checked={guardian}
            onChange={(e) => {
              setGuardian(e.target.checked);
              setWarn(false);
            }}
            className="mt-0.5 accent-rose"
          />
          <span>
            <b>[필수]</b> 만 14세 이상이며, 업로드할 아기의{" "}
            <b>법정 보호자</b>임을 확인합니다
          </span>
        </label>
        {warn && !guardian && (
          <p className="mt-1.5 text-[11px] font-bold text-rose-d">
            보호자 확인에 동의해 주세요
          </p>
        )}

        <p className="mt-4 text-[10px] leading-relaxed text-[#a99ba5]">
          가입 시 이용약관·개인정보처리방침 동의로 간주됩니다
          <br />
          데모 빌드 — 버튼 클릭 시 목 로그인 처리
        </p>
      </div>
    </main>
  );
}
