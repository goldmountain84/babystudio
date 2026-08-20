// BE-4 · CRM 저니 엔진 (§3.2) — 카카오 알림톡의 데모 대체(인앱 알림 센터)
// D-day 시나리오: D-30 미리 준비 → D-14 패키지 → D-7 시즌 결합 → D-day 축하.
// key UNIQUE로 멱등 — 저니는 몇 번을 돌려도 1회만 발송된다.

import { type DB } from "./db";

const MILESTONES: { at: number; label: string; milestone: string }[] = [
  { at: 50, label: "50일", milestone: "d50" },
  { at: 100, label: "백일", milestone: "d100" },
  { at: 200, label: "200일", milestone: "d200" },
  { at: 365, label: "첫돌", milestone: "dol-hanbok" },
];

const JOURNEY: { t: number; title: (n: string, l: string) => string; body: (n: string, l: string) => string }[] = [
  {
    t: 30,
    title: (n, l) => `${n} ${l}이 한 달 앞이에요`,
    body: (_, l) => `${l} 테마를 미리 구경하고 위시리스트에 담아두세요`,
  },
  {
    t: 14,
    title: (n, l) => `${n} ${l} D-14 — 패키지로 준비하세요`,
    body: () => `스튜디오 패키지(30컷+영상 1개)면 기념일 준비 끝이에요`,
  },
  {
    t: 7,
    title: (n, l) => `${l}까지 일주일!`,
    body: () => `시즌 테마와 함께 찍으면 더 특별해져요`,
  },
  {
    t: 0,
    title: (n, l) => `🎉 오늘은 ${n} ${l}!`,
    body: () => `축하해요! 오늘의 기념 컷, 놓치지 마세요`,
  },
];

export function pushNotification(
  db: DB,
  userId: string,
  key: string,
  type: "dday" | "job_done" | "expiry" | "season",
  title: string,
  body: string,
  link?: string
): void {
  db.prepare(
    `INSERT OR IGNORE INTO notifications (user_id, key, type, title, body, link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, key, type, title, body, link ?? null, Date.now());
}

/** D-day 저니 실행 (lazy — 알림 조회 시) */
export function runJourney(db: DB, userId: string): void {
  const babies = db
    .prepare("SELECT id, name, birthday FROM baby_profiles WHERE user_id = ?")
    .all(userId) as { id: string; name: string; birthday: string }[];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const b of babies) {
    const birth = new Date(b.birthday + "T00:00:00");
    if (isNaN(birth.getTime())) continue;
    const days = Math.floor((today.getTime() - birth.getTime()) / 86400000);
    for (const m of MILESTONES) {
      const dday = m.at - days;
      if (dday < 0) continue; // 지난 마일스톤
      for (const step of JOURNEY) {
        if (dday <= step.t) {
          pushNotification(
            db,
            userId,
            `dday-${b.id}-${m.at}-${step.t}`,
            "dday",
            step.title(b.name, m.label),
            step.body(b.name, m.label),
            `/studio`
          );
        }
      }
    }
  }
}

export function listNotifications(db: DB, userId: string) {
  runJourney(db, userId);
  return db
    .prepare(
      "SELECT id, type, title, body, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30"
    )
    .all(userId);
}

export function markRead(db: DB, userId: string, id?: number): void {
  if (id != null) {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?").run(userId, id);
  } else {
    db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
  }
}
