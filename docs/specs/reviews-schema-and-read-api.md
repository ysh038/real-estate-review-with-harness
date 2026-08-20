# 명세: reviews 스키마 + 읽기 API

- 작성일: 2026-08-20
- 상태: 구현됨

## 목표

MVP는 사무소를 지도에서 찾는 데까지만 왔다. 이 서비스의 존재 이유인 **리뷰**는 저장할 테이블도,
읽을 경로도 없다. 이 명세는 Phase 1의 첫 덩이로 **영속화 스키마(`users`·`reviews`·
`review_reports`)** 와 **인증이 필요 없는 읽기 API 2개**를 정의한다:
사무소 상세(리뷰 집계 포함)와 리뷰 목록(커서 페이지네이션).

쓰기(작성·수정·삭제·신고)와 카카오 OAuth를 이 덩이에서 뺀 이유는 `offices` 때와 같다 —
**인증 없이 끝까지 검증 가능한 구간에서 자른다.** 쓰기는 로그인이 전제라 OAuth 덩이 뒤에 온다.

## 범위 밖

- **카카오 OAuth·세션 쿠키** — 다음 덩이(B). 이번 API는 전부 비인증 공개 조회다.
- **리뷰 작성·수정·삭제(`POST`/`PATCH`/`DELETE`)** — 덩이 C. 인증이 전제다.
- **신고 API(`POST /api/reviews/:id/report`)와 5회 누적 자동 숨김 로직** — 덩이 C.
  이번엔 `review_reports` **테이블과 `hidden_at` 컬럼만** 만들고, 읽기 쪽에서 `hidden_at`을
  **존중**하기만 한다(아래 AC). 숨김을 *발생시키는* 쪽은 만들지 않는다.
- **리뷰 UI** — 덩이 D.
- **Rate limit** — 덩이 C. 쓰기에만 걸린다.
- **리뷰 정렬 옵션(평점순·도움순)** — 최신순 하나로 시작한다.
- **리뷰 수정 이력·`updated_at` 노출** — 컬럼은 두되 응답에는 넣지 않는다.
- **사무소 목록(bbox) 응답에 평점 얹기** — `officeSummarySchema`는 건드리지 않는다.
  마커 색상 그라데이션이 "하지 않기로 한 것"이라 bbox 응답에 집계가 필요한 화면이 아직 없다.

## 수용 기준

**스키마 · repository** (실제 DB 필요 — `__tests__/integration/`, DB 없으면 skip)

- [x] AC1: 세 테이블이 마이그레이션으로 생성되고, `bun run db:migrate`를 두 번 실행해도 실패하지 않는다.
- [x] AC2: 같은 사용자가 같은 사무소에 리뷰를 두 번 넣으려 하면 **DB 제약으로 거부된다**
      (사무소당 1인 1리뷰 — 애플리케이션 검사에만 맡기지 않는다).
- [x] AC3: 같은 사용자가 같은 리뷰를 두 번 신고하려 하면 DB 제약으로 거부된다
      (한 사람이 혼자 5회를 채워 남의 리뷰를 숨길 수 없어야 한다).
- [x] AC4: 리뷰가 달린 사무소를 조회하면 `avgRating`과 `reviewCount`가 계산돼 나온다.
- [x] AC5: `hidden_at`이 설정된 리뷰는 `reviewCount`·`avgRating` 계산에서 **제외된다**.
- [x] AC6: `rating`이 1~5 범위를 벗어나면 DB 제약으로 거부된다.

**집계 서비스** (repository를 mock한 단위 테스트, DB 불필요)

- [x] AC7: 리뷰가 0건이면 `reviewCount: 0`, `avgRating: null`을 반환한다
      (`0`이 아니다 — "평점 0점"과 "평가 없음"은 다르다).
- [x] AC8: `avgRating`은 소수 첫째 자리까지 반올림해 반환한다 (예: 4.333… → 4.3).

**커서 페이지네이션 서비스** (단위 테스트, DB 불필요)

- [x] AC9: 페이지 크기보다 결과가 많으면 `nextCursor`를 함께 반환한다.
- [x] AC10: 마지막 페이지면 `nextCursor`가 `null`이다.
- [x] AC11: 커서를 넘기면 그 지점 **다음**부터 반환한다 (같은 리뷰가 두 페이지에 겹쳐 나오지 않는다).
- [x] AC12: 잘못된 형식의 커서면 400을 반환한다 (조용히 첫 페이지로 넘어가지 않는다).

**API 계약**

