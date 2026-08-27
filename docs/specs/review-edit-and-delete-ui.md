# 명세: 마이페이지 리뷰 수정·삭제 UI

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

`PATCH /api/reviews/:id`·`DELETE /api/reviews/:id`는 `review-write-and-report.md`에서
이미 구현·검증됐지만(소유권 확인, 전체교체 PATCH, 하드 삭제), 이걸 호출할 UI가 어디에도
없다 — 리뷰를 한 번 쓰면 API를 직접 호출하지 않는 한 고치거나 지울 방법이 없다.
`docs/product-spec.md` Phase 2의 "리뷰 수정 시 사진 변경" 항목도 "수정 UI 자체가 없어
범위 밖"이라고 명시돼 있다 — 이 명세가 그 전제(수정 UI)를 만든다.

`/mypage/reviews`는 이미 본인이 쓴 리뷰만 보여주는 페이지라(`GET /api/me/reviews`),
소유권 확인이 필요 없는 자연스러운 위치다. 사무소 상세 페이지(`ReviewSection`)의 공개
리뷰 목록에는 수정 버튼을 넣지 않는다 — 거기서는 리뷰가 다른 사용자 것과 섞여 있어
"이게 내 것인지" 판단할 필드(`author`엔 `userId`가 없다, 공개 노출 안 함)가 없다.

## 범위 밖

- **사진 추가/삭제** — 기존 사진 유지/제거 + 새 사진 추가를 함께 다루려면 생성 때보다
  상태가 복잡해진다(기존 유지 vs 신규 업로드 vs 삭제, 3방향 diff). `photoKeys` 계약은
  이미 있으니 별도 후속 명세로 뺀다. 이번 수정 폼은 사진을 그대로 둔다(수정 요청에
  `photoKeys`를 아예 안 보내면 서비스가 빈 배열로 교체해버리므로, 사진이 있던 리뷰를
  수정하면 사진이 사라지는 걸 반드시 막아야 한다 — 아래 설계 메모 참고).
- **사무소 상세 페이지(`ReviewSection`)에서 수정** — 이번엔 마이페이지에서만. 공개
  목록에서의 수정 진입점은 별도 논의.
- **작성 임시저장(`useReviewDraft`)과의 연동** — 수정 폼은 서버에 이미 있는 값을 불러와
  채우는 것이지 로컬 초안 개념이 아니다. 재사용하지 않는다.
- **수정 이력 노출** — `updated_at`은 API 응답에 없다(review-write-and-report 설계
  결정 유지). "수정됨" 표시 같은 것도 이번엔 안 한다.
- **별점 미선택 검증** — 편집 폼은 항상 기존 리뷰의 1~5점으로 시작하고 라디오 버튼은
  선택 해제가 불가능해 0점 상태가 될 수 없다. 작성 폼에 있는 "별점을 선택해주세요"
  검증은 편집 폼에 옮기지 않는다.

## 수용 기준

**API 클라이언트 + 훅 (`reviewsApi.ts`, `useMyReviews.ts`)**

- [x] AC1: `updateReview(reviewId, input)`은 `PATCH /api/reviews/:id`를 호출하고,
      성공하면 갱신된 `TReview`를 반환한다.
- [x] AC2: `deleteReview(reviewId)`는 `DELETE /api/reviews/:id`를 호출하고, 성공(204)
      하면 아무 값도 반환하지 않는다.
- [x] AC3: `useMyReviews`가 반환하는 `updateReview` 호출이 성공하면, `reviews` 배열에서
      그 id의 항목만 새 값으로 교체되고 나머지 항목·순서는 그대로다(전체 재조회 없음).
- [x] AC4: `useMyReviews`가 반환하는 `deleteReview` 호출이 성공하면, 그 id의 항목이
      `reviews` 배열에서 제거된다.

**UI (`/mypage/reviews`)**

- [x] AC5: 리뷰 항목마다 "수정"·"삭제" 버튼이 보인다.
- [x] AC6: "삭제" 클릭 → 확인 대화상자(`window.confirm`)에서 승인하면 삭제 요청이 가고
      성공 시 그 항목이 목록에서 사라진다. 확인을 취소하면 요청이 나가지 않고 목록은
      그대로다.
- [x] AC7: 삭제 요청이 실패하면 에러 문구가 보이고 목록은 그대로 유지된다.
- [x] AC8: "수정" 클릭 → 그 항목이 편집 폼으로 바뀌고 별점·본문·거래유형·거래결과·
      전문성·하자대응·방문연도·방문월·태그에 기존 값이 채워진 채로 보인다.
