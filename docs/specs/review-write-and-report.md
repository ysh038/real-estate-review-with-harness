# 명세: 리뷰 작성·수정·삭제·신고 + rate limit

- 작성일: 2026-08-20
- 상태: 구현됨

## 목표

Phase 1 덩이 A(스키마+읽기)·B(로그인)까지 왔다. 로그인한 사용자가 누구인지는 서버가 알지만
아직 리뷰를 쓸 방법이 없다. 이 명세는 **리뷰 작성·수정·삭제·신고 API + IP 기반 rate limit**을
정의한다(product-spec TODO 덩이 C, 네 줄: 작성 API·수정삭제 API·신고 API·rate limit).
리뷰 목록·작성 폼 UI는 다음 덩이(D).

## 범위 밖

- **리뷰 UI(작성 폼·목록 렌더링)** — 덩이 D.
- **신고 사유 입력·분류** — `review_reports`에 사유 컬럼이 없다(기존 스키마 확정). 신고 이벤트
  자체만 기록한다.
- **관리자 도구(숨김 해제·신고 검토 화면)** — 범위 밖. `hidden_at`은 자동 설정만, 해제 수단 없음.
- **리뷰 신고·수정 이력 조회** — `updated_at`은 두되 API로 노출하지 않는다(읽기 명세와 동일 결정).
- **소프트 삭제** — `DELETE`는 행을 실제로 지운다. "삭제"가 조회 가능한 흔적을 남길 이유가 없다
  (신고 누적으로 숨겨지는 것과는 다른 동작 — 그건 본인이 아니라 커뮤니티가 가리는 것).
- **rate limit을 신고·수정·삭제에도 적용** — 이번엔 **작성(POST 생성)에만** 건다. 수정·삭제는
  이미 "본인 리뷰 1건"으로 자연히 제한되고, 신고는 "리뷰당 1인 1회"로 이미 제한된다
  (`review_reports` unique 제약, 기존 구현). rate limit이 막으려는 건 "여러 계정으로 같은
  사무소에 리뷰를 쏟아붓는" 어뷰징이라 작성에만 의미가 있다.

## 수용 기준

**리뷰 작성** (`POST /api/offices/:id/reviews`)

- [x] AC1: 세션 쿠키 없이 요청하면 401.
- [x] AC2: 존재하지 않는 사무소 id면 404.
- [x] AC3: `rating`이 1~5 범위 밖이면 400.
- [x] AC4: `content`가 10자 미만이면 400.
- [x] AC5: 정상 요청이면 201과 함께 작성자 정보가 포함된 리뷰를 반환한다.
- [x] AC6: 이미 그 사무소에 리뷰를 쓴 사용자가 다시 작성을 시도하면 409(사무소당 1인 1리뷰,
      기존 DB 제약을 API가 명확한 응답으로 변환).
- [x] AC7: 같은 (요청 IP, 사무소) 조합으로 24시간 안에 이미 리뷰가 하나 작성됐으면, **작성자가
      달라도** 429.

**리뷰 수정 · 삭제** (`PATCH` / `DELETE /api/reviews/:id`)

- [x] AC8: 세션 쿠키 없이 요청하면 401.
- [x] AC9: 존재하지 않는 리뷰 id면 404.
- [x] AC10: 본인이 쓰지 않은 리뷰를 수정·삭제하려 하면 403.
- [x] AC11: `PATCH`도 작성과 같은 검증을 적용한다 — `rating`·`content` 위반 시 400
      (부분 수정이 아니라 둘 다 다시 받는다 — AC3·AC4와 동일 규칙).
- [x] AC12: `PATCH` 성공 시 갱신된 리뷰를 반환하고 `updatedAt`이 이전보다 커진다.
- [x] AC13: `DELETE` 성공 시 204를 반환하고, 그 리뷰는 이후 목록 조회(`GET .../reviews`)에서
      사라진다(하드 삭제 — 흔적을 남기지 않는다).

**신고** (`POST /api/reviews/:id/report`)

- [x] AC14: 세션 쿠키 없이 요청하면 401.
- [x] AC15: 존재하지 않는 리뷰 id면 404.
- [x] AC16: 본인이 쓴 리뷰를 신고하려 하면 400.
- [x] AC17: 같은 사용자가 같은 리뷰를 두 번 신고하면 409(기존 DB 제약 확인 완료,
      API 레벨 응답으로 노출).
