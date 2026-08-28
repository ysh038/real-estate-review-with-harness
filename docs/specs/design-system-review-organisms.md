# 명세: ReviewSection·MyReviewItem을 atom/molecule로 교체 (Atomic Design 청크 3)

- 작성일: 2026-08-28
- 상태: 구현됨
- 선행: `docs/specs/design-system-atoms.md`(구현됨), `docs/specs/design-system-molecules.md`(구현됨),
  `docs/design-system-atomic-plan.md`

## 목표

`ReviewSection`(617줄/CSS 430줄)과 `MyReviewItem`(412줄/CSS 226줄)은 리뷰 작성·수정
폼을 통째로 복사해 CSS 클래스 22개를 중복 정의하고 있다. 그 결과 `:focus-visible`이
`ReviewSection`엔 8개, 같은 마크업을 복사한 `MyReviewItem`엔 0개인 드리프트가 이미
발생했다(청크 1에서 실측). 청크 1·2가 만든 atom 7종·molecule 7종(+Badge)은 아직
contact·OfficeInfoFields 파일럿 말고는 실사용처가 없다.

이번 청크는 두 organism의 중복 폼 마크업을 그 atom/molecule로 교체해 **중복을
실제로 없앤다.** 동작을 바꾸지 않는 순수 리팩터이며, 기존 유닛 테스트 78개
(`ReviewSection.test.tsx` 53 + `MyPageReviews.test.tsx` 25, 오늘 재실행으로 확인)와
전체 269개가 무수정 통과해야 한다.

## 범위 밖

- **`OfficeSearchBar`·`PhotoLightbox`·`LoginButton`·mypage 하위 페이지** — 청크 4.
- **`useOfficeReviews`·`useMyReviews`·`useReviewDraft` 훅 내부 로직** — 훅은 건드리지
  않는다. organism이 훅에서 받는 값과 훅에 넘기는 인자(개수·순서)는 그대로다.
- **사진 업로드 메모리 누수(`URL.createObjectURL` revoke 없음)** — 청크 2가 명시적으로
  미룬 문제다. 이번에도 고치지 않는다. 렌더마다 URL을 새로 만드는 현재 동작을
  `PhotoUploader`에 넘길 `items` 배열을 만드는 시점으로 그대로 옮긴다.
- **`.item`/`.itemActions`/`.itemHeader` 통합** — 두 organism이 같은 클래스 *이름*을
  쓰지만 이건 우연한 네이밍 충돌이지 같은 컴포넌트가 아니다(계획 문서의 22개 중복
  목록에 들어있는 이유는 이름이 같아서다). atomic-plan 어디에도 이걸 atom/molecule로
  뽑으라는 결정이 없다 — 각 organism 고유 레이아웃 클래스로 남긴다. `MyReviewItem`의
  `.item`(`--radius-md`)과 `ReviewSection`의 `.item`(`--radius-sm`)이 이미 다른데,
  이번 청크에서 시각적으로 통일하지 않는다.
- **`ReviewSection`의 `photoThumbnail*`(제출된 사진 그리드 + 라이트박스 트리거)** —
  업로드 미리보기(`PhotoUploader`가 대체하는 대상)와 다른 컴포넌트다. `MyReviewItem`
  읽기 모드는 애초에 사진을 안 보여줘 대응하는 중복도 없다. 안 건드린다.
- **`hiddenNotice`(신고 누적 숨김 문구)** — `MyReviewItem`에만 있고 대응하는 짝이
  없다. 안 건드린다.
- **다크 모드·간격 토큰 강제** — 계속 범위 밖.

## 원본과의 관계 (통제변인)

청크 1·2와 동일 — 원본에는 atom/molecule 계층이 없어 이 리팩터는 실험 관측 대상이지
원본 복제가 아니다.

## 설계

### 매핑 표 — organism 필드/버튼 → atom·molecule