- [x] AC9: 편집 폼에서 "취소"를 누르면 변경 없이 원래 표시로 돌아가고 PATCH 요청은
      나가지 않는다.
- [x] AC10: 편집 폼에서 본문을 10자 미만으로 바꾸고 저장하면 에러 문구가 보이고 PATCH
       요청이 나가지 않는다.
- [x] AC11: 편집 폼에서 값을 바꾸고 저장하면 바뀐 값 그대로 PATCH 요청이 가고, 성공하면
       그 항목이 새 값으로 갱신되어 표시되고 편집 모드가 닫힌다.
- [x] AC12: 저장 요청이 실패하면 에러 문구가 보이고 편집 폼은 입력값을 유지한 채 열려
       있다(작성 폼의 "서버 실패면 입력값 유지" 패턴과 동일).
- [x] AC13: 숨겨진 리뷰(`isHidden: true`)도 수정·삭제 버튼이 동일하게 보인다 — 신고
       누적 숨김은 공개 노출 제한이지 소유자의 편집 권한과 무관하다(API도 `hiddenAt`을
       검사하지 않음, 기존 동작 확인됨).

## 영향 범위

- **만질 파일**
  - `apps/web/lib/reviewsApi.ts` — `updateReview`·`deleteReview` 추가(기존
    `createReview`/`reportReview`와 동일한 에러 처리 패턴).
  - `apps/web/hooks/useMyReviews.ts` — `updateReview`·`deleteReview` 메서드 추가,
    로컬 `reviews` 상태를 직접 갱신/제거(전체 재조회 안 함). 문서 주석의 "작성 폼이
    없어 조회·페이지네이션만 다룬다"는 더 이상 정확하지 않으므로 갱신.
  - `apps/web/components/MyReviewItem/`(신규) — `MyReviewItem.tsx`·`.module.css`·
    `index.ts`. 항목별 "수정 중" 상태·인라인 편집 폼·삭제 확인·에러 표시를 이
    컴포넌트가 스스로 들고 있다(라우트 컴포넌트에 비즈니스 로직 금지 원칙,
    `.cursor/rules/10-architecture`). `RATING_OPTIONS`(1~5)·`MONTH_OPTIONS`(1~12)·
    `NOT_SELECTED` 센티널은 `ReviewSection.tsx`와 동일한 값을 이 파일에 로컬로
    다시 선언한다(아래 설계 메모).
  - `apps/web/app/mypage/reviews/page.tsx` — `<li>` 인라인 마크업을
    `<MyReviewItem>` 호출로 교체, `useMyReviews`에서 `updateReview`·
    `deleteReview`를 꺼내 그대로 전달.
  - `apps/web/app/mypage/reviews/page.module.css` — 이제 `MyReviewItem.module.css`로
    옮겨간 `item`·`itemHeader`·`officeName`·`rating`·`content`·`hiddenNotice`
    클래스를 정리(죽은 CSS 제거).
  - 테스트: `reviewsApi.test.ts`·`useMyReviews.test.ts`·`MyPageReviews.test.tsx` 확장
    (내부 컴포넌트 분리는 구현 세부사항이라 `MyReviewItem` 전용 테스트 파일 없이
    `MyPageReviewsPage` 렌더 기준으로 검증).
- **새 의존성**: 없음.
- **기존 기능 영향**: 없음 — 기존 조회·페이지네이션 동작은 그대로 두고 기능을 더한다.

## 설계 메모

- **수정 요청에 `photoKeys`를 반드시 기존 사진 그대로 채워 보낸다**: PATCH는 전체교체라
  `photoKeys`를 생략하면 서비스가 빈 배열로 저장해 기존 사진이 전부 사라진다(`review-write-and-report`
  설계와 동일한 함정). 이번 편집 폼은 사진 UI 자체가 없으므로(범위 밖), `updateReview`
  호출 시 `photoKeys`에 `review.photos.map(p => p.storageKey)`를 그대로 실어 보내
  기존 사진을 보존한다. 태그도 같은 전체교체 규칙이라 편집 폼에 태그 선택 UI를 반드시
  포함한다(생략하면 태그가 전부 지워짐).
