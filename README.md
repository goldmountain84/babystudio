# BabyStudio.ai — 시절 AI 베이비스튜디오

아기 사진 몇 장만 올리면 전문 스튜디오급 컨셉 화보와 영상을 AI로 만들어주는 웹 서비스의 **MVP 프론트엔드 구현**입니다.

- 기획 문서: `babystudio_기획서.md` / `babystudio_화면기획서.html` / `babystudio_디자인시안.html` (Downloads)
- 스택: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

## 구현 범위 (화면기획서 기준)

| 화면 | 경로 | 상태 |
|---|---|---|
| S01 랜딩 | `/` | ✅ 히어로·비포/애프터·마일스톤 스트립·신뢰 배지·FAQ |
| S02 가입/로그인 | `/login` | ✅ 소셜 로그인(목), 보호자 확인 필수 체크 |
| S03 온보딩 | `/onboarding` | ✅ 아기 정보 → 사진 업로드(목) → AI 학습 시뮬레이션 |
| S04 스튜디오 홈 | `/studio` | ✅ D-day 배너, 마일스톤 탭(생일 기준 자동 선택), 앱 카드 갤러리, 검색, 트렌딩 |
| S05 테마 앱 시트 | `/studio/app/[id]` | ✅ 오버레이 시트, 원탭 생성, 고급 옵션(의상/배경/결과물), 크레딧 부족 인라인 충전 유도 |
| S06 생성 진행 | `/studio/generate/[jobId]` | ✅ 단계 표시·진행률·팁 카드, 하단 글로벌 잡 바 |
| S07 결과 갤러리 | `/album/item/[id]` | ✅ 베스트컷 골드 강조, 워터마크 정책, 고해상도(2C)·영상 변환(10C)·재생성·공유 CTA |
| S08 영상 스튜디오 | `/video` | ✅ 무빙 클립(모션 프리셋·길이/BGM/포맷·크레딧 차등, 무료 3초 워터마크 미리보기), 성장 타임랩스(유료 30C, 컷 4~10장), 내 영상 갤러리 |
| S09 마이 앨범 | `/album` | ✅ 월별 타임라인, 굿즈(V2 예고), 보관 정책 안내 |
| S10 요금제 | `/pricing` | ✅ 무료/패키지(앵커)/멤버십 + 크레딧 팩 (데모 충전) |
| S11 마이페이지 | `/mypage` | ✅ 프로필·크레딧 현황·알림 설정·전체 데이터 파기 |
| S12 관리자 콘솔 | `/admin` | ✅ 고도화 기획서 v2.0 기준 7개 모듈 (아래) |
| S12-A 대시보드 | `/admin` | ✅ 북극성 KPI 타일, 경보(급락 감지·원가 예산), 7일 잡 차트, 운영 큐, 감사로그 |
| S12-B 프롬프트 컨트롤 ★ | `/admin/prompts` | ✅ 버전 체인·diff·롤백, 금지 토큰 린터(저장 차단), 네거티브 3단 상속+안전 레이어(편집 불가), 4-eyes 승인, 카나리 5%→표본 200 자동 승격/중단, 플레이그라운드(시드 고정 A/B 블라인드+유사도 게이트), 어휘 사전 |
| S12-C 테마 CMS | `/admin/themes` | ✅ 라이프사이클 보드(draft→GA→sunset), 시즌 캘린더, 랭킹 가중치 튜너 |
| S12-D 실험 | `/admin/experiments` | ✅ 프롬프트/가격 A/B 지표·자동 승격 상태 |
| S12-E 모더레이션 | `/admin/moderation` | ✅ 회색지대 큐(승인/차단/에스컬레이션), CSAM 프로토콜 안내 |
| S12-F 사용자·CS | `/admin/users` | ✅ 사용자 360, 크레딧 수동 조정(사유 코드 필수→원장·감사로그) |
| S12-G 매출·원가 | `/admin/revenue` | ✅ 전환 퍼널, 코호트 리텐션, 테마별 손익 |
| 공유 랜딩 (R-05) | `/share/[id]` | ✅ 워터마크 컷만 노출 + "나도 만들기" 퍼널 + 리퍼럴 안내 |

## 데모 동작 방식

백엔드 없이 전체 퍼널이 동작하도록 목 처리했습니다 (`lib/store.tsx`, localStorage 영속):