| 현재 (두 organism 공통) | 교체 대상 | 비고 |
|---|---|---|
| `ratingInput`+`ratingLabel`(라디오 5개) | `RatingInput` | `name`은 `ReviewSection`="rating", `MyReviewItem`=`` `rating-${review.id}` `` 그대로 |
| `.rating`(읽기 전용 별) | `RatingDisplay` | 두 organism의 읽기 표시 둘 다 |
| `dealFields`+`dealSelect`×5+`yearInput` | `DealFieldSet` | 옵션 배열은 organism이 `@repo/types` 상수로 만들어 prop으로 넘긴다 |
| `tagChipGroup`+`tagChip`+`tagChipSelected` | `TagChipGroup` | `options={[...REVIEW_TAGS]}` |
| `photoSection`+`photoPreviewList`+`photoPreviewItem`+`photoPreviewImage`+`photoRemoveButton`+`photoAddLabel`+`photoFileInput` | `PhotoUploader` | 아래 "PhotoUploader 확장" 참고 — `MyReviewItem`은 두 리스트를 하나로 평평하게 합친다 |
| `formError`(`<p role="alert">`) | `FormError` | |

| 현재 버튼(개별) | 교체 대상 | 근거 |
|---|---|---|
| `sortButton`/`sortButtonActive`(정렬 토글) | `Chip` | 청크 1 실측: `aria-pressed` 쓰는 pill은 Chip |
| `helpfulButton`(도움돼요, 토글) | `Chip` | 위와 동일 |
| `submitButton`(등록) | `Button variant="primary" size="lg" type="submit"` | 청크 1 매핑표(primary: submitButton) |
| `loadMoreButton`(더보기) | `Button variant="ghost"` | 청크 1 매핑표(ghost: loadMoreButton×2) |
| `draftBannerButton`(복원/새로 작성) | `Button variant="outline"` | 청크 1 매핑표(outline: draftBannerButton) |
| `copyLinkButton`(링크 복사) | `Button variant="ghost"` | 청크 1 매핑표(ghost: copyLinkButton) |
| `saveButton`(저장) | `Button variant="primary"` | 청크 1 매핑표(primary: saveButton) |
| `cancelButton`(취소) | `Button variant="ghost"` | 청크 1 매핑표(ghost: cancelButton) |
| `editButton`(수정)/`deleteButton`(삭제) | `Button variant="ghost"` | 청크 1 매핑표(ghost: editButton, deleteButton) |
| 태그 집계·리뷰별 태그 배지(`tagBadge`, `ReviewSection`에만 있음) | `Badge variant="tag"` | 청크 2 산출물, 아직 미소비 |

### `reportButton` 분류 확정 (청크 1 열린 질문 1번)

**`Button variant="ghost"`로 확정한다.** 근거:

1. 현재 CSS가 `copyLinkButton`과 **완전히 같은 규칙**(`.copyLinkButton, .reportButton { ... }`)
   을 공유한다 — `copyLinkButton`은 이미 청크 1 매핑표에서 ghost로 확정돼 있다. 같은
   스타일을 공유하던 버튼을 굳이 다른 atom으로 나눌 이유가 없다.
2. `aria-pressed`가 없고, 클릭 후 `disabled`가 되면 **다시 눌러도 원상복구되지
   않는다**(일회성 액션). `Chip`은 `selected`/`onToggle`로 "누르면 상태가 뒤집힌다"는
   토글 계약을 스크린리더에도 전달한다(`aria-pressed`) — reportButton에 `selected=false`
   고정값을 넣으면 "지금 안 눌린 상태고 누르면 눌린 상태가 된다"는 잘못된 신호를
   준다. `disabled`만으로 충분히 "더 이상 누를 수 없음"을 전달하는 `Button`이 의미상
   더 정확하다.
3. 모양(pill)이 바뀌는 건 이미 `copyLinkButton`도 같이 겪는 변화이므로 이번 결정으로
   새로 생기는 시각 변경이 아니다(아래 "시각 변경" 참고).

### `PhotoUploader` 확장 — `removeLabel` (청크 2가 미리 남겨둔 지점)

청크 2 명세가 정확히 이 상황을 예견했다: *"MyReviewItem이 더 구체적인 alt를 item에
실어 구분이 필요하면 그때 removeLabel prop을 연다"*. 지금이 그 시점이다.

