// 단어 단위 diff (LCS) — 프롬프트 버전 비교 뷰 (PC-01)

export type DiffPart = { text: string; kind: "same" | "del" | "ins" };

export function wordDiff(a: string, b: string): DiffPart[] {
  const aw = a.split(/\s+/);
  const bw = b.split(/\s+/);
  const m = aw.length;
  const n = bw.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        aw[i] === bw[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (text: string, kind: DiffPart["kind"]) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += " " + text;
    else parts.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aw[i] === bw[j]) {
      push(aw[i], "same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(aw[i], "del");
      i++;
    } else {
      push(bw[j], "ins");
      j++;
    }
  }
  while (i < m) push(aw[i++], "del");
  while (j < n) push(bw[j++], "ins");
  return parts;
}
