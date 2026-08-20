// 실사 촬영/생성 컷이 들어갈 자리를 컬러 아트로 표현한 플레이스홀더
// (디자인 시안의 .ph 컨벤션 그대로)

interface Props {
  gradient: string;
  emoji?: string;
  caption?: string;
  video?: boolean; // 루핑 영상 미리보기 여부 (▶ 오버레이 + shine)
  watermark?: boolean;
  className?: string;
  emojiSize?: number;
  imgSrc?: string | null; // 실사 생성 이미지 — 있으면 그라디언트 대신 표시
  children?: React.ReactNode;
}

export default function PhotoArt({
  gradient,
  emoji,
  caption,
  video,
  watermark,
  className = "",
  emojiSize,
  imgSrc,
  children,
}: Props) {
  return (
    <div className={`ph ${gradient} ${className}`}>
      {imgSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- 서명 URL 서빙, 최적화 프록시 불필요
        <img
          src={imgSrc}
          alt={caption ?? "생성 컷"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {video && <div className="shine" />}
      {emoji && !imgSrc && (
        <span className="emo" style={emojiSize ? { fontSize: emojiSize } : undefined}>
          {emoji}
        </span>
      )}
      {caption && <span className="cap relative z-[1]">{caption}</span>}
      {video && <span className="play">▶</span>}
      {watermark && <span className="wm-tag">WATERMARK</span>}
      {children}
    </div>
  );
}