`MyReviewItem`은 삭제 버튼 접근 이름이 `기존 사진 N 삭제`/`새 사진 N 삭제`로 갈라져
있는데, 현재 `PhotoUploader`는 `` `사진 ${index + 1} 삭제` ``를 **렌더링 시점의 배열
인덱스**로 하드코딩한다. `MyReviewItem`이 `keptPhotos`+`newPhotoFiles`를 한 배열로
합치면 두 번째 리스트 첫 항목의 전역 인덱스가 0이 아니게 되어(예: 기존 사진 2장 +
새 사진 1장이면 새 사진의 전역 인덱스는 2) 인덱스 기반 라벨로는 "새 사진 1 삭제"를
만들 수 없다.

**해결**: 라벨을 인덱스가 아니라 **item 자신의 속성**으로 옮긴다.

```ts
export interface IPhotoItem {
  id: string;
  src: string;
  alt: string;
  /** 생략하면 `사진 ${index+1} 삭제`(현재 기본값, ReviewSection이 씀).
   *  호출자가 다른 문구가 필요하면(MyReviewItem의 기존/새 구분) 직접 넣는다. */
  removeLabel?: string;
}
```

`PhotoUploader.tsx`의 삭제 버튼 `aria-label`을
`` item.removeLabel ?? `사진 ${index + 1} 삭제` ``로 변경한다. 기본값이 그대로라
`ReviewSection`은 `removeLabel`을 안 넘겨도 되고, 청크 2가 만든 기존 스토리(기본
라벨 검증)도 무수정 통과한다.

### 두 organism의 `items` 빌드

**ReviewSection** (단일 리스트, `File[]`):

```ts
const photoItems: IPhotoItem[] = photoFiles.map((file, index) => ({
  id: String(index),
  src: URL.createObjectURL(file),   // 렌더마다 새로 만드는 기존 동작 그대로(범위 밖)
  alt: `첨부 사진 ${index + 1}`,
}));
// onRemove={(id) => removePhotoFile(Number(id))}
// onAdd={(files) => setPhotoFiles((cur) => [...cur, ...files.slice(0, REVIEW_PHOTOS_MAX - cur.length)])}
```

**MyReviewItem** (두 리스트를 id 접두사로 구분해 평평하게 합침):

```ts
const photoItems: IPhotoItem[] = [
  ...keptPhotos.map((photo, index) => ({
    id: `kept-${index}`,
    src: photo.url,
    alt: `기존 사진 ${index + 1}`,
    removeLabel: `기존 사진 ${index + 1} 삭제`,
  })),
  ...newPhotoFiles.map((file, index) => ({
    id: `new-${index}`,
    src: URL.createObjectURL(file),
    alt: `새 사진 ${index + 1}`,
    removeLabel: `새 사진 ${index + 1} 삭제`,
  })),
];
// onRemove={(id) => id.startsWith("kept-")
//   ? removeKeptPhoto(Number(id.slice(5)))
//   : removeNewPhotoFile(Number(id.slice(4)))}
// onAdd={(files) => setNewPhotoFiles((cur) => [...cur, ...files.slice(0, REVIEW_PHOTOS_MAX - keptPhotos.length - cur.length)])}
```

`max={REVIEW_PHOTOS_MAX}`, `accept={ALLOWED_PHOTO_TYPES.join(",")}`는 두 organism
공통.

### `DealFieldSet` 옵션 빌드

두 organism 모두 `@repo/types`의 `DEAL_TYPES`·`DEAL_RESULTS`·`EXPERTISE_LEVELS`·
`DEFECT_RESPONSES`(문자열 배열, value=label)와 1~12월 배열(value=문자열 숫자,
label=`` `${n}월` ``)을 `ISelectOption[]`으로 한 번 매핑해 넘긴다. 이 매핑 함수는
두 organism에 각각 둔다(`DealFieldSet`이 도메인을 모르게 하는 게 청크 2 설계
원칙이라 공용 유틸로 승격하지 않는다 — 매핑 자체가 4~5줄이라 추출 이득이 작다).

