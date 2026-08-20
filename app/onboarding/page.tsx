"use client";

// S03 온보딩 — 아기 정보 → 사진 업로드 → AI 학습 (데모: 학습 시뮬레이션)

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const SLOT_GUIDE = ["정면 😊", "측면", "웃는 얼굴", "앉은 모습", "누운 모습"];
const TRAIN_MS = 8000;

export default function Onboarding() {
  const router = useRouter();
  const { registerBaby, baby, hydrated } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [uploaded, setUploaded] = useState<boolean[]>(
    Array(SLOT_GUIDE.length).fill(false)
  );
  const [progress, setProgress] = useState(0);
  const [apiError, setApiError] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const registered = useRef(false);

  const uploadedCount = uploaded.filter(Boolean).length;

  // 이미 학습된 프로필이 있으면 스튜디오로
  useEffect(() => {
    if (hydrated && baby?.trained && step === 1) router.replace("/studio");
  }, [hydrated, baby, step, router]);

  useEffect(() => {
    if (step !== 3) return;
    // 실제 API: 프로필 생성 + 학습 잡 — 애니메이션과 병행 (§12 매핑)
    if (!registered.current) {
      registered.current = true;
      void registerBaby(name, birthday).then((ok) => {
        if (!ok) setApiError(true);
      });
    }
    const started = Date.now();
    timer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / TRAIN_MS) * 100);
      setProgress(pct);
      if (pct >= 100 && timer.current) {
        clearInterval(timer.current);
        setTimeout(() => router.push("/studio"), 900);
      }
    }, 120);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <main className="mx-auto max-w-[560px] px-6 py-10">
      {/* step indicator */}
      <div className="mb-7 flex items-center gap-2 text-[11px] font-bold text-sub">
        <span className="text-rose">STEP {step}/3</span>
        <span>·</span>
        <span className={step === 1 ? "text-ink" : ""}>아기 정보</span>
        <span>→</span>
        <span className={step === 2 ? "text-ink" : ""}>사진 업로드</span>
        <span>→</span>
        <span className={step === 3 ? "text-ink" : ""}>AI 학습</span>
      </div>

      {step === 1 && (
        <div className="card fadeup px-7 py-8">
          <p className="serif text-[20px] font-bold">우리 아기를 소개해 주세요</p>
          <p className="mt-1 text-xs text-sub">
            생일을 입력하면 50일·백일·돌 D-day를 자동 계산해 딱 맞는 테마를
            추천해드려요
          </p>
          <div className="mt-6 flex flex-col gap-4">
            <label className="text-[13px] font-bold">
              이름 / 태명
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 서연이"
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-rose"
              />
            </label>
            <label className="text-[13px] font-bold">
              생일
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-rose"
              />
            </label>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!name || !birthday}
            className="cta big mt-7 w-full"
          >
            다음 — 사진 업로드
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card fadeup px-7 py-8">
          <p className="serif text-[20px] font-bold">
            {name}의 사진 5~10장을 올려주세요
          </p>
          <p className="mt-1 text-xs text-sub">
            데모 빌드 — 슬롯을 탭하면 업로드된 것으로 처리돼요
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {SLOT_GUIDE.map((g, i) => (
              <button
                key={g}
                onClick={() =>
                  setUploaded((u) => u.map((v, j) => (j === i ? !v : v)))
                }
                className={`flex h-[84px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-[11px] font-bold transition-all ${
                  uploaded[i]
                    ? "border-rose bg-blush text-rose-d"
                    : "border-line bg-cream text-sub hover:border-rose"
                }`}
              >
                <span className="text-xl">{uploaded[i] ? "✅" : "📷"}</span>
                {g}
              </button>
            ))}
            <div className="flex h-[84px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-line text-[11px] font-bold text-[#c5bac2]">
              + 추가
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <div className="rounded-lg border border-[#7fbf7f] bg-[#f2faf2] px-3 py-2">
              ✅ 좋은 예: 밝은 곳, 또렷한 얼굴, 다양한 각도
            </div>
            <div className="rounded-lg border border-[#d98181] bg-[#fdf2f2] px-3 py-2">
              ❌ 나쁜 예: 흐림, 옆사람 포함, 모자·노리개젖꼭지
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#a99ba5]">
            ⚠ 업로드 즉시 자동 검사: 얼굴 검출 실패·저화질 컷은 교체를 요청드려요
          </p>
          <div className="mt-5 rounded-xl bg-cream px-4 py-3 text-center text-[11.5px] leading-relaxed">
            🔒 원본 사진은 AI 학습 완료 후 <b>즉시 삭제</b>되며, 외부 모델
            학습에 사용되지 않습니다
          </div>
          <button
            onClick={() => setStep(3)}
            disabled={uploadedCount < 3}
            className="cta big mt-5 w-full"
          >
            AI 학습 시작하기 ({uploadedCount}/5장 · 약 5분)
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="card fadeup px-7 py-10 text-center">
          <span className="pulse-soft text-5xl">👶✨</span>
          <p className="serif mt-4 text-[20px] font-bold">
            {progress >= 100
              ? `${name}의 AI 프로필이 완성됐어요!`
              : `${name}의 얼굴을 배우는 중이에요`}
          </p>
          <div className="mx-auto mt-5 h-2 w-full max-w-[320px] overflow-hidden rounded bg-[#f0e4e0]">
            <i
              className="block h-full bg-gradient-to-r from-rose to-[#f0a1bc] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-sub">
            {apiError
              ? "프로필 등록에 실패했어요 — 새로고침 후 다시 시도해 주세요"
              : progress >= 100
                ? "스튜디오로 이동할게요 🎉"
                : `${Math.round(progress)}% · 완료되면 알림을 보내드려요`}
          </p>
          {/* 웰컴 매직 컷 (§3.1) — 학습을 기다리기 전에 zero-shot으로 "된다"는 확신을 먼저 */}
          {progress > 30 && (
            <div className="fadeup mx-auto mt-6 max-w-[260px] rounded-2xl border border-line bg-cream p-3.5">
              <div className="ph g-angel h-[120px]">
                <span className="emo" style={{ fontSize: 34 }}>👼✨</span>
                <span className="cap">웰컴 매직 컷</span>
                <span className="wm-tag">PREVIEW</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-sub">
                기다리는 동안 zero-shot 엔진으로 먼저 만들어 본 미리보기예요.
                학습이 끝나면 훨씬 더 닮은 컷이 나와요!
              </p>
            </div>
          )}

          <p className="mt-5 text-[11px] text-[#a99ba5]">
            원본 사진은 학습 완료 즉시 삭제됩니다 🔒
          </p>
        </div>
      )}
    </main>
  );
}