- **로그인**: 소셜 버튼 클릭 = 즉시 로그인, 가입 보상 크레딧 12C 지급
- **AI 학습/생성**: 타이머 시뮬레이션 (학습 8초, 화보 15초, 영상 10초 — `lib/job.ts`)
- **영상**: S07 컷 상세의 "영상으로 만들기" → 영상 스튜디오로 소스 컷 프리셀렉트 라우팅 (R-02). 유료 클립 완성 시 해당 앨범 컷에 ▶ 표시
- **크레딧**: 생성 시 차감, 고해상도 2C·영상 10C, 충전은 요금제 페이지에서 즉시 반영
- **이미지**: 실사 컷 자리는 디자인 시안의 컬러 그라디언트 아트로 표현 (`components/PhotoArt.tsx`)
- **테마 카탈로그**: `lib/data.ts` — 마일스톤 6분류 × 22개 앱 (실서비스에서는 관리자 CMS)
- **어드민**: `lib/adminStore.tsx` — 프롬프트 버전 상태기계(draft→review→approved→canary→live→archived), 린터, 감사로그를 클라이언트에서 시뮬레이션. 시드는 `lib/adminData.ts`
- **어드민 거버넌스(화면기획서 v2 반영)**: 역할 전환기(리드/운영자/모더레이터/CS)로 RBAC 시연 — 역할별 모듈 탭 필터링 + 직접 접근 403, 4-eyes(작성자 본인·비리드 승인 차단), 롤백 사유 모달+카나리 자동 중단, 테마 전이 체크리스트 게이트(GA는 리드만), 개인정보 열람 사유 모달→감사로그, 100C 초과 조정 리드 전용, 모더레이션 이미지 기본 블러(해제 시 열람 기록)
- **고도화 P0 반영(사용자 측)**: 생성 진행에 품질 게이트 단계(Q-01), 결과 화면 유사도 표시, 온보딩 웰컴 매직 컷(§3.1), 마이페이지 삭제 영수증(TR-01)
- 고도화 기획 원문: `docs/babystudio_고도화기획서.html` · 어드민 화면기획서 v2: `docs/babystudio_어드민_화면기획서_v2.html` · 백엔드 설계서: `docs/babystudio_백엔드설계서.html`

## BE-1 백엔드 (백엔드 설계서 §13 첫 스프린트)

`server/`(도메인 레이어, NestJS 이식 가능한 순수 함수) + `app/api/*`(라우트) + Node 내장 `node:sqlite`(`data/babystudio.db`). 테스트: `npm test` (vitest 25건).

| 모듈 | 내용 |
|---|---|
| `server/db.ts` | 설계서 §3 스키마 — append-only 원장, live/canary 테마당 1행 partial unique index |
| `server/ledger.ts` | hold(즉시 차감)→confirm/refund, balance_after 체인 검증, 리컨실, 웹훅 멱등 지급 |
| `server/prompts.ts` | 버전 상태기계(4-eyes 서버 강제), 카나리 해시 버킷 라우팅, 조립(어휘 치환+개월수+네거티브 체인+**안전 레이어 상수**+재린트) |
| `server/jobs.ts` | 멱등키, lazy tick 상태 전이, 품질 게이트(1.4배 생성→유사도 상위 N 노출), 실패 자동 환불 |
| `server/auth.ts` | 소셜 로그인 목→세션 토큰, 가입 보상, 웹훅 HMAC-SHA256 |

주요 API: `POST /api/auth/:provider` · `POST /api/babies(+/train)` · `GET /api/themes` · `POST /api/jobs`(Idempotency-Key) · `GET /api/jobs/:id(/stream SSE)` · `POST /api/assets/:id/hires` · `POST /api/webhooks/payment`(x-babystudio-signature) · `POST /api/admin/versions(+/:id/:action)` (x-admin-actor / x-admin-role: lead|operator|moderator|cs)

`assembled_prompt`는 어떤 API 응답에도 포함되지 않는다(서버 조립 원칙). 웹훅 데모 시크릿: `demo-webhook-secret` (env `PAYMENT_WEBHOOK_SECRET`).

**프론트 전환 완료(§12)** — `lib/store.tsx`는 이제 API 기반: 크레딧·잡·앨범·프로필의 진실은 서버 원장/DB이고, 클라이언트에는 세션 토큰 + 영상 클립 목(BE-3 전) + 표시용 오버레이만 남는다. 결제는 `/api/orders`(데모 PG)가 서명 웹훅을 발사해 지급 — 지급 경로는 웹훅 하나뿐.