- [x] AC13: `GET /api/offices/:id`가 200과 사무소 정보 + `avgRating`·`reviewCount`를 반환한다.
- [x] AC14: 없는 사무소 id면 404를 반환한다.
- [x] AC15: `GET /api/offices/:id/reviews`가 200과 리뷰 배열 + `nextCursor`를 반환한다.
- [x] AC16: 리뷰 목록의 각 항목에 작성자 닉네임이 포함된다 (UI가 "누가 썼는지"를 보여줘야 한다).
- [x] AC17: `hidden_at`이 설정된 리뷰는 목록에 나오지 않는다.
- [x] AC18: 리뷰는 최신순(작성일 내림차순)으로 반환된다.
- [x] AC19: `limit`이 상한을 넘으면 400을 반환한다 (한 번에 전부 긁어가지 못하게 한다).
- [x] AC20: 응답 타입은 `packages/types`의 zod 스키마에서만 파생된다 (앱 안에 직접 정의 없음).

## 스키마 (제안)

### `users`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | 내부 식별자 |
| `kakao_id` | `text NOT NULL UNIQUE` | 카카오 회원번호. OAuth 덩이에서 이 값으로 조회·생성 |
| `nickname` | `text NOT NULL` | 리뷰 목록에 노출 |
| `profile_image_url` | `text` | 없을 수 있다 |
| `created_at` / `updated_at` | `timestamptz NOT NULL DEFAULT now()` | |

### `reviews`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | |
| `office_id` | `text NOT NULL` → `offices.id` `ON DELETE CASCADE` | |
| `user_id` | `uuid NOT NULL` → `users.id` `ON DELETE CASCADE` | |
| `rating` | `integer NOT NULL` `CHECK (rating BETWEEN 1 AND 5)` | AC6 |
| `content` | `text NOT NULL` `CHECK (char_length(content) >= 10)` | 10자 이상 |
| `hidden_at` | `timestamptz` | 신고 누적 soft hide. `NULL`이면 노출 |
| `created_at` / `updated_at` | `timestamptz NOT NULL DEFAULT now()` | |

제약·인덱스: `UNIQUE (office_id, user_id)` (AC2) · `INDEX (office_id, created_at DESC, id DESC)`
(목록 조회 + 커서 페이지네이션용)

### `review_reports`

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | |
| `review_id` | `uuid NOT NULL` → `reviews.id` `ON DELETE CASCADE` | |
| `reporter_user_id` | `uuid NOT NULL` → `users.id` `ON DELETE CASCADE` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

