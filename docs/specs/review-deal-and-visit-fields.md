# 명세: 리뷰 작성 필드 확장 — 거래유형·거래결과·방문 시기

- 작성일: 2026-08-24
- 상태: 구현됨

## 목표

Phase 1(덩이 A~D)을 완료 표시한 뒤 원본(`real-estate-agent-review`)의 실제 코드를 대조해보니
리뷰 모델 자체가 달랐다 — 원본에는 별점이 없고, 대신 `dealType`(거래유형)·`dealResult`
(거래결과)·`visitedYear`/`visitedMonth`(방문 시기)로 리뷰를 표현한다(근거: `docs/decisions.md`
#9). 별점은 이미 여러 명세에 걸쳐 구현·검증돼 유지하기로 했고, 이 명세는 그 격차를 좁히는
첫 덩이(E)로 **거래정보·방문 시기 필드를 리뷰 작성/수정 폼에 추가**한다.

## 범위 밖

- **이 필드 기반 필터·정렬** ("전세만 보기", "최근 방문순") — 저장·표시만 한다.
- **거래유형별 통계·집계** (유형별 평균 평점 등) — `officeDetailResponseSchema`는 무변경.
- **사진·태그·비속어 필터·helpful·내 리뷰·관리자 모더레이션** — 각각 덩이 F~J, 이번 범위 아니다.
- **연도·월 하한/상한 재검토** — 원본이 이미 쓰는 값(2000~2100)을 그대로 가져온다. 이 범위
  자체는 인터페이스(계약)이지 구현 코드가 아니라 참고해도 통제변인 위반이 아니다
  (`docs/decisions.md` #9의 "인터페이스만 참고" 기준).

## 수용 기준

**계약 (`packages/types`)**

- [x] AC1: `dealType`은 `"전세" | "월세" | "매매" | "상가" | "원룸·오피스텔"` 중 하나거나
      생략 가능하다. 그 외 문자열이면 유효성 검증 실패.
- [x] AC2: `dealResult`는 `"계약함" | "안 함" | "단순 상담"` 중 하나거나 생략 가능하다.
- [x] AC3: `visitedYear`는 2000~2100 범위의 정수거나 생략 가능하다.
- [x] AC4: `visitedMonth`는 1~12 범위의 정수거나 생략 가능하다.
- [x] AC5: `visitedYear`와 `visitedMonth`는 **함께 있거나 함께 없어야** 한다 — 하나만
      주어지면 검증 실패("연도 없이 월만" 같은 반쪽 데이터를 막는다. 원본과 동일한 제약).

**API 쓰기** (`POST /api/offices/:id/reviews`, `PATCH /api/reviews/:id`)

- [x] AC6: 네 필드를 모두 생략하고 요청해도(기존처럼 `rating`+`content`만) 201/200이 나오고
      응답의 네 필드는 전부 `null`이다 — **하위 호환**, 기존 리뷰 작성 플로우가 깨지지 않는다.
- [x] AC7: 네 필드를 채워 보내면 응답(및 이후 목록 조회)에 그대로 반영된다.
- [x] AC8: AC1~AC5 중 하나라도 위반하면 400이고 리뷰는 생성/수정되지 않는다.
- [x] AC9: `PATCH`도 `POST`와 동일한 스키마·검증을 쓴다 — 이 저장소는 PATCH를 "부분 수정"이
      아니라 "전체 교체"로 이미 확정했으므로(`review-write-and-report` 명세 설계 메모),
      새 필드도 그 규칙을 따른다: 수정 요청에서 생략하면 기존 값이 있었어도 `null`로
      리셋된다(원본의 PATCH는 부분수정이라 다르게 동작하지만, 이 저장소는 기존 확정을 유지).

**API 읽기** (`GET /api/offices/:id/reviews`)

- [x] AC10: 목록의 각 리뷰 항목에 `dealType`·`dealResult`·`visitedYear`·`visitedMonth`가
      포함된다(값이 없으면 `null`).

**UI** (`ReviewSection` 작성 폼 + 목록 항목)

- [x] AC11: 작성 폼에 거래유형 select(5개 옵션 + "선택 안 함")가 있다.
- [x] AC12: 작성 폼에 거래결과 select(3개 옵션 + "선택 안 함")가 있다.
- [x] AC13: 작성 폼에 방문 연도(숫자 입력)·방문 월(1~12 select) 입력이 있고, 연도만
      입력하고 월을 비운 채(또는 반대) 제출하면 클라이언트 검증 에러가 보이고 요청이 나가지
      않는다(AC5의 클라이언트 측 반영).
- [x] AC14: 네 입력 모두 비운 채 제출해도 기존처럼 정상 제출된다(회귀 확인 — 필수 아님).
- [x] AC15: 목록에 표시된 리뷰 항목 중 거래정보·방문시기가 있는 항목은 함께 보이고, 없는
      항목(기존에 작성된 리뷰들)은 해당 줄 자체가 렌더링되지 않는다.

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` — `DEAL_TYPES`·`DEAL_RESULTS` 상수 + enum, 검증 스키마를
    `createReviewRequestSchema`에 `.optional()`로 추가 후 `.refine()`으로 AC5 적용,
    `reviewSchema`에 응답 필드 추가.
  - `apps/api/drizzle/` — 신규 마이그레이션: `reviews`에 `deal_type text`·`deal_result text`·
    `visited_year smallint`·`visited_month smallint` (전부 nullable) 추가.
  - `apps/api/src/db/schema.ts` — 위 4개 컬럼.
  - `apps/api/src/repositories/reviewRepository.ts` — `OWNED_ROW_COLUMNS`·`findByOfficeId`의
    select 목록·`insert`/`update`에 4개 필드 추가.
  - `apps/api/src/services/reviewService.ts` — `ICreateReviewParams`/`IUpdateReviewParams`·
    `toReview`/`toReviewWithAuthor`에 4개 필드 반영.
  - `apps/web/lib/reviewsApi.ts` — 타입은 `@repo/types` 재사용이라 변경 없음(스키마만 넓어짐).
  - `apps/web/components/ReviewSection/ReviewSection.tsx`·`.module.css` — select 2개, 연도
    입력 1개, 월 select 1개, 목록 항목에 거래정보 표시 추가.
  - `apps/api/src/__tests__/unit/reviewService.test.ts`, `apps/web/__tests__/unit/ReviewSection.test.tsx`
    등 기존 테스트 파일에 케이스 추가(신규 파일 없음 — 기존 리뷰 작성 경로의 확장이라).
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존에 작성된 리뷰(네 필드가 DB에 없던 시절 행)는 마이그레이션 직후
  전부 `null`이 되고 AC15에 의해 그 줄은 표시 안 된다 — 데이터 손실이 아니라 "정보 없음"으로
  자연스럽게 처리된다. `review-write-and-report`·`review-list-and-write-ui`의 기존 AC는
  전부 회귀 확인 대상(특히 AC6/AC14의 "필드 생략 시 하위 호환").

## 설계 메모

- **PATCH를 부분수정으로 바꾸지 않는다**: 원본은 `updateReviewBodySchema`에서 이 4개 필드를
  `.nullable().optional()`로 둬 "생략하면 유지, `null`로 보내면 지움" 방식이다. 하지만 이
  저장소는 `review-write-and-report`에서 이미 "PATCH=전체교체"로 확정했고, 그 결정을 지금
  뒤집으면 `rating`/`content`에도 일관성 문제가 생긴다. 그래서 새 필드도 생략 시 `null`로
  리셋되는 전체교체 규칙을 따른다 — 원본과 다른 지점이지만 이 저장소 자체의 기존 결정이 더
  우선한다.
- **연도·월 pairing 검증(AC5)은 원본과 동일하게 가져온다**: 원본의
  `.refine((d) => (d.visitedYear == null) === (d.visitedMonth == null))`과 같은 제약이다.
  이건 API 계약(입력 유효성 규칙)이지 구현 알고리즘이 아니라서 참고해도 통제변인 위반이
  아니라고 판단했다 — 데이터 무결성 관점에서도 "월만 있고 연도가 없는" 상태를 막는 게 맞다.
- **enum 값은 원본 문구를 그대로 쓴다**("전세"·"월세"·"매매"·"상가"·"원룸·오피스텔",
  "계약함"·"안 함"·"단순 상담")**:** 이 값들은 사용자에게 보이는 한국어 라벨이라 새로
  창작하면 오히려 비교 실험의 "같은 개념을 다르게 이름 붙였을 뿐"이라는 잡음이 생긴다.
  도메인 어휘(제3자 API 필드명과 비슷한 성격)로 취급해 그대로 채택한다.
- **레이어**: 기존 리뷰 작성 경로(`ReviewSection` → `useOfficeReviews`/`reviewsApi` →
  `POST/PATCH` 라우트 → `reviewService` → `reviewRepository`)를 그대로 넓히는 것이라 새
  레이어·새 파일이 생기지 않는다.

## 열린 질문

없음 — 원본 인터페이스(enum 값·범위·pairing 규칙)를 그대로 따르기로 확정했고, PATCH
전체교체 원칙은 이 저장소의 기존 결정을 우선했다.

## 실행 결과 (2026-08-24)

- **AC1~15 전부 확인.** Red→Green: 새 테스트 21개(api 15 + web 6) 작성 후 전부 실패 확인
  → 구현 → 전부 통과. 기존 테스트 중 새 필드 누락으로 깨진 fixture 4곳
  (`officeDetailRoute.test.ts`·`reviewsApi.test.ts`·`useOfficeReviews.test.ts`의 리뷰 행
  빌더, `reviewsRoute.test.ts`의 PATCH 정확매치 단정문)을 발견해 함께 고쳤다 — 전부 새
  필드를 채워 넣는 보강이라 단정을 약화시키지 않았다.
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 마이그레이션 적용 후
  `reviewRepository (real DB)` 15개 전부 통과, 그중 신규 케이스("거래정보·방문시기가
  실DB를 왕복한다")로 컬럼명 매핑(camelCase↔snake_case)이 정확한지 확인했다.
- **개발 DB 스모크 테스트**: `bun run db:migrate`로 개발 DB에도 마이그레이션 적용 후,
  기존 실로그인 사용자(닉네임 "유상훈") 세션을 수동으로 하나 심어(스모크 전용, 종료 후
  삭제) `bun run dev` 서버에 직접 curl:
  - 거래정보 채워 작성 → 201, 응답에 그대로 반영.
  - PATCH에서 거래정보 생략 → 200, 기존 값이 있었어도 전부 `null`로 리셋(AC9 전체교체
    확인).
  - 방문 연도만 보내고 월 생략 → 400 (pairing 검증 확인).
  - 잘못된 `dealType`("옥탑방") → 400.
  - 목록 조회(`GET .../reviews`)에 필드가 그대로 노출됨을 확인.
  스모크 테스트로 만든 리뷰·세션 행은 종료 후 직접 삭제했다 — 시딩 데이터(`offices`)는
  건드리지 않았다.
- **원본과의 차이 유지**: 계획대로 PATCH는 원본(부분수정)과 다르게 이 저장소 확정
  규칙(전체교체)을 따랐고, enum 값·범위·pairing 검증은 원본과 동일하게 맞췄다 — 스모크
  테스트로 실제 응답까지 육안 확인했다.
- **버그 없음**: 이번 덩이는 기존에 이미 검증된 리뷰 작성 경로에 필드를 얹는 것이라
  새로 발견된 런타임 버그는 없었다(실DB 통합 테스트가 유일한 위험 지점이었던 컬럼
  매핑을 미리 잡아냈다).