- [x] AC18: 누적 신고가 4건일 때는 리뷰가 그대로 노출되고, **5번째** 신고가 들어가는 순간
      `hidden_at`이 설정된다.
- [x] AC19: `hidden_at`이 설정된 리뷰는 이후 목록·평점 집계에서 빠진다
      (reviews-schema-and-read-api 명세의 AC5·AC17 회귀 확인 — 새 경로로 숨겨져도 그대로 동작).

## 영향 범위

- **만질 파일**
  - `apps/api/src/db/schema.ts` — `reviews.created_from_ip`(text, nullable) 추가 —
    rate limit 판정에 필요(AC7). 신규 마이그레이션.
  - `apps/api/src/middleware/requireAuth.ts` (신규) — 세션 쿠키 → 사용자 확인, 없으면 401.
    `GET /api/me`가 지금 직접 하고 있는 걸 공용화한다(`routes/auth.ts`도 이걸로 갈아탐,
    동작 무변경).
  - `apps/api/src/lib/clientIp.ts` (신규) — 요청에서 클라이언트 IP를 뽑는 어댑터
    (Bun 런타임 세부사항을 여기 한 곳에 가둔다 — 나머지 코드는 문자열 IP만 다룬다).
  - `apps/api/src/repositories/reviewRepository.ts` — `findById`·`update`·`deleteById`·
    `hasRecentReviewFromIp`·`insertReport`·`hideIfThresholdReached` 추가(개수는 원자적 SQL
    안에서만 쓰여 별도 `countReportsByReviewId` 메서드는 필요 없었다).
  - `apps/api/src/lib/pgErrors.ts` (신규) — `isUniqueViolation`, DB unique 제약 위반 식별.
  - `apps/api/src/lib/sessionCookie.ts` (신규) — 세션 쿠키 이름 상수(발급·검증 양쪽이 공유,
    순환 참조 방지).
  - `apps/api/src/services/reviewService.ts` — `create`·`update`·`remove`·`report` 오케스트레이션
    (권한 확인·검증 실패를 타입화된 에러로 던지고 라우트가 HTTP 코드로 매핑).
  - `apps/api/src/routes/offices.ts` — `POST /:id/reviews` 추가.
  - `apps/api/src/routes/reviews.ts` (신규) — `PATCH`/`DELETE /:id`, `POST /:id/report`.
  - `apps/api/src/app.ts` — `/api/reviews` 라우트 등록.
  - `packages/types/src/review.ts` — `createReviewRequestSchema`(=`updateReviewRequestSchema`,
    같은 모양)
  - `apps/api/src/__tests__/unit/` — `reviewService` 쓰기 케이스, `requireAuth`, `clientIp`,
    새 라우트 계약 테스트
  - `apps/api/src/__tests__/integration/reviewRepository.test.ts` — AC7·AC18 실DB 케이스 추가
- **새 의존성**: 없음.
- **기존 기능 영향**: `GET /api/offices/:id/reviews`·`GET /api/offices/:id`는 무변경(이미
  `hidden_at`을 존중하고 있다 — AC19는 회귀 확인용). `GET /api/me`는 내부 구현만 미들웨어
  공유로 정리, 응답 동작은 그대로.

## 설계 메모

- **rate limit 저장소**: 별도 캐시(Redis 등) 없이 `reviews.created_from_ip` 컬럼 + 쿼리
  (`WHERE office_id = ? AND created_from_ip = ? AND created_at > now() - interval '24h'`)로
  처리한다. 이미 DB에 다 있는 프로젝트에 캐시 계층을 새로 들이는 건 이 규모에서 과설계다.
  **로컬 개발 시 주의**: 개발 머신에서는 요청이 전부 같은 IP(`127.0.0.1`)로 오므로,
  한 사무소에 리뷰를 하나 작성하면 그 사무소는 24시간 동안 로컬에서 더 못 쓴다 — 다른
  사무소로 테스트하거나 DB에서 해당 행을 지워야 한다.
