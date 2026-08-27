# 명세: 리뷰 수정 시 사진 변경(추가/삭제)

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

`review-photo-upload.md`(작성 시 사진 첨부)와 `review-edit-and-delete-ui.md`(수정
UI)는 둘 다 "사진 변경"을 명시적으로 범위 밖에 두고 미뤘다 — 편집 폼은 지금
`review.photos`의 `storageKey`를 그대로 `photoKeys`에 실어 보내기만 해서, 리뷰를
수정해도 사진이 사라지지는 않지만 **바꿀 방법 자체가 없다**. Phase 2의 마지막
남은 항목을 구현한다: 편집 폼에서 기존 사진을 제거하거나 새 사진을 추가할 수 있게
하고, 저장 시 (남은 기존 사진 + 새로 업로드한 사진) 순서로 `photoKeys`를 구성해
PATCH한다.

## 범위 밖

- **사진 순서 재배열(드래그 앤 드롭)** — `review-photo-upload.md`와 동일한 이유로
  계속 범위 밖. 순서는 "남은 기존 사진(원래 순서 유지) → 새로 추가한 사진(추가한
  순서)"로 고정한다. 기존 사진끼리, 또는 기존/신규를 섞어서 순서를 바꾸는 UI는
  만들지 않는다.
- **편집 폼 안에서 라이트박스로 확대 보기** — 이미 붙어 있는 사진은 작은 썸네일 +
  제거(×) 버튼만 제공한다. 확대해서 다시 보고 싶으면 취소하고 일반 표시로 돌아가면
  된다.
- **업로드 실패 시 부분 업로드된 파일 정리** — `review-photo-upload.md`와 동일한
  정책. 3장 중 일부만 업로드에 성공한 뒤 나머지가 실패해도 이미 올라간 파일은
  스토리지에 그대로 남는다.
- **관리자가 리뷰의 특정 사진만 골라 삭제** — 여전히 범위 밖(기존 모더레이션은
  리뷰 전체 숨김만 가능).
- **사무소 상세 페이지(`ReviewSection`)에서의 사진 변경** — `review-edit-and-delete-ui`와
  동일하게 이번에도 마이페이지(`/mypage/reviews`)에서만 수정한다.

## 수용 기준

**`useMyReviews.updateReview` (Vitest — `reviewsApi` 모킹)**

- [x] AC1: 세 번째 인자(`newPhotoFiles`)를 생략하고 호출하면 업로드 없이 기존처럼
      `input`을 그대로 실어 PATCH가 나간다(기존 동작 회귀 확인).
- [x] AC2: `newPhotoFiles`가 있으면 각 파일을 `uploadPhoto`로 순차 업로드하고, PATCH
      요청의 `photoKeys`가 "`input.photoKeys`(남은 기존 사진) + 새로 업로드된
      storageKey들" 순서로 이어붙은 채로 나간다.
- [x] AC3: 업로드가 하나라도 실패하면 PATCH 요청 자체를 보내지 않고 에러를 던진다
      (`reviews` 상태는 그대로 — `review-photo-upload` AC17과 동일한 원칙을 수정
      경로에도 적용).

**`MyReviewItem` 편집 폼 (Testing Library)**

- [x] AC4: 편집 진입 시 기존 사진이 있으면 각각 제거(×) 버튼이 달린 썸네일로 보인다.
- [x] AC5: 기존 사진의 × 버튼을 누르면 그 사진이 미리보기에서 사라진다(로컬 상태만
      — 저장 전까지 서버에는 아무 영향 없음).
- [x] AC6: 파일을 새로 선택하면 로컬 미리보기가 추가되고 각각 제거(×) 버튼이 있다.
- [x] AC7: (남은 기존 사진 수 + 새로 추가한 사진 수)가 3장에 도달하면 "+ 사진 추가"
      입력이 더 이상 보이지 않는다.
- [x] AC8: 저장을 누르면 새로 추가한 파일을 먼저 업로드하고, 그 결과로 PATCH의
      `photoKeys`가 "남은 기존 사진 + 새로 업로드된 사진" 순서로 채워진다.
- [x] AC9: 취소를 누르면 사진 관련 변경(기존 사진 제거·새 사진 추가)이 다른 필드와
      함께 전부 원래 상태로 되돌아간다.
- [x] AC10: 사진이 없던 리뷰를 편집할 때는 기존 썸네일 없이 "+ 사진 추가"만 보이고,
      아무것도 추가하지 않고 저장하면 `photoKeys: []`로 PATCH된다(기존 동작 회귀
      확인).