**BE-2 (신뢰·운영) 반영분**
- 전 테마 22종 live 프롬프트 체인 (시드 자동 등록, author `시스템-시드` — 실서비스는 테마 CMS 등록)
- 파기 파이프라인 서버화(TR-01): `POST /api/me/purge` — assets→jobs→profiles→sessions 삭제 + 계정 가명화, 원장·감사로그는 법정 보존, SHA-256 루트 해시 영수증 발급 (마이페이지 연동)
- 모더레이션 서버화(MD): `moderation_items` 테이블, 품질 게이트 하한(<0.78) 근접 잡 자동 플래그, `GET/POST /api/admin/mod*` (결정 권한 모더레이터·리드 — 서버 강제, decided_by 기록), 어드민 화면 연동
- 운영 지표: `GET /api/admin/stats` (24h 잡·매출·크레딧 유통·감사로그 실집계) → S12-A "라이브 백엔드" 섹션
- 주의: `server/db.ts` DDL 변경 시 dev 서버 재시작 필요 (DB 싱글턴이 핫리로드를 넘어 유지됨)

**BE-2 잔여분 (어드민 서버 연동 완료)**
- S12-B 프롬프트 컨트롤 센터: 목록·상세가 서버 API 기반 — `GET /api/admin/prompts-overview`, `GET /api/admin/versions/detail`(원문 열람도 감사), 전이는 기존 `/versions/:id/:action`(promote에 사유), **카나리 배치 틱 서버화** `POST /api/admin/themes/:id/canary-tick`(표본 +50 → 200 도달 시 서버가 자동 승격/중단 판정, `version_metrics` 테이블). 에디터 저장은 서버 린터 422를 그대로 표시
- S12-F 사용자·CS 콘솔: `GET /api/admin/users`(실사용자), `GET /api/admin/users/:id?view_reason=`(사유 없으면 400 — DF-01 서버 강제), `POST /api/admin/users/:id/credits`(100C 초과 리드만 — 403 FOUR_EYES_REQUIRED)
- C2PA 스텁(TR-02): 후처리에서 `assets.c2pa_manifest` 기록 (실서비스: KMS 서명 매니페스트)
- 아직 로컬 목: S12-C 테마 CMS 상태 전이, 대시보드 목표 KPI 타일·경보

**BE-3 (성장 장치) 반영분**
- 영상 워커 서버화(V-01·02): `clips` 테이블 + `POST/GET /api/clips` — **가격은 서버가 계산**(5초 10C/10초 18C/15초 25C/타임랩스 30C, 클라이언트 값 불신), 소스 컷 소유권·타임랩스 최소 4컷 서버 검증, hold→confirm, 미리보기는 0C·3초 강제, C2PA·원가 기록. 영상 스튜디오 UI는 접수와 폴링만
- 실험 플랫폼 서버화(S12-D): `GET /api/admin/experiments` — 진행 실험 = 카나리 테마(version_metrics 파생), 이력 = 감사로그의 승격/중단 이벤트. 가격 실험은 BE-4 픽스처
- 원가 기록(IN-06): 잡 완료 시 엔진별 `jobs.cost_usd`(LoRA $0.08/컷 등), 클립 `cost_usd`($0.12/초) → stats의 24h 원가 실집계 → 대시보드 표시
- 리컨실 배치(IN-02): `POST /api/admin/reconcile`(리드) — 전 사용자 원장 체인 검증 + 24h 미결 hold 강제 반환. 대시보드 버튼
**BE-4 (스케일) 반영분**
- 구독 빌링(P-02): `subscriptions` 테이블 + `POST /api/subscriptions(/cancel)` — 지급은 주기별 멱등 order id로 **웹훅 경로(settleOrder)만 사용**, lazy 갱신 배치(`/me` 접근 시 경과 주기 일괄 지급), 해지는 기간만료·잔여 크레딧 유지(2클릭). **멤버십 전용 테마는 잡 생성 시 서버가 강제**
- CRM 저니(§3.2): `notifications` 테이블 + D-day 저니 엔진(D-30/14/7/D-day, key 멱등) + 생성 완료 알림 → 네비게이션 알림 센터(🔔). 실서비스: 카카오 알림톡+웹푸시
- 가격 실험 인프라(DX): `experiment_assignments` 해시 버킷(신규 한정·배정 불변), **패키지 가격은 서버 배정이 확정**(클라이언트 금액 불신), purchase 이벤트 variant 태깅 → 어드민 실험에 배정×구매 전환율 실집계
- 잔여(외부 연동 전제): 실제 알림톡/PG 정기결제 연동, 굿즈 파트너 API, i18n, SOC 2

## 실서비스 전환 시 교체 지점

- `lib/store.tsx` → 백엔드 API (인증, 크레딧 원장 hold/confirm/refund, 잡 큐 + SSE)
- `lib/job.ts` 시뮬레이션 → LoRA 학습·이미지 생성 워커 (fal.ai / Replicate)
- `PhotoArt` → S3+CDN 서명 URL 이미지/영상
- 결제 → 토스페이먼츠 / Stripe