- **신고 임계치의 경합 안전성**: "신고 삽입 → 개수 세기 → hidden_at 갱신"을 세 단계로 따로
  하면 동시에 두 신고가 들어왔을 때 둘 다 count=4로 읽고 threshold를 놓칠 수 있다.
  `hideIfThresholdReached`는 삽입 직후 **단일 SQL**로
  `UPDATE reviews SET hidden_at = COALESCE(hidden_at, now()) WHERE id = ? AND (SELECT count(*) FROM review_reports WHERE review_id = ?) >= 5`
  형태로 처리해 원자성을 확보한다 — `reviews-schema-and-read-api`에서 세운
  "DB 제약은 경합 상황의 최후 방어선" 원칙과 같은 이유다.
- **PATCH는 전체 교체**: `rating`·`content` 둘 다 필수로 받는다. 부분 수정(`rating`만 변경 등)은
  이번 범위가 아니다 — 명세에 안 적힌 partial-update 규칙(누락 필드는 기존값 유지?)을 만들지
  않기 위해서다. 필요해지면 별도 명세로 추가한다.
- **클라이언트 IP 추출을 어댑터로 격리하는 이유**: Bun의 `fetch(request, server)`에서
  `server.requestIP(request)`로 얻는데, 이 런타임 특유의 API를 서비스·라우트 레이어에
  직접 흘리면 테스트가 전부 Bun 서버 기동을 필요로 하게 된다. `lib/clientIp.ts` 하나에
  가두고 나머지는 문자열 IP만 받는다(`kakaoMapEvents.ts`가 SDK를 가둔 것과 같은 패턴).

## 실행 결과 (2026-08-20)

- **AC1~AC19 전부 확인.** api 테스트 114개 통과(단위) + integration 20개(실DB, `app_test`)
  + `bun run dev` 실서버 스모크 테스트.
- **스모크 테스트로 실제 흐름 전체를 검증**: 작성(201, `created_from_ip`에 실제 IP `::1` 기록
  확인) → 같은 IP로 재작성 시도(429, rate limit이 1인1리뷰 409보다 먼저 걸림) → 수정(200,
  사무소 상세 `avgRating` 반영 확인) → 신고 4건(그대로 노출) → 5번째 신고(`hidden_at` 설정,
  목록·집계에서 즉시 0건으로 빠짐) → 삭제(204, 이후 PATCH 404).

### 구현 중 실제로 겪은 문제 2건 (둘 다 수정 완료)

- **`isUniqueViolation`이 실제 운영 경로에서 못 잡았다 — AC17이 500으로 죽었다.**
  단위 테스트는 `{ code: "23505" }`를 직접 던지는 mock으로만 확인했는데, 실제
  drizzle-orm은 postgres 에러를 `DrizzleQueryError`로 감싸고 원본은 `.cause`에 둔다.
  최상위 `code`만 보던 `isUniqueViolation`이 이 형태를 못 잡아 신고 중복(AC17)이 대신
  500을 냈다 — **fake가 실제 에러 모양을 정확히 흉내내지 않아서 단위 테스트를 전부
  통과하고도 스모크 테스트에서 처음 드러난 버그**다. `.cause`까지 한 단계 풀어보도록
  고치고 `pgErrors.test.ts`에 이 형태(코드가 `.cause`에 있는 경우) 테스트를 추가했다.
- **`hono/bun`의 `getConnInfo`를 못 쓴다.** 그 배럴이 함께 re-export하는 `ssg.js`가
  모듈 로드 시점에 전역 `Bun`을 바로 참조해서, vitest(테스트 모듈은 Vite 러너를 거친다)에서
  `"Bun is not defined"`로 즉시 죽었다. `c.env`가 Bun Server 인스턴스라는 사실 하나만
  필요해서 `hono/bun` 없이 `lib/clientIp.ts`에서 직접 구현했다 — 실서버로 확인해보니
  `::1`(로컬 IPv6 loopback)을 정확히 뽑아냈다.

## 열린 질문 (해소됨 — 2026-08-20)

1. **신고 임계치 관련 관리자 알림·검토 화면** → 범위 밖 유지. product-spec 원래 범위(자동
   `hidden_at` 설정까지)만 진행한다. 필요해지면 별도 명세로 다룬다.