- [x] AC11: 업로드가 실패하면 에러 문구가 보이고 편집 폼이 사진 변경 내역을 포함해
      열린 채로 유지되며, PATCH 요청은 나가지 않는다(`review-edit-and-delete-ui`
      AC12의 "서버 실패 시 입력값 유지" 패턴을 사진에도 적용).

## 영향 범위

- **만질 파일**
  - `apps/web/hooks/useMyReviews.ts` — `updateReview`에 세 번째 인자
    `newPhotoFiles: File[] = []` 추가. `useOfficeReviews.submitReview`와 동일한
    패턴으로 순차 업로드 후 `photoKeys`를 합성해 `updateReviewRequest` 호출.
  - `apps/web/components/MyReviewItem/MyReviewItem.tsx` — 편집 폼에 사진 섹션 추가:
    `keptPhotos: TReviewPhoto[]`(초기값 `review.photos`) + `newPhotoFiles: File[]`
    상태, 기존 사진 제거·새 파일 추가/제거 핸들러, `REVIEW_PHOTOS_MAX` 도달 시
    파일 입력 숨김. `handleSave`가 `photoKeys: keptPhotos.map(p => p.storageKey)`를
    `input`에 싣고 `onUpdate(review.id, input, newPhotoFiles)` 호출로 변경.
    `resetFieldsFromReview`/`handleCancelEdit`에 사진 상태 초기화 추가.
  - `apps/web/components/MyReviewItem/MyReviewItem.module.css` — `ReviewSection.module.css`의
    `photoSection`/`photoPreviewList`/`photoPreviewItem`/`photoPreviewImage`/
    `photoRemoveButton`/`photoAddLabel`/`photoFileInput` 클래스를 동일하게 추가
    (기존 `RATING_OPTIONS` 등과 같은 이유로 공유 모듈로 빼지 않고 복제 — 아래 설계
    메모).
  - `apps/web/app/mypage/reviews/page.tsx` — `useMyReviews`의 `updateReview`를
    그대로 `MyReviewItem`에 전달하는 배선은 이미 있어 변경 없음(시그니처가
    함수 참조로만 전달되므로 세 번째 인자 추가는 호출부 수정 없이 자연히 반영).
  - 테스트: `useMyReviews.test.ts`(AC1~AC3) · `MyPageReviews.test.tsx`(AC4~AC11,
    기존 `MyReviewItem` 렌더 기준 검증 패턴 유지).
- **새 의존성**: 없음.
- **기존 기능 영향**: `newPhotoFiles` 인자가 옵션(`= []`)이라 이 인자 없이 호출하는
  기존 경로(현재는 없지만 향후 다른 호출부가 생겨도)는 그대로 동작한다. 사진이
  없는 리뷰의 편집 플로우는 AC10으로 무회귀를 보장한다.

## 설계 메모

- **업로드 오케스트레이션을 훅으로 내리는 이유**: 작성 폼(`ReviewSection`)도
  `submitReview(input, photoFiles)`가 훅(`useOfficeReviews`) 안에서 업로드 루프를
  돈다 — 컴포넌트는 `File[]`만 넘기고 네트워크 순서 제어(업로드 → 실패 시 중단 →
  성공 시에만 본 요청)는 훅이 갖는다. `MyReviewItem`이 직접 `uploadPhoto`를
  호출하게 하면 같은 성격의 로직이 두 곳에 흩어진다 — 작성/수정 두 경로가 같은
  원칙(전부 성공해야 본 요청)을 공유하므로 같은 계층에 둔다.
- **순서 규칙: 기존 유지 → 신규 추가, 항상 이 순서**: 사용자가 기존 사진 2장 중
  1장을 지우고 새 사진 1장을 추가하면, 지워지지 않은 기존 사진이 항상 앞에 오고
  새 사진이 뒤에 붙는다. 사용자가 어떤 순서로 조작했는지(먼저 지웠는지 나중에
  추가했는지)와 무관하게 결과가 결정적이어서 놀랄 일이 없다 — 순서 재배열 자체가
  범위 밖이라 이 정도 규칙이면 충분하다.
- **`photoPreviewList` 등 CSS 클래스를 복제하는 이유**: `review-edit-and-delete-ui.md`의
  `RATING_OPTIONS`/`MONTH_OPTIONS` 복제와 같은 판단이다 — 두 컴포넌트가 쓰는
  사진 미리보기 UI가 몇 줄짜리 CSS 클래스 묶음이라, 지금 시점에 공유 컴포넌트로
  추출하는 것보다 각자 갖는 편이 결합도가 낮다. 세 번째 사용처가 생기면 그때
  추출을 재고한다.
