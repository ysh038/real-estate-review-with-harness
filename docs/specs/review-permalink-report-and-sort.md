# 명세: 리뷰 퍼머링크 · 신고 UI · 정렬

- 작성일: 2026-08-26
- 상태: 구현됨

## 목표

`docs/product-spec.md` Phase 11(리뷰 신뢰도 & UX) 중 상호 연관된 세 항목을 묶는다 —
셋 다 리뷰 목록(`ReviewSection`)을 손대는 작업이라 한 명세로 처리하는 게 리뷰가
겹치지 않는다.

1. **개별 리뷰 퍼머링크**: 지금은 특정 리뷰 하나를 가리켜 공유할 방법이 없다.
   Phase 8에서 `/offices/[id]` 독립 페이지가 생겼으니 그 위에 앵커를 얹는다.
2. **신고 UI**: `POST /api/reviews/:id/report` API는 이미 있지만(review-write-and-report
   명세) 누를 버튼이 없다 — 신고하려면 지금은 curl 말고 방법이 없다.
3. **정렬**: 리뷰 목록이 항상 최신순 고정이다. 오래된 리뷰(초기 리뷰)를 보고 싶어도
   방법이 없다.

## 범위 밖

- **"사진 있는 리뷰만" 필터** — 원본 Phase 11 항목이지만 이 저장소엔 사진 기능
  자체가 없다(Phase 2, `docs/product-spec.md` TODO). 사진이 생기면 그때 추가한다.
- **로딩 스켈레톤 + 빈 상태 + 에러 상태 일관화** — Phase 11의 남은 항목. 이 세
  기능과 성격이 달라(시각적 일관성 정리 vs 신규 기능) 별도 명세로 뗀다.
