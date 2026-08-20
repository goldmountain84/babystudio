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
- (해소됨) S12-C 상태 전이·대시보드 KPI/경보·트렌딩 → 아래 참조

**잔여 목 서버화 (전면 실데이터)**
- S12-C 상태 전이: `theme_stages`·`theme_checklists` 테이블 + `GET/POST /api/admin/themes-board` — 체크리스트 게이트 422, GA 리드 승인 403을 서버가 강제
- S12-A 대시보드: 경보=서버 규칙 엔진(live 선택률<50% 긴급·모더레이션 SLA·원가 예산·카나리 안내), KPI 타일=DB 실집계(유사도 평균·C2PA 커버리지·구매 전환율 — 파기 계정 제외), 주간 차트=jobs 일별 실집계
- 트렌딩(H-03): `/api/themes`의 7일 theme_run 실행수 실집계 → 스튜디오 자동 큐레이션 (데이터 없으면 플래그 폴백)

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

**프롬프트 기본 설정 — GPT·1K 프리셋 팩 (2026.08 유행 프롬프트 리서치)**
- `lib/promptPresets.ts`: 4개 성장단계 × 5종 = 20개 프리셋 원문(얼굴 유지 규칙·1K 출력 규칙 포함). 시드 시 각 프리셋이 대응 테마의 **live 버전**이 된다(author `프리셋팩-GPT1K`, 기존 live는 archived — append-only 유지, 멱등)
- 생성 파라미터: **GPT 이미지 단일 모델 · 1K 고정** (세로 1024×1536, 플랫레이·2분할만 정방형 1024×1024) — `model_params`에 기록, 원가 $0.07/컷
- 신규 테마 11종 추가(꽃 리스·D+100 블록·첫 앉기·밀크바스·성장 비교·베어 니트·ONE 풍선·첫 걸음마·돌잡이·색동 클로즈업·한복 가족) → 카탈로그 33종 전부 생성 가능
- 안전 레이어·네거티브 체인·품질 게이트는 기존대로 서버 조립이 주입 (프리셋과 공존)

## 실사 이미지 생성 (OpenAI gpt-image-1)

`server/vendor.ts` — 멀티벤더 어댑터(PC-08). **`.env.local`에 `OPENAI_API_KEY`를 넣고 dev 서버를 재시작하면 시뮬레이터에서 실사 생성으로 자동 전환**된다 (`.env.example` 참조).

- 잡 접수 직후 백그라운드로 gpt-image-1 호출(프리셋 프롬프트 + 네거티브 병합, 1K 해상도 매핑) → `data/assets/<jobId>/<idx>.png` 적재 → tick이 도착 확인 후 완료
- 실비 보호: 잡당 컷 수 상한 `BABYSTUDIO_REAL_CUTS`(기본 4), 원가 $0.063/컷 실기록
- API 실패·타임아웃(150s) 시 시뮬레이터 폴백 + 감사로그 — 사용자 플로우는 끊기지 않음
- 서빙: `GET /api/assets/:id/image?token=` (소유권 검증, 실서비스: S3 서명 URL) → `PhotoArt`가 그라디언트 대신 실이미지 렌더
- **얼굴 유지 생성**: 온보딩이 실제 사진을 업로드(`POST /api/babies/:id/photos`, multipart, 형식·20MB 검증)하고 `data/uploads/<babyId>/`에 얼굴 참조로 보관. 학습은 **참조 3장 이상일 때만** 통과(서버 게이트, 400 TRAIN_GATE). 실사 생성 시 참조가 있으면 `images/generations` 대신 **`images/edits`**(참조 최대 4장 동봉)로 호출 — 프리셋의 "얼굴 유지" 규칙이 실작동. 파기 시 참조 사진 파일까지 삭제(영수증에 장수 기록)

## 실서비스 전환 시 교체 지점

- `lib/store.tsx` → 백엔드 API (인증, 크레딧 원장 hold/confirm/refund, 잡 큐 + SSE)
- `lib/job.ts` 시뮬레이션 → LoRA 학습·이미지 생성 워커 (fal.ai / Replicate)
- `PhotoArt` → S3+CDN 서명 URL 이미지/영상
- 결제 → 토스페이먼츠 / Stripe
