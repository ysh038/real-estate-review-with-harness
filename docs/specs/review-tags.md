# 명세: 리뷰 태그 (REVIEW_TAGS) + 사무소별 태그 집계

- 작성일: 2026-08-25
- 상태: 확정

## 목표

원본과 실제 코드를 대조해 발견한 리뷰 모델 격차(`docs/decisions.md` #9)를 좁히는 두 번째
덩이(F). 원본은 리뷰마다 미리 정의된 6개 태그 중 여러 개를 붙일 수 있고, 사무소별로
태그 집계(`tagCounts`)를 보여준다. 이 명세는 **리뷰에 태그 붙이기 + 사무소 상세·bbox
목록 양쪽에 태그 집계 노출 + 작성 폼·목록 UI**까지를 정의한다.

## 범위 밖

- **지도 마커 색상·클러스터에 태그 반영** — 원본에도 없다. `docs/product-spec.md`
  "하지 않기로 한 것"의 "마커 색상 그라데이션 안 함" 결정과 같은 이유.
- **태그별 필터·정렬** ("친절함 태그만 보기") — 저장·집계·표시만 한다.
- **자유 입력 태그(커스텀 태그)** — 화이트리스트 6개만. 원본도 고정 목록이다.
- **비속어 필터·helpful·내 리뷰·관리자 모더레이션** — 각각 덩이 G~J.
- **`tagCounts` 상위 개수(N)를 설정 가능하게** — 상수로 고정(아래 열린 질문 #2에서 확정).

## 수용 기준

**계약 (`packages/types`)**

- [x] AC1: 리뷰의 `tags` 배열 각 값은 `"매물 많음" | "응답 빠름" | "허위매물 없음" |
      "친절함" | "강매 없음" | "설명 꼼꼼"` 6개 중 하나여야 한다. 그 외 문자열이 섞이면
      검증 실패.
- [x] AC2: `tags` 배열은 최대 6개까지 — 7개 이상이면 검증 실패(태그 종류 자체가 6개뿐이라
      실질적으로는 "전부 선택"과 같은 경계값이다. 원본 계약 그대로 가져온다).

**API 쓰기** (`POST /api/offices/:id/reviews`, `PATCH /api/reviews/:id`)

- [x] AC3: `tags`를 생략하고 요청해도 201/200이 나오고 응답의 `tags`는 빈 배열이다 —
      하위 호환(기존 리뷰 작성 플로우가 깨지지 않는다).
- [x] AC4: `tags`를 채워 보내면 응답 및 이후 목록 조회에 그대로 반영된다.
- [x] AC5: AC1·AC2를 위반하면 400이고 리뷰는 생성/수정되지 않는다.
- [x] AC6: `PATCH`에서 `tags`를 생략하면 기존 태그가 **전부 삭제**된다 — 이 저장소가
      `review-write-and-report` 명세에서 이미 확정한 "PATCH=전체교체" 원칙을 새 필드에도
      그대로 적용한다(`review-deal-and-visit-fields`와 같은 판단).
- [x] AC7: 같은 태그를 배열에 중복으로 넣어도(예: `["친절함","친절함"]`) 저장은 1건으로
      처리되고 500이 나지 않는다 — `review_tags`의 PK가 (리뷰, 태그) 조합이라 그대로
      insert하면 unique violation이 나므로 서비스 레이어에서 중복을 제거하고 저장한다.

**API 읽기**

- [x] AC8: 리뷰 목록(`GET /api/offices/:id/reviews`)의 각 항목에 `tags`가 포함된다
      (없으면 빈 배열).
- [x] AC9: 사무소 상세(`GET /api/offices/:id`)에 `tagCounts`가 포함된다. 숨겨진
      (`hidden_at` 있는) 리뷰의 태그는 집계에서 **제외**된다 — `avgRating`·`reviewCount`가
      숨김 리뷰를 빼는 것과 같은 원칙(`reviews-schema-and-read-api` AC5).
      개수 내림차순으로 정렬된다.
- [x] AC10: bbox 목록(`GET /api/offices`)의 각 사무소 항목에도 `tagCounts`가 포함되지만
      **상위 2개**로 제한된다(원본 상수 `TOP_TAGS_PER_OFFICE = 2` 그대로 채택 — 인터페이스
      값이라 통제변인 위반 아님). 이 저장소는 이전에 "bbox 응답에 집계를 얹지 않는다"고
      정했었는데(`reviews-schema-and-read-api` "범위 밖" — 근거는 마커 색상 그라데이션이
      범위 밖이라 소비할 UI가 없다는 것), **이번엔 사용자가 명시적으로 원본과 계약 모양을
      맞추기로 결정해 뒤집는다.** `avgRating`/`reviewCount`는 여전히 bbox 응답에 얹지
      않는다 — 이번 결정은 `tagCounts`에 한정된다.
- [x] AC11: 리뷰가 없거나 리뷰에 태그가 하나도 없는 사무소는 `tagCounts`가 빈 배열이다
      (에러·null 아님).

**UI** (`ReviewSection` 작성 폼·목록, 사무소 상세 패널)

- [x] AC12: 작성 폼에 6개 태그를 다중 선택할 수 있는 칩이 있다. 선택/해제가 토글된다.
- [x] AC13: 목록에 표시된 리뷰 항목 중 태그가 있는 항목은 태그 배지가 함께 보이고,
      없는 항목은 태그 영역 자체가 렌더링되지 않는다.
- [x] AC14: 사무소 상세 패널에 `tagCounts` 요약(태그별 배지 + 개수)이 보인다. 집계가
      빈 배열이면(리뷰·태그 없음) 이 영역 자체가 렌더링되지 않는다.
- [x] AC15: 태그 없이(작성 필드 전부 비운 채) 제출해도 기존처럼 정상 제출된다
      (회귀 확인 — 필수 아님).

## 영향 범위

- **만질 파일**
  - `packages/types/src/reviewTag.ts` (신규) — `REVIEW_TAGS`·`reviewTagEnum`·
    `tagCountSchema`. `review.ts`가 아니라 별도 파일에 두는 이유는 설계 메모 참고
    (순환 참조 방지).
  - `packages/types/src/review.ts` — `reviewSchema`에 `tags` 추가,
    `createReviewRequestSchema`(= `updateReviewRequestSchema`)에 `tags` 추가.
  - `packages/types/src/office.ts` — `officeSummarySchema`에 `tagCounts` 추가
    (`officeDetailResponseSchema`는 이걸 `extend`하므로 자동으로 포함된다).
  - `packages/types/src/index.ts` — `reviewTag.ts` 재export.
  - `apps/api/drizzle/000X_*.sql` (신규) — `review_tags` 테이블: `(review_id, tag_key)`
    복합 PK, `review_id`는 `reviews.id` FK cascade, `tag_key` 인덱스.
  - `apps/api/src/db/schema.ts` — `reviewTags` 테이블 정의.
  - `apps/api/src/repositories/reviewRepository.ts` — `findByOfficeId` 결과에 태그
    배치 조회해 합치기, `insert`/`update`에서 `review_tags` 갱신(트랜잭션), 리뷰
    개별 조회(`findById`)에도 태그 포함.
  - `apps/api/src/repositories/officeRepository.ts` — `findTagCountsByOfficeId`(전체,
    상세용)·`findTopTagsByOfficeIds`(배치, N개 제한, bbox 목록용) 추가. `reviews` 테이블을
    이미 join해 `findVisibleRatingsByOfficeId`를 구현한 전례와 같은 파일·같은 패턴
    (설계 메모 참고).
  - `apps/api/src/services/reviewService.ts` — `ICreateReviewParams`/
    `IUpdateReviewParams`에 `tags`, 응답 변환 함수에 반영, 중복 제거(AC7).
  - `apps/api/src/services/officeService.ts` — `findByBbox`/`findDetailById` 결과에
    `tagCounts` 합성.
  - `apps/web/components/ReviewSection/ReviewSection.tsx`·`.module.css` — 태그 칩
    선택 UI, 목록 항목 태그 배지, 사무소 `tagCounts` 요약 배지(아래 "구현 중 조정"
    참고 — 애초 예상과 달리 `OfficeDetailPanel.tsx`가 아니라 여기).
  - 기존 테스트 파일 다수에 케이스 추가(`reviewService.test.ts`, `officeService.test.ts`,
    `officesRoute.test.ts`, `officeDetailRoute.test.ts`, `reviewsRoute.test.ts`,
    `officeReviewWriteRoute.test.ts`, `reviewRepository.test.ts`(통합),
    `officeRepository.test.ts`(통합), `ReviewSection.test.tsx`).
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존에 작성된 리뷰(태그 없던 시절 행)는 `tags: []`로 자연스럽게
  처리된다 — 마이그레이션이 기존 `reviews` 행을 건드리지 않는다(새 테이블 추가일 뿐).
  `officeSummarySchema` 확장은 기존 필드에 영향 없음(추가 필드).

## 설계 메모

- **`reviewTag.ts`를 따로 두는 이유(순환 참조 방지)**: `review.ts`는 이미
  `officeSummarySchema`를 가져오려고 `office.ts`를 import한다(`officeDetailResponseSchema
  = officeSummarySchema.extend(...)`). 이번에 `office.ts`도 `tagCountSchema`가 필요한데,
  이걸 `review.ts`에 두면 `office.ts → review.ts → office.ts` 순환이 생긴다. 태그 관련
  스키마를 제3의 파일로 빼면 양쪽이 그 파일만 가져가 순환이 안 생긴다.
- **오피스 리포지토리가 태그 집계를 직접 조회하는 이유**: `officeService`는 여전히
  `IOfficeRepository` 하나만 주입받는다. 이미 `officeRepository.ts`가 `reviews` 테이블을
  join해 `findVisibleRatingsByOfficeId`(평점 집계)를 구현해둔 전례가 있다 — 리뷰 관련
  집계는 오피스 조회 경로에서 직접 읽는다는 게 이 저장소의 기존 패턴이다. 새 서비스 간
  의존성을 만들지 않고 그 패턴을 그대로 따른다.
- **리뷰 생성/수정 시 트랜잭션**: 리뷰 행 insert/update와 `review_tags` 갱신(기존 태그
  삭제 후 새 태그 insert)이 원자적이어야 한다 — 리뷰는 만들어졌는데 태그 insert가 중간에
  실패해 일부만 남는 상태를 막는다. `db.transaction()`으로 묶는다.
- **중복 제거(AC7) 위치**: 서비스 레이어에서 `new Set(tags)`로 한 번 걸러 repository에
  넘긴다 — DB 제약(PK)에 맡겨 unique violation을 잡는 방식도 가능하지만, "중복 입력은
  사용자 실수지 에러 상황이 아니다"라는 판단이라 애초에 정상 케이스로 처리한다.
- **태그 값은 원본 문구를 그대로 쓴다**: "매물 많음"·"응답 빠름"·"허위매물 없음"·
  "친절함"·"강매 없음"·"설명 꼼꼼". `dealType`/`dealResult` 때와 같은 논리 —
  사용자에게 보이는 한국어 라벨은 도메인 어휘로 취급한다(`docs/decisions.md` #9).
- **bbox 응답의 `TOP_TAGS_PER_OFFICE = 2`도 원본 값 그대로**: 임의로 다른 숫자를 고르면
  "같은 개념을 다르게 튜닝했을 뿐"인 잡음이 생긴다. 인터페이스 값으로 취급.

## 열린 질문 (해소됨 — 2026-08-25)

1. **`tagCounts` 노출 범위** → 사무소 상세 + bbox 목록 양쪽 다. bbox 목록은 이전 결정
   ("집계 안 얹는다")을 이번 건에 한해 뒤집는다 — 사용자 결정.
2. **이번 명세에 UI도 포함할지** → 포함한다. `review-deal-and-visit-fields`(덩이 E)와
   같은 범위 — API+UI를 한 명세에서 끝낸다.

## 구현 중 조정

- **`tagCounts` 요약을 넣을 위치가 예상과 달랐다**: "만질 파일"에서는
  `OfficeDetailPanel.tsx`를 예상했지만, 실제로는 `ReviewSection.tsx`가 이미
  `useOfficeReviews` 훅을 통해 `GET /api/offices/:id` 응답(`detail`, 즉
  `TOfficeDetailResponse`)을 들고 있었다. `OfficeDetailPanel`은 `TOfficeSummary`만
  받고 리뷰 데이터를 모른다 — 거기에 `tagCounts` 요약을 넣으려면 새 API 호출이나 prop
  드릴링이 필요해진다. 기존 `detail.tagCounts`를 그대로 쓰는 게 새 호출을 만들지 않는
  더 단순한 경로라 `ReviewSection.tsx`의 summary 블록에 넣는 쪽으로 조정했다.
  `OfficeDetailPanel.tsx`는 수정하지 않았다.

## 실행 결과 (2026-08-25)

- 계약: `packages/types` — `reviewTag.ts`(신규) 추가, `review.ts`/`office.ts`에
  `tags`/`tagCounts` 반영.
- DB: `apps/api/drizzle/0005_broad_random.sql`(신규) — `review_tags` 테이블. 개발 DB
  (`app`)·테스트 DB(`app_test`) 양쪽에 적용, 적용 후 `offices` 1914건 무결성 확인.
- API: `officeRepository`·`reviewRepository`·`officeService`·`reviewService`·
  `routes/offices.ts`·`routes/reviews.ts`에 태그 CRUD·집계 반영. AC7(중복 제거)은
  구현을 일부러 깨서(Red) 테스트가 실제로 검증하는지 확인 후 원복(Green).
- UI: `ReviewSection.tsx`에 태그 칩 선택 폼, 목록 배지, `tagCounts` 요약 배지 추가.
- 테스트:
  - `apps/api`: `TEST_DATABASE_URL`(`app_test`)로 통합 테스트 포함 전수 실행,
    18개 파일 167개 테스트 전부 통과(스킵 0).
  - `apps/web`: `bun run test`, 10개 파일 68개 테스트 전부 통과.
  - `node .harness/gates/run-checks.mjs` (typecheck → lint → stylelint → test →
    build) 전부 통과.
- 시딩 데이터(`app` DB) 무결성: 작업 전후 `offices` 1914건으로 동일, 손상 없음.