제약: `UNIQUE (review_id, reporter_user_id)` (AC3)

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` (신규) — `reviewSchema`, `reviewListResponseSchema`,
    `officeDetailResponseSchema`, `reviewListQuerySchema`(cursor·limit)
  - `packages/types/src/index.ts` — 재export
  - `apps/api/src/db/schema.ts` — `users`·`reviews`·`reviewReports` 테이블 추가
  - `apps/api/drizzle/` — 새 마이그레이션 산출물
  - `apps/api/src/repositories/reviewRepository.ts` (신규) — 목록 조회(커서)·집계
  - `apps/api/src/repositories/officeRepository.ts` — `findById` 추가
  - `apps/api/src/services/reviewService.ts` (신규) — 페이지네이션·집계 가공
  - `apps/api/src/services/officeService.ts` — `findDetailById` 추가
  - `apps/api/src/routes/offices.ts` — `GET /:id`, `GET /:id/reviews` 추가
  - `apps/api/src/lib/cursor.ts` (신규) — 커서 인코딩/디코딩 (순수 함수)
  - `apps/api/src/__tests__/unit/` — `reviewService`·`cursor`·라우트 테스트
  - `apps/api/src/__tests__/integration/reviewRepository.test.ts` (신규)
  - `apps/api/src/__tests__/helpers/` — fake repository 추가
- **새 의존성**: 없음 (drizzle·zod·hono 모두 이미 있다)
- **기존 기능 영향**: `offices` 테이블·`GET /api/offices?bbox=` 계약은 **무변경**.
  `officeRepository`에 메서드가 추가되지만 기존 시그니처는 그대로 → 지도 화면 회귀 없음.

## 설계 메모

- **커서 방식**: `(created_at DESC, id DESC)` 복합 키를 base64로 인코딩한 불투명 문자열.
  offset 페이지네이션을 쓰지 않는 이유는 리뷰가 새로 달리면 페이지 경계가 밀려 **같은 리뷰가
  두 번 보이거나 건너뛰어지기** 때문이다(AC11). `created_at`만으로는 동시각 리뷰에서 순서가
  불안정해 `id`를 tie-breaker로 함께 넣는다.
- **불투명 커서인 이유**: 클라이언트가 커서 내부 구조에 의존하기 시작하면 정렬 키를 못 바꾼다.
  base64로 감싸 "우리가 준 걸 그대로 돌려주는 값"으로 취급하게 한다.
- **`hidden_at`을 읽기 쪽에서만 다루는 이유**: 숨김을 *만드는* 로직(신고 5회 누적)은 쓰기
  덩이(C)의 일이다. 다만 컬럼과 "숨겨진 건 안 보인다"는 규칙은 지금 못 박아야, C에서 신고를
  붙일 때 읽기 쪽을 다시 손댈 일이 없다.
- **DB 제약 vs 애플리케이션 검사(AC2·AC3·AC6)**: 둘 다 둔다. 애플리케이션 검사는 좋은 에러
  메시지를 위해, DB 제약은 **경합 상황에서의 최후 방어선**을 위해. 1인 1리뷰를 앱 검사에만
  맡기면 동시 요청 두 건이 둘 다 "없음"을 확인하고 둘 다 쓴다.
- **`users`를 OAuth보다 먼저 만드는 위험**: 카카오 응답 형태를 보기 전에 스키마를 정하는
  셈이라 덩이 B에서 컬럼이 늘 수 있다. 그래서 지금은 **리뷰 표시에 실제로 필요한 최소 3개**
  (`kakao_id`·`nickname`·`profile_image_url`)만 둔다. 토큰·리프레시 저장 등은 B에서 판단한다.
- **레이어**: `offices-schema-and-bbox-query`와 동일 — SQL은 repository, 도메인 판단은 service,
  라우트는 검증→호출→응답. 서비스는 repository 인터페이스에만 의존해 DB 없이 단위 테스트한다.

## 실행 결과 (2026-08-20)

- **AC1~AC20 전부 확인.** api 테스트 68개 통과 — 그중 **integration 12개는 로컬 Postgres(5433)에
  실제로 붙여서** 돌렸다(skip 아님). DB 제약(AC2·AC3·AC6·본문 10자)은 실제로 `insert`를 시도해
  거부되는 것을 확인했다.
- **실서버 스모크 테스트**: 사무소 1건 + 사용자 3명 + 리뷰 3건(그중 1건 `hidden_at` 설정)을 넣고
  `bun run dev` API를 실제로 호출했다.
  - `GET /api/offices/smoke-office` → `avgRating: 4.5, reviewCount: 2` — 숨겨진 1점짜리가
    집계에서 정확히 빠졌다(AC5). 없는 id는 404(AC14).
  - `GET .../reviews` → 최신순 2건, 숨김 리뷰 미노출(AC17·AC18), 작성자 닉네임·프로필 이미지
    포함(AC16), 프로필 이미지 없는 사용자는 `null`.
  - `limit=1`로 페이지를 넘겨 2페이지가 **겹치지 않고** 다음 리뷰를 반환하는 것을 확인(AC9·AC11).
  - 깨진 커서 400(AC12), `limit=51` 400(AC19).

### 구현 중 발견한 실제 문제 2건

- **integration 테스트끼리 같은 DB를 두고 경합했다** (실제 버그, 수정 완료). `officeRepository`와
  `reviewRepository` 두 파일이 병렬로 돌면서, 한쪽의 `beforeEach` 정리(`delete(offices)`)가
  다른 쪽이 방금 넣은 사무소를 지워 **FK 위반과 유령 실패**가 났다. 단위 테스트만 있을 때는
  드러나지 않다가 integration 파일이 둘이 되는 순간 터졌다.
  → `apps/api/vitest.config.ts`에 `fileParallelism: false`. 공유 자원(실 DB) 하나를 쓰는 이상
  직렬이 정답이다. 파일이 11개뿐이라 속도 손해는 무시할 수준.
- **`seedService`가 필요 이상으로 넓은 타입에 의존하고 있었다** (설계 결함, 수정 완료).
  `IOfficeWriteRepository`에 조회 메서드(`findById`·`findVisibleRatingsByOfficeId`)를 더하자
  시딩 테스트 6곳이 전부 타입 에러를 냈다 — 시딩은 `upsertMany`만 쓰는데도.
  → `IOfficeUpsertRepository`(upsert 전용)를 분리해 `seedService`가 그것만 의존하게 했다.
  **게이트가 잡아준 설계 결함이다** — 타입체크가 없었으면 fake를 부풀려 덮었을 자리다.

## 열린 질문 (해소됨 — 2026-08-20)

1. **리뷰 목록 페이지 크기** → 기본 **20**건, `limit` 상한 **50**.
2. **작성자 표시 범위(AC16)** → **닉네임 + 프로필 이미지 URL** 둘 다 내린다. 카카오 프로필
   이미지는 이미 공개된 값이고, UI에서 안 쓰기로 하면 그때 응답에서 빼는 편이 계약을 나중에
   넓히는 것보다 쉽다.
