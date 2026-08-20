"use client";

// S03 온보딩 — 실제 사진 업로드 (multipart) → 서버 학습 게이트(참조 3장 필수)
// 실서비스: 업로드 즉시 얼굴 검출·블러·동일인 자동 검사 (O-01)

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const TRAIN_MS = 8000;
const MAX_FILES = 10;

export default function Onboarding() {
  const router = useRouter();
  const { registerBaby, baby, hydrated } = useStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const registered = useRef(false);
  const picker = useRef<HTMLInputElement | null>(null);

  // 미리보기 URL — 파일 변경 시 재생성, 언마운트 시 해제
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  useEffect(() => {
    if (hydrated && baby?.trained && step === 1) router.replace("/studio");
  }, [hydrated, baby, step, router]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) =>
      [...prev, ...Array.from(list).filter((f) => f.type.startsWith("image/"))].slice(0, MAX_FILES)
    );
  };

  useEffect(() => {
    if (step !== 3) return;
    // 실제 API: 프로필 생성 → 사진 업로드 → 학습 — 애니메이션과 병행
    if (!registered.current) {
      registered.current = true;
      void registerBaby(name, birthday, files).then((r) => {
        if (!r.ok) setApiError(r.error ?? "등록 실패");
        else setUploaded(r.uploaded ?? files.length);
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
            {name}의 사진 3~{MAX_FILES}장을 올려주세요
          </p>
          <p className="mt-1 text-xs text-sub">
            정면·측면·웃는 얼굴 등 다양한 각도일수록 얼굴이 더 닮게 나와요
          </p>
          <input
            ref={picker}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {previews.map((src, i) => (
              <div key={i} className="relative h-[84px] overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 미리보기 objectURL */}
                <img src={src} alt={`업로드 ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  onClick={() => setFiles((f) => f.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-black/50 text-[10px] text-white"
                  aria-label="사진 제거"
                >
                  ✕
                </button>
              </div>
            ))}
            {files.length < MAX_FILES && (
              <button
                onClick={() => picker.current?.click()}
                className="flex h-[84px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-cream text-[11px] font-bold text-sub transition-all hover:border-rose"
              >
                <span className="text-xl">📷</span>
                사진 선택
              </button>
            )}
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
            JPG·PNG·WebP·HEIC · 장당 20MB 이하 — 서버가 자동 검증해요
          </p>
          <div className="mt-5 rounded-xl bg-cream px-4 py-3 text-center text-[11.5px] leading-relaxed">
            🔒 사진은 얼굴 참조로만 사용되고 외부 모델 학습에 쓰이지 않으며,
            데이터 파기 시 <b>즉시 삭제</b>됩니다
          </div>
          <button
            onClick={() => setStep(3)}
            disabled={files.length < 3}
            className="cta big mt-5 w-full"
          >
            AI 학습 시작하기 ({files.length}/3장 이상)
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="card fadeup px-7 py-10 text-center">
          <span className="pulse-soft text-5xl">👶✨</span>
          <p className="serif mt-4 text-[20px] font-bold">
            {apiError
              ? "등록에 실패했어요"
              : progress >= 100
                ? `${name}의 AI 프로필이 완성됐어요!`
                : `${name}의 얼굴을 배우는 중이에요`}
          </p>
          {apiError ? (
            <>
              <p className="mt-3 text-[12.5px] font-bold text-rose-d">{apiError}</p>
              <button
                className="cta ghost mt-5"
                onClick={() => {
                  registered.current = false;
                  setApiError(null);
                  setStep(2);
                }}
              >
                사진 다시 올리기
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto mt-5 h-2 w-full max-w-[320px] overflow-hidden rounded bg-[#f0e4e0]">
                <i
                  className="block h-full bg-gradient-to-r from-rose to-[#f0a1bc] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-sub">
                {progress >= 100
                  ? "스튜디오로 이동할게요 🎉"
                  : `${Math.round(progress)}%${uploaded != null ? ` · 참조 사진 ${uploaded}장 업로드됨` : ""} · 완료되면 알림을 보내드려요`}
              </p>
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
            </>
          )}
          <p className="mt-5 text-[11px] text-[#a99ba5]">
            참조 사진은 얼굴 유지 생성에만 사용됩니다 🔒
          </p>
        </div>
      )}
    </main>
  );
}