### 시각 변경 (이번 청크에서 실제로 화면이 바뀌는 지점)

atom/molecule를 그대로 적용하면 아래는 **의도적으로** 달라진다(테스트는 시각을
단정하지 않으므로 전부 통과하지만, 실제 화면 확인 시 확인할 것):

1. `sortButton`·`helpfulButton`의 미선택 배경이 `transparent` → `--color-background`
   (Chip 기본값). `tagChip`은 이미 `--color-background`였으므로 오히려 세 토글이
   **서로 통일**된다.
2. `copyLinkButton`·`reportButton`의 모양이 pill(`--radius-full`) → 각짐(`--radius-sm`,
   Button 기본), hover 배경이 `--color-background` → `--color-surface`(Button ghost
   hover). 청크 1 매핑표가 이미 결정한 변경이며 이번이 처음 실제로 반영되는 지점이다.
3. `loadMoreButton`의 padding이 `--space-2`(사방 동일) → `--space-2 --space-4`
   (Button md, 좌우가 더 넓어짐).
4. `MyReviewItem`의 `saveButton` 글자 두께(`font-weight-medium`)가 Button `md`
   기본값(굵기 지정 없음 → 상속)으로 바뀔 수 있다 — `/impl` 중 시각 차이가 거슬리면
   `className`으로 보강하되 새 CSS 원시값은 추가하지 않는다.
5. `:focus-visible` 링이 `MyReviewItem`의 버튼·입력 전체에 **새로 생긴다**(전에는
   0개) — 이게 청크 1이 예고한 "atom 차원에서 구조적으로 드리프트를 막는다"의
   실제 효과다.

## 수용 기준

### PhotoUploader 확장

- [x] AC1: `IPhotoItem`에 선택적 `removeLabel?: string`이 추가된다.
- [x] AC2: `removeLabel`을 안 넘긴 item은 삭제 버튼 접근 이름이 여전히
      `` `사진 ${index + 1} 삭제` ``다(기존 스토리 무수정 통과).
- [x] AC3: `removeLabel`을 넘긴 item은 그 값이 삭제 버튼 접근 이름이 된다(인덱스
      무시). `PhotoUploader.stories.tsx`에 이 케이스를 검증하는 story+play 1개 추가.

### ReviewSection 교체

- [x] AC4: 별점 입력이 `<RatingInput name="rating" value={rating} onChange={setRating} />`
      다.
- [x] AC5: 각 리뷰의 별점 표시가 `<RatingDisplay value={review.rating} />`다.
- [x] AC6: 거래 6필드가 `<DealFieldSet />` 하나로 바뀌고, `onChange(field, value)`가
      해당 `set*` 함수를 호출한다.
- [x] AC7: 태그 선택이 `<TagChipGroup options={[...REVIEW_TAGS]} selected={selectedTags} onToggle={toggleTag} />`다.
- [x] AC8: 태그 집계(`detail.tagCounts`)와 리뷰별 태그가 각각
      `<Badge variant="tag">{tag} {count}</Badge>` / `<Badge variant="tag">{tag}</Badge>`
      로 바뀐다(문구 형식 동일).
- [x] AC9: 사진 첨부가 `<PhotoUploader items={photoItems} max={REVIEW_PHOTOS_MAX} accept={...} onAdd={...} onRemove={...} />`
      로 바뀐다. `removeLabel`은 넘기지 않는다(기본값 사용).
- [x] AC10: 폼 에러·제출 에러가 `<FormError>{message}</FormError>`로 바뀐다.
- [x] AC11: 정렬 버튼 2개가 `Chip`이다(`selected={sort === option.value}`,
      `onToggle={() => setSort(option.value)}`).
- [x] AC12: 도움돼요 버튼이 `Chip`이다(`selected={review.isHelpful === true}`,
      `disabled={status !== "authenticated"}`).
