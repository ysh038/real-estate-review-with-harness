# 명세: 내 리뷰 목록

- 작성일: 2026-08-25
- 상태: 구현됨

## 목표

원본과 실제 코드를 대조해 발견한 리뷰 모델 격차(`docs/decisions.md` #9)를 좁히는 다섯 번째
덩이(I). 원본은 로그인한 사용자가 자신이 쓴 리뷰를 사무소 이름과 함께 모아 볼 수 있다.
이 저장소엔 "내가 어디에 리뷰를 남겼는지" 확인할 방법이 전혀 없다 — 사무소 상세를 하나씩
다시 열어야 한다. 이 명세는 **내 리뷰 목록 API + 헤더에서 여는 패널 UI**를 정의한다.

## 범위 밖

- **리뷰 수정·삭제 UI** — `review-list-and-write-ui`가 "author에 userId가 없어 이게 내
  리뷰인지 프론트가 판별할 방법이 없다"는 이유로 범위 밖에 뒀다. 이번 명세로 그 판별 수단
  (내 리뷰 목록 API)이 생기긴 하지만, product-spec 덩이 I의 범위는 "모아 보기"까지다
  ("리뷰 목록·작성 폼"과 마찬가지로 수정·삭제는 별도 범위). 수정·삭제 진입점을 이 패널에
  놓는 건 후속 명세로 미룬다.
- **정렬·필터** (최신순 하나로 고정, 기존 읽기 명세 결정과 동일 원칙).
- **다른 사용자의 리뷰 목록 조회** — `/api/me/reviews`는 본인 것만. 타인 리뷰 이력 노출은
  개인정보 최소화 원칙(`reviews-schema-and-read-api`)에 어긋난다.
- **패널에 지도 이동 연동**("이 리뷰 클릭하면 그 사무소로 지도 이동") — 이번엔 사무소
  이름만 텍스트로 보여준다. 지도 연동은 추가 상태 관리(패널 닫고 마커 선택)가 필요해
  범위가 커진다.

## 수용 기준

**계약 (`packages/types`)**

- [x] AC1: 내 리뷰 목록의 각 항목은 기존 `reviewSchema` 필드 전부 + `officeName`(문자열) +
      `isHidden`(불리언, 신고 누적으로 숨겨졌는지)을 포함한다.

**API** (`GET /api/me/reviews`)

- [x] AC2: 세션 쿠키 없이 요청하면 401.
- [x] AC3: 로그인 상태면 200과 함께 본인이 쓴 리뷰만 반환한다(다른 사용자 리뷰는 섞이지
      않는다).
- [x] AC4: 각 항목에 그 리뷰가 달린 사무소의 이름(`officeName`)이 포함된다.
- [x] AC5: 신고 누적으로 숨겨진(`hidden_at` 있는) 내 리뷰도 목록에 포함되고
      `isHidden: true`로 표시된다 — 공개 목록(`GET /api/offices/:id/reviews`)과 달리
      본인에게는 자기 리뷰의 상태를 숨기지 않는다.
- [x] AC6: 리뷰가 없으면 빈 배열을 반환한다(에러 아님).
- [x] AC7: 커서 기반 페이지네이션 — 기존 리뷰 목록과 같은 방식(`nextCursor`), 최신순.
- [x] AC8: 최신순으로 정렬된다(가장 최근에 쓴 리뷰가 먼저).

**UI** (헤더 — `LoginButton` 옆 진입점 + 새 패널)

- [x] AC9: 로그인 상태면 "내 리뷰" 버튼이 보인다. 비로그인이면 보이지 않는다.
- [x] AC10: 버튼을 누르면 패널이 열리고 내 리뷰 목록(사무소 이름·별점·본문·작성일)이
      보인다.
- [x] AC11: 리뷰가 없으면 "아직 작성한 리뷰가 없습니다"류의 빈 상태 문구가 보인다.
- [x] AC12: 숨겨진 리뷰는 "신고 누적으로 숨김"류의 표시가 함께 보인다.
- [x] AC13: `nextCursor`가 있으면 "더보기" 버튼이 있고, 누르면 다음 페이지가 이어붙는다.
- [x] AC14: Escape 키나 닫기 버튼으로 패널이 닫힌다. `OfficeDetailPanel`과 달리 지도
      상호작용과 경쟁하지 않으므로 배경 클릭으로도 닫히는 진짜 모달로 만든다
      (`aria-modal="true"`, 열리면 포커스가 패널로 이동).
- [x] AC15: 로그아웃하면 패널이 열려 있어도 자동으로 닫힌다(더 이상 "내" 리뷰를 보여줄
      근거가 없어진다).

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` — `myReviewSchema = reviewSchema.extend({officeName,
    isHidden})`, `myReviewListResponseSchema`.
  - `apps/api/src/repositories/reviewRepository.ts` — `findByUserId(userId, limit, after?)`
    추가: `reviews` ⋈ `offices`(이름)만 — 작성자는 항상 조회자 본인이라 `users` join이
    필요 없다(호출부가 이미 아는 `authUser`로 `author` 필드를 채운다). 태그·helpful
    배치 조회는 기존 `findTagsByReviewIds`/`findHelpfulCountsByReviewIds`/
    `findUserHelpfulReviewIds` 재사용(요청자 id = 조회 대상 유저 id로 고정).
  - `apps/api/src/services/reviewService.ts` — `IMyReviewRow`(officeId·officeName·rating·
    content·createdAt·hiddenAt·dealType 등, `nickname`/`profileImageUrl`은 불필요),
    `listByUserId(authUser, {limit, cursor})`.
  - `apps/api/src/routes/me.ts`(신규 또는 기존 `routes/auth.ts`의 `GET /api/me` 옆) —
    `GET /api/me/reviews`, `requireAuth`.
  - `apps/api/src/app.ts` — 라우트 등록.
  - `apps/web/lib/reviewsApi.ts` — `fetchMyReviews({cursor}, baseUrl)`.
  - `apps/web/hooks/useMyReviews.ts`(신규) — 목록·페이지네이션 상태(패턴은
    `useOfficeReviews`와 유사하지만 작성 폼이 없어 더 단순).
  - `apps/web/components/LoginButton/LoginButton.tsx` — "내 리뷰" 버튼 추가, 패널
    열림 상태 소유.
  - `apps/web/components/MyReviewsPanel/`(신규) — `MyReviewsPanel.tsx`·`.module.css`·
    `index.ts`.
  - 신규 테스트: `apps/api/src/__tests__/unit/meReviewsRoute.test.ts`,
    `reviewService.test.ts`·`reviewRepository.test.ts`(통합)에 케이스 추가,
    `apps/web/__tests__/unit/reviewsApi.test.ts`·`useMyReviews.test.ts`(신규)·
    `MyReviewsPanel.test.tsx`(신규)·`LoginButton.test.tsx`(있으면 케이스 추가, 없으면 신규).
- **새 의존성**: 없음.
- **기존 기능 영향**: `GET /api/offices/:id/reviews`(공개 목록)는 무변경 — `isHidden`
  필드도 `/api/me/reviews`에만 있다. `LoginButton`은 기존 로그인/로그아웃 동작 무변경,
  버튼 하나가 조건부로 늘 뿐이다.

## 설계 메모

- **공개 목록과 다른 스키마를 쓰는 이유(officeName·isHidden)**: `reviewSchema`를 그대로
  확장하는 대신 `myReviewSchema`라는 별도 응답 스키마를 두는 이유는, `officeName`·
  `isHidden`이 "내 리뷰 목록"이라는 특정 화면에서만 의미가 있어서다. 공개 목록
  응답(`reviewSchema`)에 이 필드를 얹으면 다른 사용자에게 "이 리뷰가 숨겨졌는지"를
  노출하게 돼 원치 않는 정보 누출이다.
- **진짜 모달로 만드는 이유**: `office-detail-panel`은 지도를 계속 조작할 수 있어야 해서
  비모달로 갔다(그 명세 설계 메모). "내 리뷰" 패널은 지도 상호작용과 경쟁할 이유가 없다
  — 오히려 배경을 눌러 쉽게 닫히는 게 자연스럽다. 같은 앱이라고 같은 모달리티를 강제할
  필요는 없다.
- **로그아웃 시 자동 닫힘(AC15)**: 패널이 열린 채로 로그아웃하면 "내 리뷰"라는 전제
  자체가 깨진다 — `useSession`의 `status`가 `unauthenticated`로 바뀌는 순간 패널도
  닫는다.
- **레이어**: `reviewRepository.findByUserId`는 `findByOfficeId`와 구조적으로 대칭이다
  (조회 기준만 officeId ↔ userId). 태그·helpful 배치 조회 헬퍼를 그대로 재사용해 새
  N+1 위험을 만들지 않는다.

## 열린 질문

없음 — 스코프(모아 보기까지, 수정·삭제 제외)는 product-spec 덩이 I 문구를 그대로 따랐고,
모달리티·필드 구성은 기존 명세들의 판단 기준을 그대로 적용해 확정했다.

## 실행 결과 (2026-08-25)

- **AC1~15 전부 확인.** api 레이어(계약·리포지토리·서비스·라우트)를 먼저 세운 뒤 새
  테스트 7개(`meReviewsRoute.test.ts`)를 작성 — 이미 구현이 앞서 있던 터라 즉시
  통과했는데, `isHidden` 파생 로직을 일부러 깨서(하드코딩 `false`) AC5 테스트가 실제로
  실패하는지 확인한 뒤 원복했다(Red를 사후 검증). web 레이어(lib·hook·`MyReviewsPanel`·
  `LoginButton`)는 순서대로 Red 먼저 확인 후 구현 — `fetchMyReviews`(lib) 3개,
  `useMyReviews`(hook) 4개, `MyReviewsPanel` 9개, `LoginButton`(신규 테스트 파일) 5개
  전부 실패 확인 후 통과시켰다.
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 새 케이스 4개(본인 리뷰만·
  officeName 조인, 숨겨진 리뷰 포함, 빈 목록, 커서 페이지네이션+정렬) 포함 29개 전부
  통과 — `reviews ⋈ offices` 조인과 hiddenAt 미필터링이 실제 Postgres에서 정확함을
  확인했다.
- **개발 DB 스모크 테스트**: 실로그인 사용자 세션으로 `bun run dev` 서버에 직접 curl:
  - 인증 없이 `/api/me/reviews` → 401.
  - 리뷰 작성 후 조회 → 응답에 실제 사무소 이름(`officeName`)이 정확히 매핑됨을 확인.
  - DB에서 직접 `hidden_at`을 채운 뒤 재조회 → `isHidden: true`로 정확히 반영(AC5
    핵심 시나리오, 공개 목록이었다면 아예 빠졌을 리뷰가 본인에게는 그대로 보임).
  스모크로 만든 리뷰·세션 행은 종료 후 직접 삭제했다.
- **UI 시각 검증에 한계가 있음(review-list-and-write-ui AC20~22와 같은 제약)**: 실
  카카오 로그인 없이는 브라우저에서 `MyReviewsPanel`(백드롭·모달)까지 도달할 수 없어
  Testing Library 컴포넌트 테스트(DOM·ARIA·상호작용)와 `next build`의 CSS 유효성 검사로
  대체했다. 실제 시각적 렌더링(백드롭 `color-mix()` 표현 등)은 다음에 실 로그인이 가능한
  세션에서 확인이 필요하다.
- **버그 없음(구현 자체)**: 실제 런타임 버그는 발견되지 않았다.
