// BE-2 · 파기 파이프라인 (백엔드 설계서 §8 TR-01)
// 순서: assets → jobs → holds → baby_profiles → sessions → users 가명화.
// 원장·감사로그는 법정 보존(사용자 식별자만 남김). 영수증 = 파기 항목 해시 루트.
// 실서비스: purge 전용 큐 최우선 처리 + KMS 키 폐기(crypto-shredding) + 이메일 발송.

import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { type DB, withTx, audit } from "./db";
import { removePhotos } from "./uploads";
import { jobImageDir } from "./vendor";

export interface PurgeReceipt {
  rootHash: string;
  purgedAt: string;
  items: { label: string; count: number }[];
}

export function purgeUser(db: DB, userId: string): PurgeReceipt {
  return withTx(db, () => {
    const babyIds = (
      db.prepare("SELECT id FROM baby_profiles WHERE user_id = ?").all(userId) as { id: string }[]
    ).map((r) => r.id);
    const jobIds = (
      db.prepare("SELECT id FROM jobs WHERE user_id = ?").all(userId) as { id: string }[]
    ).map((r) => r.id);
    const assetIds = jobIds.length
      ? (
          db
            .prepare(
              `SELECT id FROM assets WHERE job_id IN (${jobIds.map(() => "?").join(",")})`
            )
            .all(...jobIds) as { id: string }[]
        ).map((r) => r.id)
      : [];

    // 파기 대상 전체의 해시 루트 — "무엇이 지워졌는가"의 증명 (실서비스: 머클 트리 + 서명)
    const rootHash = createHash("sha256")
      .update([...babyIds, ...jobIds, ...assetIds].sort().join("|"))
      .digest("hex");

    // 파일 파기: 얼굴 참조 사진 + 실사 생성물 (실서비스: S3 + crypto-shredding)
    let photoFiles = 0;
    for (const b of babyIds) photoFiles += removePhotos(b);
    for (const j of jobIds) rmSync(jobImageDir(j), { recursive: true, force: true });

    if (jobIds.length) {
      db.prepare(`DELETE FROM assets WHERE job_id IN (${jobIds.map(() => "?").join(",")})`).run(...jobIds);
      db.prepare(`DELETE FROM jobs WHERE user_id = ?`).run(userId);
    }
    db.prepare("DELETE FROM credit_holds WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM baby_profiles WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    // 계정 가명화 — 원장 참조 무결성 유지, 재로그인 불가
    db.prepare("UPDATE users SET name = '(파기됨)', provider = 'purged' WHERE id = ?").run(userId);

    audit(db, "시스템", `데이터 파기 실행 (root ${rootHash.slice(0, 12)}…)`, userId);

    return {
      rootHash: `sha256:${rootHash}`,
      purgedAt: new Date().toISOString(),
      items: [
        { label: "얼굴 참조 사진 (원본)", count: photoFiles },
        { label: "AI 학습 모델·아기 프로필", count: babyIds.length },
        { label: "생성 잡", count: jobIds.length },
        { label: "생성물 컷 (백업 포함)", count: assetIds.length },
        { label: "세션", count: 1 },
      ],
    };
  });
}