- [x] AC13: 등록 버튼이 `<Button type="submit" size="lg" disabled={isSubmitting}>`다.
- [x] AC14: 더보기 버튼이 `<Button variant="ghost">`다.
- [x] AC15: 초안 배너의 복원·새로 작성 버튼이 각각 `<Button variant="outline">`다.
- [x] AC16: 링크 복사 버튼이 `<Button variant="ghost">`다.
- [x] AC17: 신고 버튼이 `<Button variant="ghost" disabled={reportedReviewIds.has(review.id)}>`다.
- [x] AC18: `ReviewSection.module.css`에서 이번에 atom/molecule로 대체된 클래스
      (`ratingInput`, `ratingLabel`, `rating`, `textarea`, `dealFields`, `dealSelect`,
      `yearInput`, `tagChipGroup`, `tagChip`, `tagChipSelected`, `sortButton`,
      `sortButtonActive`, `helpfulButton`(+`:disabled`), `copyLinkButton`, `reportButton`
      (+hover/disabled), `loadMoreButton`(+hover), `draftBannerButton`, `submitButton`
      (+hover/disabled), `formError`, `photoSection`, `photoPreviewList`,
      `photoPreviewItem`, `photoPreviewImage`, `photoRemoveButton`, `photoAddLabel`,
      `photoFileInput`, `tagBadge`)와 이들만 참조하던 `:focus-visible` 묶음 규칙이
      제거된다. `photoThumbnail*`·`item`·`itemActions`·`itemHeader`·`loginPrompt` 등
      범위 밖 클래스는 남는다.

### MyReviewItem 교체

- [x] AC19: 읽기 모드 별점 표시가 `<RatingDisplay value={review.rating} />`다.
- [x] AC20: 편집 모드 별점 입력이 `<RatingInput name={\`rating-${review.id}\`} .../>`다.
- [x] AC21: 거래 6필드가 `<DealFieldSet />`다(ReviewSection과 같은 옵션 매핑 함수를
      각자 파일 안에 둔다).
- [x] AC22: 태그 선택이 `<TagChipGroup />`다.
- [x] AC23: 사진 영역이 `keptPhotos`+`newPhotoFiles`를 합친 `items`를 받는 단일
      `<PhotoUploader />`다. 기존 사진 삭제 버튼 접근 이름은 `기존 사진 N 삭제`,
      새 사진은 `새 사진 N 삭제`를 유지한다(`removeLabel`로).
- [x] AC24: 폼 에러·제출 에러·삭제 에러가 각각 `<FormError>`다.
- [x] AC25: 저장 버튼이 `<Button variant="primary" disabled={isSubmitting}>`,
      취소 버튼이 `<Button variant="ghost">`다.
- [x] AC26: 수정 버튼이 `<Button variant="ghost">`, 삭제 버튼이 `<Button variant="ghost">`다.
- [x] AC27: `MyReviewItem.module.css`에서 대체된 클래스(`ratingInput`, `ratingLabel`,
      `rating`, `textarea`, `dealFields`, `dealSelect`, `yearInput`, `tagChipGroup`,
      `tagChip`, `tagChipSelected`, `photoSection`, `photoPreviewList`,
      `photoPreviewItem`, `photoPreviewImage`, `photoRemoveButton`, `photoAddLabel`,
      `photoFileInput`, `formError`, `saveButton`, `cancelButton`, `editButton`,
      `deleteButton`(+hover))이 제거된다. `item`·`itemHeader`·`itemActions`·
      `officeName`·`content`·`hiddenNotice`·`editActions`는 남는다.

### 회귀

- [x] AC28: `ReviewSection.test.tsx`(53개)·`MyPageReviews.test.tsx`(25개)가
      **한 글자도 수정하지 않고** 통과한다(오늘 재실행으로 78개 확인, 기준선).
- [x] AC29: `apps/web` 유닛 테스트 전체(오늘 기준 36파일 269개)가 무수정 통과한다.
- [x] AC30: `bun run --cwd apps/web test:storybook`이 통과한다(AC3로 늘어난 개수
      포함, 기존 93개는 회귀 없이 통과).