- **기존 사진 제거는 "삭제 API 호출"이 아니라 로컬 상태 조작**: `review_photos`
  레코드는 PATCH 한 번으로 `replacePhotos`가 통째로 교체한다(기존 리뷰
  작성/수정 계약과 동일, `review-photo-upload` 설계 메모). 그래서 "제거"는 저장
  시점에 `photoKeys`에서 그 storageKey를 빼는 것으로 충분하고, 별도 삭제 엔드포인트가
  필요 없다.

## 열린 질문

없음 — 순서 규칙(기존 유지 → 신규 추가 고정)과 범위(재배열·라이트박스·부분
업로드 정리 전부 제외)에 이견이 없으면 `/impl`로 진행한다.

## 실행 결과 (2026-08-27)

- **AC1~AC3(`useMyReviews`)**: `updateReview`에 세 번째 인자 `newPhotoFiles`를
  추가 — 생략 시(AC1) 기존 `input`을 그대로 PATCH, 있으면(AC2) 순차 업로드 후
  `photoKeys` 뒤에 이어붙여 PATCH, 업로드 실패 시(AC3) PATCH 자체를 안 보내고
  예외를 그대로 던진다. Vitest 3건 신규 → Red(시그니처 없음) 확인 →
  `useOfficeReviews.submitReview`와 동일한 순차 업로드 패턴으로 구현 → Green.
  기존 5건 회귀 없음.
- **AC4~AC11(`MyReviewItem`)**: 편집 폼에 `keptPhotos`/`newPhotoFiles` 상태와
  기존 사진 제거·새 파일 추가/제거 핸들러, 합계 3장 도달 시 파일 입력 숨김을
  추가. `handleSave`는 `photoKeys: keptPhotos.map(...)`를 `input`에 싣고,
  `newPhotoFiles`가 있을 때만 `onUpdate`를 3개 인자로 호출한다(비어 있으면 2개
  인자 그대로 — 기존 AC11 테스트 두 건이 `toHaveBeenCalledWith`로 인자 개수까지
  비교하고 있어 호출 형태를 지켜야 했다). `MyPageReviews.test.tsx`에 8건 신규
  작성 → 전부 Red 확인 → 구현 후 Green. `ReviewSection.module.css`의
  `photoSection`/`photoPreviewList`/`photoRemoveButton`/`photoAddLabel` 등을
  `MyReviewItem.module.css`에 동일하게 복제(설계 메모의 판단 유지).
- **테스트 작성 중 발견한 함정 하나(구현 결함 아님)**: AC5 테스트에서 기존 사진
  2장 중 1번째를 지운 뒤 "2번째 사진이 보인다"를 `getByAltText("기존 사진 2")`로
  검증하려 했으나 실패했다 — alt 텍스트가 `keptPhotos` 배열의 현재 인덱스
  기준(`index + 1`)이라 삭제 후 재배치되면서 남은 사진이 "기존 사진 1"로
  재라벨링된 것. 이는 의도된 동작(안정적인 순번보다 항상 "지금 몇 번째"를
  보여주는 게 사용자에게 더 직관적)이라 구현을 바꾸지 않고, 테스트를 라벨이
  아니라 `src` 값으로 남은 사진을 식별하도록 고쳤다.
- **전체 회귀**: `apps/web` 전체 Vitest 261건 통과(기존 249 + 신규 12: 훅 3 +
  컴포넌트 8 + 훅 목 배선 조정 1). `node .harness/gates/run-checks.mjs` 전체
  게이트(typecheck → lint → stylelint → test → build) 첫 시도에 바로 통과.
- **브라우저 검증**: `/mypage/reviews` 직접 접속 → `RequireAuth`가 정상적으로
  홈으로 리다이렉트하고 지도가 정상 렌더링됨을 확인(런타임 크래시 없음). 첫
  시도에서 500 에러가 떴었는데, 원인은 직전 하네스 게이트의 `next build`
  (production)가 `next dev`(Turbopack)와 같은 `.next` 디렉터리를 동시에 써
  `_buildManifest.js.tmp.*` 파일이 깨진 것 — 이 세션에서 이미 알려진 Windows
  Turbopack 캐시 손상 패턴(`docs/decisions.md` 근거 로그와 동일 증상)이라
  `.next` 삭제 후 dev 서버 재기동으로 해결, 재현 결과 정상 확인. 실제 수정
  폼에서의 사진 추가/삭제 인터랙션은 이전 항목들과 동일한 이유로 카카오
  로그인이 필요해 브라우저로 재현 불가 — `MyPageReviews.test.tsx`의 AC4~AC11
  8건으로 대체 검증했다.
