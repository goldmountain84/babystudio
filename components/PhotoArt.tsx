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
  children,
}: Props) {
  return (
    <div className={`ph ${gradient} ${className}`}>
      {video && <div className="shine" />}
      {emoji && (
        <span className="emo" style={emojiSize ? { fontSize: emojiSize } : undefined}>
          {emoji}
        </span>
      )}
      {caption && <span className="cap">{caption}</span>}
      {video && <span className="play">▶</span>}
      {watermark && <span className="wm-tag">WATERMARK</span>}
      {children}
    </div>
  );
}