- [x] AC31: `node .harness/gates/run-checks.mjs` 전체(typecheck → lint → stylelint →
      test-storybook → test → build) 통과.

## 영향 범위

- **수정**: `apps/web/components/ReviewSection/ReviewSection.tsx`·`.module.css`,
  `apps/web/components/MyReviewItem/MyReviewItem.tsx`·`.module.css`,
  `apps/web/design-system/components/PhotoUploader/PhotoUploader.tsx`·
  `PhotoUploader.stories.tsx`(AC1~3 — 청크 2 산출물을 이번에 확장. `/impl`을
  다시 돌리는 게 아니라 새 스펙으로 정당하게 고치는 것이다).
- **새 의존성**: 없음.
- **기존 기능 영향**: 위 "시각 변경" 5개 항목 외 동작 변화 없음. 훅 호출 인자
  개수·순서·`toHaveBeenCalledWith` 계약은 그대로(청크 이전부터 있던 "인자 생략"
  관례 유지).

## 설계 메모

- **`reportButton`을 왜 지금 확정하는가**: 청크 1이 "둘 다 청크 3에서 교체되는
  대상이니 미뤄도 된다"고 남긴 질문이다. 실제 대체 작업을 하는 지금이 그 시점이고,
  위 "reportButton 분류 확정" 절의 근거(현재 CSS가 copyLinkButton과 완전히 같음,
  토글이 아닌 일회성 disable)로 Chip이 아니라 Button ghost로 정리한다.
- **`removeLabel`을 콜백이 아니라 item 필드로 만든 이유**: 처음엔 `removeLabel?:
  (index: number) => string` 콜백을 검토했지만, `MyReviewItem`이 두 리스트를 한
  배열로 합치면 두 번째 리스트 항목의 **전역 인덱스**가 0부터 시작하지 않아
  "새 사진 1 삭제"를 인덱스만으로 재구성할 수 없다. 라벨을 항목 자신에게 미리
  계산해 붙이면(호출자가 각자의 로컬 인덱스로 문자열을 만들어 넣으면) 이 문제가
  아예 생기지 않는다 — `id`·`src`·`alt`와 같은 패턴(평평한 값, 컴포넌트는 계산하지
  않음)이라 molecule의 기존 설계 원칙과도 맞는다.
- **`.item`/`.itemActions`/`.itemHeader` 이름 충돌을 안 푸는 이유**: 청크 1의
  22개 중복 목록은 "실측한 클래스 이름이 같다"는 사실을 나열한 것이지 "이게 전부
  한 컴포넌트가 돼야 한다"는 결론이 아니다. 두 organism의 카드 레이아웃(패딩·
  radius·배경)은 이미 다르고(md vs sm), 통합하면 이 청크가 리뷰 폼 중복 제거라는
  목표를 벗어나 무관한 시각 변경(카드 모양 통일)을 끼워 넣게 된다. 스코프 크리프라
  안 한다.
- **`DealFieldSet` 옵션 매핑을 공용 유틸로 안 뺀 이유**: 청크 2가 `DealFieldSet`이
  도메인 상수를 모르게 설계했다(다른 도메인 재사용 가능성 때문). 옵션 매핑 자체는
  organism마다 4~5줄이라, 지금 유틸로 추출하면 "두 곳에서 쓰는 3줄짜리 함수"를 위해
  새 파일을 만드는 셈이라 YAGNI 위반이다.
- **시각 변경을 막지 않고 그대로 반영하는 이유**: 청크 1 매핑표(ghost가
  copyLinkButton·cancelButton·editButton·deleteButton을 흡수한다는 것)는 이미
  확정된 결정이다. 이번 청크에서 그 결정을 실제로 적용했을 뿐 새로 만든 변경이
  아니다. 유닛 테스트가 시각을 단정하지 않으므로 AC로 통과 여부를 검증할 수는
  없고, `/impl` 마지막에 브라우저로 확인한다.

## 열린 질문

없음 — `reportButton` 분류(청크 1 열린 질문 1번)를 위에서 확정했고, 나머지는 청크
1·2 결정을 그대로 적용한다.