- **작성 중 임시저장(draft)·이탈 경고** — 마찬가지로 별도 명세.
- **신고 사유 선택 UI** — 원본은 사유를 고르게 하지만, 이 저장소의
  `POST /api/reviews/:id/report`는 애초에 사유를 받지 않는다(요청 본문 없음,
  `review-write-and-report.md`). 사유 필드를 추가하려면 `review_reports` 테이블
  마이그레이션이 필요해 범위가 커진다 — 이번엔 버튼 하나로 즉시 신고하는 것까지만
  한다. 원본 인터페이스를 그대로 베끼지 않고 이 저장소의 실제 계약에 맞춘다
  (`docs/decisions.md` #9 통제변인 원칙과 동일 기준).
- **"이미 신고함" 상태의 새로고침 후 유지** — `reviewSchema`에 `isReported` 같은
  필드가 없다(신고는 익명 카운트만 누적, `helpfulCount`처럼 본인 상태를 돌려주지
  않는다). 페이지를 새로고침하면 신고 버튼이 다시 "신고" 상태로 보인다 — 클릭하면
  서버가 409(중복)를 주고 UI는 이것도 "신고됨"으로 처리하므로 중복 부작용은 없다.
  본인 신고 여부를 응답에 포함하려면 신고 여부 조회 쿼리가 추가로 필요해 이번
  범위에서 뺀다.
- **퍼머링크 대상 리뷰가 첫 페이지 밖에 있는 경우 자동으로 더 불러오기** — 이번엔
  이미 로드된 목록 안에서만 스크롤·강조한다. 커서를 반복 소진해 특정 리뷰를 찾는
  것은 별도 API(단건 조회)가 없으면 비효율적이라 범위 밖.

## 수용 기준

**정렬 (계약 + API, Vitest)**

- [x] AC1: `reviewListQuerySchema`에 `sort`(`"latest" | "oldest"`, 기본값
      `"latest"`)가 추가된다.
- [x] AC2: `sort` 생략 시(또는 `"latest"`) 기존과 동일하게 최신순으로 반환된다
      (회귀 확인).
- [x] AC3: `sort=oldest`면 가장 오래 전에 작성된 리뷰부터 반환된다.
- [x] AC4: `sort=oldest`에서 `limit`보다 리뷰가 많으면 `nextCursor`가 오고, 그
      커서로 다음 페이지를 요청하면 중복·누락 없이 이어진다.

**신고 UI (`ReviewSection`, Testing Library — `reviewsApi` 모킹)**

- [x] AC5: 로그인 상태에서만 리뷰마다 "신고" 버튼이 보인다(비로그인 시 버튼 자체가
      없다 — API가 `requireAuth`라 눌러도 401만 나므로 아예 숨긴다).
- [x] AC6: "신고" 버튼을 누르면 `POST /api/reviews/:id/report`가 호출되고,
      성공(204)하면 버튼이 "신고됨"으로 바뀌고 비활성화된다.
- [x] AC7: 이미 신고한 리뷰를 다시 신고해 서버가 409를 반환해도 에러로 보이지
      않고 버튼이 "신고됨"으로 바뀐다(사용자 입장에선 원하는 결과가 이미 이뤄진
      상태라 실패로 취급하지 않는다).
- [x] AC8: 본인 리뷰라 서버가 400을 반환하면 에러 문구가 보이고 버튼은 "신고"
      상태로 남는다.

**개별 리뷰 퍼머링크 (`ReviewSection`, Testing Library + 브라우저 검증)**

- [x] AC9: 각 리뷰 항목 DOM에 `id="review-<reviewId>"`가 있다.
- [x] AC10: "링크 복사" 버튼을 누르면 `{origin}/offices/{officeId}#review-{reviewId}`
      형태의 URL이 클립보드에 복사된다.
- [x] AC11: 복사 직후 버튼 문구가 잠깐 "복사됨"으로 바뀌었다가 원래대로 돌아온다.
- [x] AC12(브라우저): `/offices/:id#review-:reviewId` 로 접속했고 그 리뷰가 첫
      페이지 안에 있으면, 해당 리뷰로 스크롤되고 강조 스타일이 잠깐 나타난다.

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` — `reviewListQuerySchema`에 `sort` 추가
  - `apps/api/src/services/reviewService.ts` — `IReviewRepository.findByOfficeId`·
    `listByOfficeId`에 `sort` 파라미터 threading
  - `apps/api/src/repositories/reviewRepository.ts` — `findByOfficeId`가 `sort`에
    따라 `asc`/`desc`, `lt`/`gt` 커서 비교를 바꾼다
  - `apps/api/src/routes/offices.ts` — `GET /:id/reviews`가 `sort` 쿼리를
    `listByOfficeId`로 전달
  - `apps/web/lib/reviewsApi.ts` — `fetchReviews`에 `sort` 옵션 추가,
    `reportReview(reviewId)`(신규) 추가
  - `apps/web/hooks/useOfficeReviews.ts` — `sort` 상태 + `setSort`(변경 시
    처음부터 다시 조회), `reportReview` 액션 추가(로컬 "신고됨" 상태 관리)
  - `apps/web/components/ReviewSection/ReviewSection.tsx` — 정렬 토글 UI, 리뷰
    항목에 `id` 속성 + 신고·링크복사 버튼, 해시 진입 시 스크롤+강조 이펙트
  - 각 변경에 대응하는 테스트 다수(`reviewsApi.test.ts`·`useOfficeReviews.test.ts`·
    `ReviewSection.test.tsx`, api 쪽 `reviewService.test.ts`·
    `officeReviewWriteRoute.test.ts` 또는 신규 라우트 테스트, 통합 테스트 케이스 추가)

- **새 의존성**: 없음 (`navigator.clipboard`는 브라우저 내장 API).

- **기존 기능 영향**
  - `sort` 파라미터는 기본값이 `"latest"`라 기존 호출부(쿼리 파라미터 없음)는
    100% 동일하게 동작한다(AC2로 회귀 확인).
  - `ReviewSection`은 `OfficeDetailPanel`(지도 위 패널)과 `/offices/[id]` 양쪽에서
    재사용되므로, 퍼머링크·신고·정렬 전부 두 화면 모두에 자동으로 적용된다.

## 설계 메모

- **신고는 확인 모달 없이 즉시 실행**: 사유를 고를 게 없으니(위 "범위 밖") 확인
  단계를 넣어도 "정말 신고하시겠습니까?" 예/아니오뿐이라 실익이 적다. 실수로 눌러도
  되돌릴 방법이 없다는 반론이 있을 수 있지만, 신고는 즉시 반영되는 게 아니라
  누적 임계치(5회)에 도달해야 숨겨지므로 실수 한 번의 피해가 작다.
- **정렬 변경 시 목록을 처음부터 다시 부른다**: 커서가 정렬 방향에 종속적이라
  (최신순 커서를 오래된순 조회에 쓸 수 없다), 정렬이 바뀌면 `useOfficeReviews`가
  `officeId`가 바뀔 때와 같은 경로로 상태를 초기화한다.
- **퍼머링크 강조는 CSS 클래스를 잠깐 붙였다 떼는 방식**: 애니메이션 라이브러리
  없이 `setTimeout`으로 클래스를 제거한다 — 기존 코드베이스에 이미 있는 수준의
  단순함을 유지한다.

## 열린 질문

없음 — "범위 밖"에서 원본과 다르게 가기로 한 지점(신고 사유 없음, 신고 상태
비영속)에 이견이 없으면 `/impl`로 진행한다.

## 실행 결과 (2026-08-26)

- **AC1~AC11**: Vitest 신규 20건 전부 통과(officeDetailRoute 2 + reviewService 3 +
  reviewsApi 4 + useOfficeReviews 5 + ReviewSection 6, 기존 회귀 없음 — `bun run test`
  기준 web 125개·api 194개(default gate) 전부 통과). AC3·AC4는 새로 만든 `app_test`
  통합 테스트 DB(`TEST_DATABASE_URL`)로 실제 Postgres 정렬·커서 동작까지 확인 —
  `sort=oldest` 커서 페이지네이션 3페이지가 정확히 이어짐(api 통합 테스트 34/34
  통과).
- **AC12(브라우저)**: `bun run dev --port 3000` + 개발 DB에 임시 테스트 리뷰 3건
  직접 삽입(작업 후 삭제)으로 실제 확인.
  - 최신순 기본 정렬(유저3→유저2→유저1) 확인 후 "오래된순" 클릭 → 순서 반전
    (유저1→유저2→유저3) + 네트워크 요청이 실제로 `?sort=oldest`로 나감을 확인.
  - `/offices/:id#review-:reviewId`로 새 탭에서 접속 → 해당 리뷰로 스크롤 +
    `itemHighlighted` 클래스가 실제로 붙는 것을 DOM에서 직접 확인.
  - 신고 버튼은 비로그인 상태에서 실제로 보이지 않음(AC5 브라우저 재확인).
  - **환경 이슈(코드 결함 아님) 2건**: (1) 브라우저 자동화 툴의 좌표 기반 클릭이
    정렬 토글 버튼에서 간헐적으로 안 먹어 `element.click()` 직접 호출로 우회—
    실제 사용자 클릭과는 무관한 자동화 도구 한계. (2) 자동화 탭이 OS 포커스를
    받지 못해 `navigator.clipboard.writeText`가 `NotAllowedError: Document is not
    focused`로 실패 — 실제 사용자가 포커스된 탭에서 클릭할 때는 발생하지 않는다.
    두 경우 다 원인을 콘솔 로그로 직접 확인해 코드 문제가 아님을 검증했다.
- **로그인 필요 항목(AC6~AC8 브라우저 재확인)**: 실 카카오 로그인이 없어 로그인
  상태에서의 "신고" 버튼 클릭·204/409/400 분기의 실제 브라우저 동작은 확인하지
  못했다 — 기존 명세들과 동일한 제약. Vitest로는 세 경우 모두 확인됨.
- **버그 없음(구현 자체)**: 실제 런타임 버그는 발견되지 않았다. 위 두 환경 이슈는
  디버그 로그를 추가해 원인을 직접 추적한 뒤 자동화 도구/환경 문제로 확정했다.