- **RATING_OPTIONS 등 작은 상수를 공유 모듈로 빼지 않는 이유**: `DEAL_TYPES`·
  `DEAL_RESULTS`·`EXPERTISE_LEVELS`·`DEFECT_RESPONSES`·`REVIEW_TAGS`는 이미
  `@repo/types`에서 양쪽이 같은 걸 가져다 쓴다. `RATING_OPTIONS`(`[1,2,3,4,5]`)·
  `MONTH_OPTIONS`(1~12)·`NOT_SELECTED`(`""`)는 UI 전용 상수라 타입 계약이 아니다 —
  두 파일에 각각 선언해도 세 줄짜리 리터럴 두 벌일 뿐이라, 지금 `ReviewSection.tsx`의
  폼 로직 전체를 공유 컴포넌트로 추출하는 큰 리팩터를 하는 것보다 낫다고 판단했다.
  나중에 세 번째 사용처가 생기면 그때 추출을 재고한다.
- **삭제 확인은 `window.confirm`**: 별도 모달 컴포넌트를 새로 만들지 않는다 — 파괴적
  동작(하드 삭제, 되돌릴 수 없음) 확인이라는 목적만 채우면 되고, 이 저장소에 확인
  모달 패턴이 아직 없다(있으면 그걸 썼겠지만 새로 만들 만큼 이 기능의 핵심은 아니다).

## 열린 질문

없음.

## 실행 결과 (2026-08-27)

**API 클라이언트 + 훅 (AC1-4)**

- `reviewsApi.test.ts`에 `updateReview`·`deleteReview` 테스트 4개 추가 → import
  자체가 없어 Red 확인 → `createReview`/`reportReview`와 동일한 에러 처리 패턴으로
  구현 후 Green. 성공 응답 fixture의 `id`를 `"review-1"`로 뒀다가 `reviewSchema`의
  `z.string().uuid()` 검증에 걸려 실패한 것을 실제 UUID 형식으로 고쳤다(사소한
  테스트 데이터 오타, 구현 결함 아님).
- `useMyReviews.test.ts`에 AC3·AC4 테스트 2개 추가(2개 항목 중 하나만 갱신/제거되고
  나머지·순서는 그대로인지 확인) → Red 확인 → 로컬 `reviews` 상태를
  `map`/`filter`로 직접 갱신하도록 구현 후 Green.

**UI (AC5-13)**

- `MyPageReviews.test.tsx`에 AC5~AC13용 테스트 10개를 먼저 작성 → 전부 Red 확인
  (버튼·편집 폼 자체가 없음) → `apps/web/components/MyReviewItem/`을 새 컴포넌트로
  분리해 구현(라우트 컴포넌트에 로직을 안 두는 기존 레이어링 원칙) → 10개 전부
  Green, 기존 6개 회귀 없음.
- 구현 후 sabotage-verify로 가장 위험한 지점(PATCH 전체교체 + 사진 보존)을
  검증했다: `photoKeys`를 일부러 빈 배열로 하드코딩했더니 **기존 AC11 테스트는
  전부 통과**했다 — 그 테스트의 리뷰 fixture가 애초에 사진이 없어서였다. 이건
  명세의 설계 메모가 정확히 경고한 함정을 테스트가 놓칠 뻔한 사례라, 사진이 있는
  리뷰를 저장했을 때 `photoKeys`가 보존되는지 확인하는 테스트를 별도로 추가 →
  사보타주 상태에서 새 테스트가 즉시 실패하는 것을 확인한 뒤 원복 → 전부 Green.
- `page.module.css`에서 `MyReviewItem.module.css`로 옮겨간 `item`/`itemHeader`/
  `officeName`/`rating`/`content`/`hiddenNotice` 클래스를 제거했다(죽은 CSS).

**전체 회귀 확인**

- `apps/web` 전체 테스트: 35 파일 235개 통과(기존 218개 + 이번 신규 17개).
- `node .harness/gates/run-checks.mjs` 전체 게이트(typecheck → lint → stylelint →
  test → build) 첫 시도에 바로 통과 — 12-C 때와 달리 이번엔 중간 실패가 없었다.

**실제 브라우저 검증**

- `docker stop app-web` → 이 저장소 web(:3000) 기동 → `/mypage/reviews` 직접
  접속 → `RequireAuth`가 정상적으로 홈으로 리다이렉트함을 확인(런타임 크래시
  없음, `MyReviewItem` import 트리 자체는 문제없이 빌드·로드됨) →
  `docker start app-web`으로 원복.
- 실제 수정·삭제 인터랙션(편집 폼 채우기, 저장, 삭제 확인 다이얼로그)은 이전
  항목들과 동일한 이유로 카카오 로그인이 필요해 브라우저로 재현 불가 —
  `MyPageReviews.test.tsx`의 AC5~AC13 테스트 12개(사진 보존 테스트 포함)로
  대체 검증했다. `docs/decisions.md`의 "논의 중" 섹션에 이미 기록된 표준
  제약과 동일한 패턴이라 별도 항목을 추가하지 않았다.