## 구현 순서 (Red → Green)

1. `PhotoUploader`에 `removeLabel` 필드 추가 + 스토리 1개 추가(AC1~3). 기존 93개
   스토리 테스트 회귀 없음을 먼저 확인한다.
2. `ReviewSection.tsx`를 위 매핑대로 교체. 매 컴포넌트 교체 후
   `bun run --cwd apps/web test -- ReviewSection.test.tsx`로 즉시 확인하며 진행한다
   (한 번에 다 바꾸고 마지막에 몰아서 디버깅하지 않는다).
3. `ReviewSection.module.css`에서 죽은 클래스 제거(AC18). `stylelint`로 미사용
   경고는 안 잡히므로 매핑 표와 대조해 수동 확인한다.
4. `MyReviewItem.tsx`를 동일 순서로 교체, 특히 사진 `items` 병합(AC23)과
   `onRemove`의 `kept-`/`new-` 분기를 먼저 유닛 테스트로 확인한다.
5. `MyReviewItem.module.css` 죽은 클래스 제거(AC27).
6. `node .harness/gates/run-checks.mjs` 전체 통과 확인. **게이트의 `next build`가
   떠 있는 dev 서버의 `.next`를 깨뜨리는 재발 이슈** — 청크 1·2와 동일하게, 사용자가
   보고 있는 서버가 있는지 먼저 확인하고 필요하면 재기동한다.
7. 브라우저로 "시각 변경" 5개 항목 실제 확인(사무소 상세 패널에서 리뷰 작성 폼,
   마이페이지에서 리뷰 수정 폼).
8. `docs/design-system-atomic-plan.md` 상태를 "청크 3 완료"로, 다음 액션을 청크 4로
   갱신한다.

## 실행 결과 (2026-08-28)

**Red → Green**

- `PhotoUploader`에 `RemoveLabelOverride` 스토리를 먼저 추가 → 커스텀 라벨이
  기본값(인덱스 기반)에 가려져 **Red 확인**(`getByRole("button", {name: "기존 사진
  1 삭제"})`가 못 찾음). `IPhotoItem.removeLabel` 필드 + `aria-label={item.removeLabel
  ?? ...}` 추가 후 **8/8 Green**(기존 7개 회귀 없음).
- `ReviewSection.tsx`·`MyReviewItem.tsx`를 명세 매핑대로 교체. 두 organism 모두
  교체 직후 `ReviewSection.test.tsx`(53)·`MyPageReviews.test.tsx`(25)가 **한 글자도
  수정하지 않고 통과** — `reportButton`→Button ghost, `sortButton`/`helpfulButton`→Chip,
  사진 `items` id 접두사 분기(`kept-`/`new-`) 전부 첫 실행에 통과해 별도 디버깅
  루프가 필요 없었다.
- `ReviewSection.module.css`·`MyReviewItem.module.css`에서 매핑표의 대체 대상
  클래스를 전부 제거(AC18·AC27). 제거 후에도 두 테스트 파일 재실행 통과 확인
  (CSS 제거가 jsdom 유닛 테스트에 영향 없음을 재확인하는 차원).

**회귀**

- `apps/web` 유닛 테스트: 36파일 **269개 그대로 통과**(AC29).
- `bun run --cwd apps/web test:storybook`: 17파일 **94개 통과**(기존 93 + 신규
  `RemoveLabelOverride` 1, AC30).
- `node .harness/gates/run-checks.mjs` 전체(typecheck → lint → stylelint →
  test-storybook → test → build) **통과**(AC31). `typecheck`·`stylelint`는 처음부터
  깨끗했고, `lint`에서 `import/order` 4건(신규 atom import가 기존 hooks/lib import보다
  앞에 와야 함, 청크 1·2와 같은 패턴)만 걸려 `eslint --fix`로 해결.

**브라우저 검증 (2026-08-28, Docker 기동 후 추가 진행)**

