# 명세: "도움돼요" 토글

- 작성일: 2026-08-25
- 상태: 구현됨

## 목표

원본과 실제 코드를 대조해 발견한 리뷰 모델 격차(`docs/decisions.md` #9)를 좁히는 네 번째
덩이(H). 원본은 리뷰마다 다른 사용자가 "도움이 됐어요"를 토글할 수 있고, 개수와 "내가
눌렀는지"가 함께 노출된다. 이 저장소엔 리뷰에 반응할 방법이 전혀 없다. 이 명세는
**리뷰별 도움돼요 토글 API + 목록에 개수·내 상태 노출 + 버튼 UI**를 정의한다.

## 범위 밖

- **도움순 정렬** ("도움 많은 순") — 읽기 명세(`reviews-schema-and-read-api`)가 이미
  최신순 하나로 확정했다. 저장·집계·표시만 한다.
- **사무소 상세 집계에 총 helpful 합계 노출** — 원본도 사무소 단위 집계엔 이 값이 없다
  (리뷰 개별 단위로만 존재).
- **본인 리뷰 도움돼요 제한** — `report`와 달리 원본에 이 제한이 없다. 그대로 따른다
  (AC8, 설계 메모에서 이유를 명시한다 — 빠뜨린 게 아니라 의도적으로 안 하는 것).
- **도움돼요 취소 시 알림·이력** — 없음.
- **비로그인 사용자의 토글 시도 UX 고도화**(로그인 유도 모달 등) — 버튼을 비활성화하는
  것까지만 한다.

## 수용 기준

**계약 (`packages/types`)**

- [x] AC1: 리뷰 응답에 `helpfulCount`(0 이상 정수)가 포함된다.
- [x] AC2: 로그인한 뷰어가 조회하면 `isHelpful`이 `boolean`(현재 뷰어가 눌렀는지)이다.
- [x] AC3: 비로그인 상태로 조회하면 `isHelpful`이 `null`이다("모름"과 "안 눌렀음"은 다르다 —
      `avgRating`이 "리뷰 없음"에 `null`을 쓰는 것과 같은 원칙).

**API 토글** (`POST /api/reviews/:id/helpful`)

- [x] AC4: 세션 쿠키 없이 요청하면 401.
- [x] AC5: 존재하지 않는 리뷰 id면 404.
- [x] AC6: 처음 누르면 `isHelpful: true`가 되고 응답의 `helpfulCount`가 이전보다 1 크다.
- [x] AC7: 이미 누른 상태에서 다시 누르면(토글 취소) `isHelpful: false`가 되고
      `helpfulCount`가 1 작아진다.
- [x] AC8: 본인이 쓴 리뷰에도 도움돼요를 누를 수 있다(403이 나지 않는다) — `report`와
      의도적으로 다른 동작(원본과 동일, 설계 메모 참고).

**API 읽기 반영** (`GET /api/offices/:id/reviews`)

- [x] AC9: 목록의 각 리뷰 항목에 실제 토글 횟수를 반영한 `helpfulCount`가 나온다.
- [x] AC10: 로그인한 뷰어가 이미 누른 리뷰는 목록에서 `isHelpful: true`로 나온다.
- [x] AC11: 로그인했지만 안 누른 리뷰는 `isHelpful: false`, 비로그인 요청은 전체가
      `isHelpful: null`이다.

**UI** (`ReviewSection` 목록)

- [x] AC12: 각 리뷰 항목에 "도움돼요" 버튼과 현재 개수가 보인다.
- [x] AC13: 로그인 상태에서 누르면 서버 응답 기준으로 그 리뷰 항목의 개수·눌림 상태가
      즉시 갱신된다(목록 전체를 다시 불러오지 않는다).
- [x] AC14: 비로그인 상태면 버튼이 비활성화돼 있고, 클릭해도 요청이 나가지 않는다.
- [x] AC15: 이미 누른 상태에서 다시 누르면(토글 취소) 개수가 줄고 눌림 표시가 사라진다.

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` — `helpfulResponseSchema`(`{helpfulCount, isHelpful}`,
    `isHelpful`은 여기선 `boolean` — 토글은 항상 로그인 상태에서만 일어나 `null` 케이스가
    없다), `reviewSchema`에 `helpfulCount`·`isHelpful` 추가.
  - `apps/api/drizzle/000X_*.sql` (신규) — `review_helpful_votes` 테이블:
    `(review_id, user_id)` 복합 PK, 둘 다 FK cascade. `review_tags`와 같은 모양
    (`review-tags` 명세 선례).
  - `apps/api/src/db/schema.ts` — `reviewHelpfulVotes` 테이블 정의.
  - `apps/api/src/middleware/requireAuth.ts` — `getOptionalAuthUser(c, deps)` 추가.
    세션이 있으면 사용자, 없으면 `null`(401 안 함) — `requireAuth`가 내부적으로 이걸
    호출하도록 리팩터(동작 무변경, 로직 재사용).
  - `apps/api/src/repositories/reviewRepository.ts` — `findByOfficeId`에
    `requestingUserId?: string | null` 매개변수 추가, `findHelpfulCountsByReviewIds`·
    `findUserHelpfulReviewIds`(배치, `findTagsByReviewIds`와 같은 패턴) 추가,
    `toggleHelpful(reviewId, userId): Promise<boolean>`(새 isHelpful 상태 반환) 추가.
  - `apps/api/src/services/reviewService.ts` — `IReviewListRow`에 `helpfulCount`·
    `isHelpful` 추가, `listByOfficeId`에 `requestingUserId` 매개변수 추가,
    `toggleHelpful({reviewId, userId})` 서비스 메서드 추가.
  - `apps/api/src/routes/reviews.ts` — `POST /:id/helpful` 라우트(`requireAuth`).
  - `apps/api/src/routes/offices.ts` — `GET /:id/reviews`에서 `getOptionalAuthUser`로
    조회 후 `requestingUserId`를 서비스에 전달.
  - `apps/web/lib/reviewsApi.ts` — `toggleReviewHelpful(reviewId, baseUrl)`.
  - `apps/web/hooks/useOfficeReviews.ts` — `toggleHelpful(reviewId)`: 서버 응답으로 받은
    `helpfulCount`·`isHelpful`을 그 리뷰 하나에만 반영(목록 전체 재조회 아님 — AC13).
  - `apps/web/components/ReviewSection/ReviewSection.tsx`·`.module.css` — 버튼 + 개수.
  - 기존 테스트 다수(`reviewService.test.ts`·`reviewsRoute.test.ts`·
    `officeReviewWriteRoute.test.ts`·`reviewRepository.test.ts`(통합)·
    `ReviewSection.test.tsx`·`useOfficeReviews.test.ts`)에 케이스 추가.
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존 리뷰(투표 없던 시절 행)는 `helpfulCount: 0`으로 자연스럽게
  처리된다. `GET /api/offices/:id/reviews`는 이제 요청자 식별을 시도하지만 인증을
  요구하지 않는다 — 비로그인 요청은 기존처럼 200을 받는다(회귀 확인).

## 설계 메모

- **본인 리뷰 도움돼요 제한 없음(AC8)은 의도적**: `report`는 "누적되면 자동 숨김"이라는
  결과가 있어 본인 신고로 자기 리뷰를 숨기는 악용을 막아야 했다(`review-write-and-report`
  설계 메모). `helpful`은 그런 부작용이 없는 단순 카운터라 원본도 제한하지 않는다 — 같은
  "토글" 계열 기능이라고 같은 제약을 걸 이유가 없다는 뜻에서 명세에 명시해둔다.
- **읽기 전용 라우트에서 "요청자가 누구인지"가 필요해진 첫 사례**: 지금까지 `GET
  /api/offices/:id/reviews`는 완전히 공개였다. `isHelpful`은 뷰어마다 다른 값이라 이
  라우트도 이제 "로그인했으면 누구인지 알아야" 한다 — 그렇다고 로그인을 강제하면 안
  된다(비로그인도 여전히 목록은 봐야 한다). `requireAuth`(401 강제)와 별개로
  `getOptionalAuthUser`(있으면 사용자, 없으면 `null`, 절대 401 안 함)를 추가하는 이유다.
- **`update()` 응답의 helpfulCount는 실제 값을 반영한다**: 리뷰를 수정해도 그 리뷰에 쌓인
  도움돼요 투표는 그대로 유지된다 — 수정 응답이 `helpfulCount: 0`을 하드코딩해 돌려주면
  실제 값과 어긋난다. `create()`는 방금 만든 리뷰라 투표가 있을 수 없으므로
  `helpfulCount: 0, isHelpful: false`를 그대로 반환해도 정확하다(쿼리 불필요).
- **토글 경합은 단순 check-then-act로 둔다**: 신고 임계치(`hideIfThresholdReached`)처럼
  결과가 누적되어 자동 숨김 같은 부작용을 일으키는 게 아니라 "지금 눌렀는지 아닌지"
  하나만 뒤집는 동작이라, 동시에 두 번 눌러도 최악의 경우 한 번 더 누르면 되는 수준의
  경합이다. 원자적 SQL로 감쌀 만큼의 위험이 아니라고 판단했다.
- **레이어**: `review_helpful_votes` 배치 조회는 `findTagsByReviewIds`와 완전히 같은
  모양(N+1 방지)이라 그 옆에 나란히 둔다(`review-tags` 명세에서 세운 패턴).

## 열린 질문

없음 — 본인 리뷰 제한 여부(AC8)는 원본 인터페이스를 그대로 따르기로 확정했고, 나머지는
기존 명세들이 세운 패턴(전체교체 없음이라 해당 없음, 배치 조회, optional-auth)을 그대로
적용했다.

## 실행 결과 (2026-08-25)

- **AC1~15 전부 확인.** api 레이어(계약·미들웨어·서비스·라우트)를 먼저 세운 뒤 새 테스트
  13개(api 서비스 3 + 라우트 7 + 목록 3) 작성, web 레이어(lib·hook·컴포넌트)는 순서대로
  Red 확인 후 구현 — `toggleReviewHelpful`(lib) 2개, `useOfficeReviews.toggleHelpful` 1개,
  `ReviewSection` 4개 전부 실패 확인 후 통과시켰다. 기존 테스트 중 새 필드 누락으로 깨진
  fixture 6곳(`officeDetailRoute`·`reviewsRoute`·`reviewService`·`reviewsApi`·
  `useOfficeReviews`·`ReviewSection`의 리뷰 행 빌더)을 함께 고쳤다.
  - **테스트 작성 중 실수 발견**: fixture를 일괄 스크립트로 고치다 `reviewRepository.update`
    호출 검증(입력 patch)에 `helpfulCount`/`isHelpful`을 잘못 끼워 넣은 적이 있었다 —
    `update()`의 입력 patch 타입에는 이 필드가 없다(출력 `IReviewOwnedRow`에만 있다).
    실행해서 실패를 보고 나서야 알아챘고, 두 테스트 파일에서 원복했다.
  - **테스트 설정 버그도 하나 발견**: `officeDetailRoute.test.ts`에 로그인 세션 테스트를
    새로 추가하며 세션의 `userId`를 임의값("viewer-1")으로 넣었는데, 페이크
    `userRepository`가 기본 사용자("u-1")만 인식해 "로그인된 상태"가 실제로는 비로그인으로
    해석되고 있었다. 테스트를 실행해 `requestingUserId`가 기대와 다르게 `null`로 나오는
    걸 보고 나서 원인을 찾아 고쳤다 — 리뷰 요구대로 실패를 먼저 확인하는 습관이 이 테스트
    자체의 버그도 잡아준 사례.
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 마이그레이션 적용 후 새 케이스
  5개(첫 토글·재토글 취소·본인 리뷰 허용·여러 사용자 누적·update 후 helpfulCount 유지)
  포함 25개 전부 통과 — 복합 PK·배치 카운트 쿼리·트랜잭션 안의 helpful 재조회가 실제
  Postgres에서 정확히 동작함을 확인했다.
- **개발 DB 스모크 테스트**: 실로그인 사용자 세션을 스모크 전용으로 심어 `bun run dev`
  서버에 직접 curl:
  - 리뷰 작성 → `helpfulCount:0, isHelpful:false` 정확.
  - 첫 토글 → `{helpfulCount:1, isHelpful:true}`.
  - 로그인 상태로 목록 조회 → 그 리뷰의 `isHelpful:true` 반영.
  - 비로그인으로 같은 목록 조회 → `helpfulCount:1`은 그대로, `isHelpful:null`.
  - 재토글(취소) → `{helpfulCount:0, isHelpful:false}`.
  - 인증 없이 토글 시도 → 401.
  스모크로 만든 리뷰·투표·세션 행은 종료 후 직접 삭제했다.
- **버그 없음(구현 자체)**: 실제 런타임 버그는 발견되지 않았다 — 위에서 잡힌 두 건은
  전부 테스트 코드 자체의 실수였고, 실DB 통합 테스트로 구현의 핵심 위험 지점(복합 PK,
  배치 쿼리, 트랜잭션 내 재조회)을 미리 검증했다.