- 사용자가 Docker를 띄운 뒤 `harness-review-postgres`·`harness-review-minio` 컨테이너
  확인 → `bun run db:migrate`(이미 적용된 스키마, no-op) → API(8788)·web(3000) dev
  서버 기동 → `GET /api/offices` bbox 조회로 시딩 데이터(500건) 생존 확인.
- 로그인 없이 볼 수 있는 부분(비인증 상태에서도 항상 렌더되는 요소)을 확인하려고
  실제 사무소 1곳에 QA용 리뷰 1건을 SQL로 직접 넣었다(`users`·`reviews`·`review_tags`
  각 1행, 확인 후 즉시 삭제 — 카카오 로그인 없이 리뷰를 만들 수 있는 경로가 없어서
  택한 임시 방법, 실제 서비스 데이터 아님).
- `/offices/나-36040000-1-0182`를 열어 `getComputedStyle`로 "시각 변경" 1·2번을
  실측:
  - `오래된순`(미선택 정렬 Chip)·`도움돼요 0`(미선택+disabled Chip): `background-color:
    rgb(255,255,255)`(`--color-background`), `border-radius: 9999px` — Chip 전환 후
    예상대로 배경이 통일됨.
  - `최신순`(선택된 Chip): `background-color: rgb(14,90,107)`(`--color-primary`) — 선택
    상태 정상.
  - `링크 복사`(Button ghost로 교체된 copyLinkButton): `background-color:
    rgba(0,0,0,0)`(투명, 불변), `border-radius: 2px`(`--radius-sm`, 이전엔 `9999px`) —
    설계 절에서 예고한 pill→각짐 변경 실측 확인.
  - 콘솔 에러 없음(`/api/me` 401 6건은 비로그인 상태의 정상 동작).
  - 확인 후 QA 리뷰·태그·사용자 행 전부 삭제, `reviews` 테이블 0건으로 원복 확인.
- **여전히 확인 못 한 것**: "시각 변경" 3~5번(더보기 버튼 padding, `MyReviewItem`
  저장 버튼 글자 두께, `MyReviewItem` 방문 연도 placeholder)은 각각 페이지네이션
  (리뷰 20+건)과 카카오 로그인(작성 폼·마이페이지 수정 폼 전체가 인증 필요)이
  있어야 도달한다. 이 세션의 브라우저는 실제 카카오 OAuth 동의 화면을 통과할 수
  없어(계정 자격증명 필요) 로그인 세션을 임의로 발급하는 방법도 고려했지만, 이번
  작업 범위를 넘어서는 별도 판단이 필요해 보류했다 — 필요하면 사용자가 브라우저에서
  직접 카카오 로그인 후 `/offices/[id]`에서 작성 폼과 `/mypage/reviews` 수정 폼을
  열어 육안 확인하면 된다. 구조·ARIA·이벤트 배선은 78개 유닛 테스트 + Storybook
  94개가 이미 촘촘히 검증했으므로 리스크는 낮다.

## 다음 청크가 알아야 할 것

- `reportButton`(청크 1 열린 질문 1번)은 최종적으로 **Button ghost**로 정리됐다 —
  청크 4에서 비슷하게 애매한 pill-이지만-토글이-아닌 버튼을 만나면 이 판례
  (같은 CSS를 공유하던 버튼과 함께 분류, aria-pressed 유무로 Chip/Button을 가른다)를
  따른다.
- `PhotoUploader`에 `removeLabel?: string`이 추가됐다 — 청크 4에서 새 소비처가
  생기면 이 필드를 그대로 재사용한다(콜백이 아니라 item 필드인 이유는 이 문서
  "설계 메모" 참고).
- Docker는 이제 떠 있다(`harness-review-postgres`·`harness-review-minio`, 볼륨에
  시딩 데이터 500건 생존). 청크 4에서 브라우저 검증할 때는 이 컨테이너를 그대로
  쓰면 된다.
- 카카오 로그인 없이 인증이 필요한 화면(작성 폼·마이페이지)을 확인하려면 직접
  로그인하거나, DB에 리뷰를 직접 넣어 비인증 상태에서 보이는 부분만 확인하는
  이번 방법(사용 후 즉시 삭제)을 재사용한다.
