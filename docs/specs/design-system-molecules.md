# 명세: 디자인시스템 molecules (Atomic Design 청크 2)

- 작성일: 2026-08-28
- 상태: 구현됨
- 선행: `docs/specs/design-system-atoms.md` (구현됨), `docs/design-system-atomic-plan.md`

> **핸드오프.** 청크 2는 구현됨(AC1~31). 다음은 청크 3 `/spec` —
> ReviewSection·MyReviewItem을 이 molecule로 교체. 99개 테스트 무수정 통과,
> `reportButton` 분류(청크 1 열린 질문 1번)는 그 명세에서 확정. 이 파일을
> `/impl`로 다시 돌리지 않는다.

## 목표

청크 1이 만든 atom은 contact 파일럿 말고는 아직 아무도 쓰지 않는다. ReviewSection과
MyReviewItem이 CSS 클래스 **22개를 중복 정의**하고 있고, 그 22개 중 대부분이 폼
조각(별점 입력·거래 필드·태그 칩 묶음·사진 업로더·에러 문구)이다. atom만으로는
이 중복이 안 풀린다 — 조각을 묶는 molecule이 있어야 청크 3에서 organism을 교체할 수
있다.

이번 청크는 **molecule(+ Badge atom)을 만들고 스토리로 증명**하는 것까지다.
큰 organism 교체는 청크 3이다.

## 범위 밖

- **`ReviewSection`·`MyReviewItem` 교체** — 청크 3. 합쳐 TSX 1,029줄 + CSS 656줄,
  테스트 78개가 걸려 있다. 이번에 molecule을 만들되 이 두 파일은 손대지 않는다.
- **`OfficeSearchBar`·`PhotoLightbox`·`LoginButton`·mypage 페이지 교체** — 청크 4.
  `TagChipGroup`은 카테고리 칩에도 쓸 수 있게 제네릭으로 만들되, SearchBar에 꽂는
  것은 청크 4다.
- **`reportButton` = Button ghost vs Chip** — 청크 1 열린 질문 1번, 여전히 청크 3
  명세에서 확정. 이번 청크 대상이 아니다.
- **`Skeleton`·`EmptyState`·`ErrorState` 위치 이동** — 이미 독립 컴포넌트로 동작
  중이다. 폴더만 옮기면 import 경로만 흔들린다. 이번에도 안 옮긴다.
- **사진 업로드 로직(용량·타입 검증, `URL.createObjectURL` revoke)** — 현재
  organism이 가진 동작 그대로를 molecule이 재현하는 것이 목표다. 기존 메모리
  누수(매 렌더마다 object URL 생성)를 이번 청크에서 고치지 않는다. 고친다면
  청크 3에서 테스트와 함께.
- **다크 모드·간격 토큰 강제** — 청기와 명세가 이미 범위 밖으로 둔 것을 유지한다.

## 원본과의 관계 (통제변인)

원본에는 디자인시스템·Storybook·molecule 계층이 없다. 청크 1과 같이 **실험의
관측 대상**이지 원본 복제가 아니다.

## 실측으로 계획을 고친 것

계획 문서(`docs/design-system-atomic-plan.md`) molecules 표는 조사 당시 초안이다.
이번 명세 작성 중 코드를 다시 열어 아래를 고친다.

| 계획 문서 | 실제 (2026-08-28 재실측) |
|---|---|
| `DealFieldSet` = Select×4 + NumberInput×1 | **Select×5 + Input×1**. 거래유형·거래결과·방문월·전문성·하자대응 + 방문 연도 |
| PhotoUploader가 두 organism에서 같다 | **쓰기와 수정이 다르다.** ReviewSection은 `File[]` 하나, MyReviewItem은 기존 사진(`keptPhotos`) + 새 파일(`newPhotoFiles`) 두 목록 |
| 중복 22개가 청크 2에서 해소 | **해소는 청크 3.** 청크 2는 그 22개를 흡수할 molecule을 *만드는* 단계 |

## 설계

위치는 청크 1과 같다: `apps/web/design-system/components/<Name>/`. atoms/molecules
폴더를 나누지 않는다(계획 문서: 교과서식 5계층 폴더를 새로 파지 않는다).

도메인 상수(`REVIEW_TAGS`·`DEAL_TYPES`·`REVIEW_PHOTOS_MAX` 등)는 molecule이
**import하지 않는다.** 옵션·상한·accept는 props로 받는다. 이유: 디자인시스템이
`@repo/types`의 리뷰 스키마에 묶이면 청크 4에서 카테고리 칩 같은 다른 도메인에
못 쓴다. 청크 3 organism이 이미 그 상수를 갖고 있다.

`composes` 불가, 색상 원시값 금지, 스토리 `play` 필수 — 청크 1과 동일
(`.cursor/rules/30-design-system.mdc`).

### Badge (atom, 청크 1에서 미룬 A6)

Chip(토글, `aria-pressed`)과 Badge(읽기 전용)는 역할을 분리한다. 사용처 2곳의
모양이 달라 **variant 2개**로 흡수한다.

| variant | 실측 시그니처 | 흡수 대상 |
|---|---|---|
| `tag`(기본) | `--radius-full`, `--color-text-muted` / `--color-background`, `1px solid --color-border` | `tagBadge` (ReviewSection 태그 목록·태그 집계) |
| `warning` | `--radius-sm`, `--color-rating` / `--color-surface`, 테두리 없음 | `lowConfidenceBadge` (OfficeInfoFields) |

마크업은 `<span>`이다. 부모가 `<li>`·`<p>`를 감싼다. `aria-pressed` 없음.

### RatingInput

`role="radiogroup"` + radio 1~5. 현재 두 organism이 숫자 `1`~`5`를 라벨로 그린다
(별 문자가 아님 — 별은 `RatingDisplay` 쪽).

필수 prop: `value: number`, `onChange: (value: number) => void`, `name: string`.
`name`이 필요한 이유: ReviewSection은 `name="rating"`, MyReviewItem은
`name={\`rating-${review.id}\`}` — 한 페이지에 여러 그룹이 공존한다.

### RatingDisplay

읽기 전용 별점. `"★".repeat(value) + "☆".repeat(5 - value)`,
`aria-label={\`${value}점\`}`, 색은 `--color-rating`(청기와 재브랜딩 때 대비
때문에 신설한 토큰. warning 토큰을 글자에 쓰면 2.2:1).

### TagChipGroup

내부에서 청크 1 `Chip`을 조립한다. `role="group"`.

prop: `options: string[]`, `selected: string[]`, `onToggle: (value: string) => void`,
`label` (aria-label, 기본 `"태그"`). 옵션 문자열을 그대로 Chip 라벨로 쓴다.

### DealFieldSet

6개 필드를 `Select`×5 + `Input type="number" width="narrow"`로 조립한다.
레이아웃은 현재와 같이 `flex-wrap` + gap.

각 필드의 `aria-label`은 지금 코드와 동일해야 청크 3에서 기존 테스트를 안 건드린다:

| 필드 | aria-label | atom |
|---|---|---|
| 거래유형 | 거래유형 | Select |
| 거래결과 | 거래결과 | Select |
| 방문 연도 | 방문 연도 | Input number narrow |
| 방문 월 | 방문 월 | Select (label은 `"3월"`, value는 `"3"`) |
| 전문성 | 전문성 | Select |
| 하자 대응 | 하자 대응 | Select |

값은 전부 `string`이다(현재 organism state와 같음). 빈 문자열 = "선택 안 함"
(`Select`의 `placeholder`, 청크 1 AC14). 옵션 배열은 props.

```ts
values: {
  dealType: string;
  dealResult: string;
  visitedYear: string;
  visitedMonth: string;
  expertise: string;
  defectResponse: string;
}
onChange: (field: keyof values, value: string) => void
```

### PhotoUploader

쓰기 폼과 수정 폼의 차이를 molecule 안에 넣지 않는다. **이미 있는 미리보기
목록 + 추가 input**만 그린다. 부모가 `File`/`storageKey`를 아래 형태로 정규화한다.

```ts
items: { id: string; src: string; alt: string }[]
max: number
accept: string          // 예: "image/jpeg,image/png,image/webp,image/gif"
onAdd: (files: File[]) => void
onRemove: (id: string) => void
addLabel?: string       // 기본 "+ 사진 추가"
```

- `items.length >= max`이면 추가 라벨을 렌더하지 않는다(현재 두 organism과 동일).
- 삭제 버튼은 청크 1 `Button size="icon"`이다. `position: absolute; top/right: -6px`는
  **이 molecule의 레이아웃**이다(청크 1 설계 메모가 여기에 위임함).
- 숨긴 file input: `aria-label="사진 추가"`, `multiple`, `accept`.
- `src`는 부모가 만든 URL을 그대로 쓴다. molecule은 `URL.createObjectURL`을
  호출하지 않는다.

### FormError

`role="alert"`인 `<p>`. 색은 `--color-error`. 부모가 렌더 여부를 정한다
(메시지 null이면 이 컴포넌트 자체를 안 그린다). 빈 껍데기를 그리지 않는다.

## 수용 기준

### Badge

- [x] AC1: `Badge`가 `variant`(`tag`|`warning`, 기본 `tag`)를 받고, 두 variant가
      서로 다른 클래스를 적용한다.
- [x] AC2: `variant="tag"`는 `border-radius`가 `--radius-full`(computed `9999px`)이다.
- [x] AC3: `variant="warning"`의 글자색은 `--color-rating`이다(warning 토큰을
      글자에 쓰지 않는다 — OfficeInfoFields CSS 주석과 동일 근거, 대비 5.9:1).
- [x] AC4: `Badge`는 버튼이 아니다 — `role="button"`이 없고 `aria-pressed`가 없다.

### RatingInput

- [x] AC5: `role="radiogroup"`이고 `aria-label`이 `"별점"`이다.
- [x] AC6: radio 5개가 있고 각 `aria-label`이 `"1점"`…`"5점"`이다.
- [x] AC7: `value={3}`이면 3점 radio만 checked이다.
- [x] AC8: 4점 radio를 클릭하면 `onChange(4)`가 1회 호출된다.
- [x] AC9: 같은 페이지에 `name`이 다른 RatingInput 두 개를 그려도 radio 그룹이
      섞이지 않는다(각 그룹에서 독립적으로 하나만이 checked).

### RatingDisplay

- [x] AC10: `value={4}`이면 접근 가능한 이름이 `"4점"`이고, 텍스트에 별(★) 4개와
      빈 별(☆) 1개가 포함된다.
- [x] AC11: 글자색이 `--color-rating`이다.

### TagChipGroup

- [x] AC12: `role="group"`이고 `label` prop이 그대로 `aria-label`이 된다.
- [x] AC13: `options` 개수만큼 Chip이 렌더되고, `selected`에 든 값만
      `aria-pressed="true"`이다.
- [x] AC14: 미선택 Chip을 클릭하면 `onToggle`이 그 옵션 문자열로 1회 호출된다.
- [x] AC15: 내부 토글 버튼이 청크 1 `Chip`이다(자체 버튼 마크업을 다시 만들지
      않는다) — 스토리에서 Chip과 같은 pill(`9999px`)인 것으로 확인한다.

### DealFieldSet

- [x] AC16: 위 표 6개 필드가 각각 해당 `aria-label`로 쿼리된다.
- [x] AC17: 방문 연도 필드는 `type="number"`이고 폭이 6em(청크 1 Input
      `width="narrow"`).
- [x] AC18: 거래유형 Select를 바꾸면 `onChange("dealType", <새 값>)`이 1회
      호출된다.
- [x] AC19: 내부 Select·Input은 청크 1 atom이다 — 각 컨트롤이 `:focus-visible`
      에서 `--color-focus` 아웃라인을 갖는다(청크 1 AC17을 재사용, 드리프트
      재발 방지).

### PhotoUploader

- [x] AC20: `items` 개수만큼 미리보기 이미지가 보이고, 각 삭제 버튼의
      `aria-label`이 해당 item `alt` 기준 `"… 삭제"`가 아니라 **호출자가 준
      `alt`와 구분되는 삭제 이름**을 갖는다. 삭제 버튼 접근 이름은
      `사진 ${index+1} 삭제` 형식이다(현재 ReviewSection과 동일:
      `aria-label={\`사진 ${index + 1} 삭제\`}`). item.alt는 img alt로만 쓴다.
- [x] AC21: 삭제 버튼을 클릭하면 `onRemove(item.id)`가 1회 호출된다.
- [x] AC22: `items.length < max`이면 `aria-label="사진 추가"`인 file input이
      있고, `accept`·`multiple`이 prop 그대로다.
- [x] AC23: `items.length >= max`이면 사진 추가 file input이 없다.
- [x] AC24: 삭제 버튼은 `Button size="icon"`이다(청크 1 atom 재사용). 미리보기
      item은 `position: relative`이고 삭제 버튼은 `top`/`right`가 `-6px`이다.

### FormError

- [x] AC25: `role="alert"`인 문단으로 children을 그대로 보여준다.
- [x] AC26: 글자색이 `--color-error`이다.

### Storybook (전 컴포넌트 공통)

- [x] AC27: 위 8개(Badge atom 1 + molecule 7) 각각에 `*.stories.tsx`가 있고,
      수용 기준마다 `play`가 있다. title은 `DesignSystem/Atoms/Badge`와
      `DesignSystem/Molecules/<Name>`.
- [x] AC28: `bun run --cwd apps/web test:storybook`이 전부 통과한다
      (`addon-a11y` 포함). 기존 atom 스토리 46개 + example 10개는 회귀 없이
      통과해야 한다.

### 파일럿 적용 — OfficeInfoFields (Badge `warning`)

청크 1이 contact로 LinkButton을 검증한 것과 같은 이유: 가장 작은 소비처 한 곳에
꽂아 atom API 결함을 일찍 찾는다. `tag` variant는 ReviewSection 안에만 있어
청크 3으로 미룬다.

- [x] AC29: `OfficeInfoFields`의 `lowConfidenceBadge` `<p>`가
      `<Badge variant="warning">`로 바뀐다. 문구
      `"위치 정보 정확도가 낮을 수 있어요"`는 그대로다.
- [x] AC30: `OfficeInfoFields.module.css`에서 `.lowConfidenceBadge` 규칙이
      제거된다.
- [x] AC31: 기존 `OfficeInfoFields.test.tsx` 5개가 **수정 없이** 통과한다
      (텍스트·표시 조건만 단정하고 태그 이름은 안 본다).

## 영향 범위

- **신규 파일**: `apps/web/design-system/components/` 아래
  `Badge/`·`RatingInput/`·`RatingDisplay/`·`TagChipGroup/`·`DealFieldSet/`·
  `PhotoUploader/`·`FormError/`, 각각 `.tsx` + `.module.css` + `.stories.tsx` +
  `index.ts`.
- **수정**: `OfficeInfoFields.tsx`·`OfficeInfoFields.module.css`(파일럿, AC29~31).
  `docs/design-system-atomic-plan.md` 상태 줄.
- **새 의존성**: 없음.
- **기존 기능 영향**: OfficeInfoFields 배지 마크업이 `<p>`→`<span>`으로 바뀌는
  것 외에 시각(색·문구)은 같다. 나머지 molecule은 아직 소비처가 없다. 기존
  유닛 테스트는 전부 무수정 통과해야 한다.

## 설계 메모

- **DealFieldSet가 도메인 옵션을 안 갖는 이유**: 전문성·하자대응 값은 `@repo/types`에
  있다. molecule이 그걸 import하면 "리뷰 작성 전용 컴포넌트"가 되어
  `apps/web/components/`에 두는 편이 맞다. 이번 작업의 목적은 청크 3에서 두
  organism이 **같은 마크업 소스**를 쓰게 하는 것이므로, 레이아웃+a11y만
  디자인시스템에 두고 옵션은 호출자가 넣는다.
- **PhotoUploader가 File/kept를 모르는 이유**: 두 목록을 molecule 안에 두면
  "기존 사진 삭제"와 "새 파일 삭제"가 분기되어 청크 1이 막으려던 복제가
  molecule 안으로 들어온다. `items`로 평평하게 받으면 청크 3에서
  `kept.map + newFiles.map`만 하면 된다.
- **삭제 버튼 라벨을 `사진 N 삭제`로 고정한 이유**: 현재 ReviewSection이 그
  형식이다. MyReviewItem은 `기존 사진 N 삭제`/`새 사진 N 삭제`로 갈라져 있다.
  molecule 기본을 ReviewSection 쪽에 맞추고, 청크 3에서 MyReviewItem이 더
  구체적인 alt를 item에 실어 구분이 필요하면 그때 `removeLabel` prop을 연다.
  이번 청크에서 prop을 미리 만들지 않는다(YAGNI).
- **파일럿을 OfficeInfoFields로 고른 이유**: Badge `warning`의 유일한 소비처이고
  테스트 5개가 텍스트 기준이라 마크업 교체에 안전하다. ReviewSection의
  `tagBadge`는 리스트 organism 안에 있어 청크 3 범위다.
- **RatingInput이 별 문자가 아닌 이유**: 현재 UI가 `1`~`5` 숫자 radio다. 별
  모양으로 "개선"하면 동작 변경이 되어 청크 3 테스트가 깨질 수 있다. 표시용
  별은 `RatingDisplay`가 맡는다.

## 열린 질문

없음 — 위 설계는 청크 1 결정(atom 재사용, 파일럿 1곳, organism 미교체)을 그대로
따른다. 구현 중 API가 스토리에서 막히면 이 명세를 개정하고 진행한다(청크 1
FieldRow `<dl>` 선례).

## 구현 순서 (Red → Green)

1. 8개 컴포넌트의 `*.stories.tsx`를 컴포넌트 없이 먼저 작성한다. `test:storybook`이
   import 실패로 Red인 것을 확인한다(청크 1과 동일).
2. Badge → FormError → RatingDisplay → RatingInput → TagChipGroup → DealFieldSet
   → PhotoUploader 순으로 구현한다. 의존: TagChipGroup←Chip, DealFieldSet←Select+Input,
   PhotoUploader←Button.
3. OfficeInfoFields 파일럿 교체. `OfficeInfoFields.test.tsx` 무수정 통과 확인.
4. `node .harness/gates/run-checks.mjs` 전체 통과. **띄워 둔 dev 서버의
   `apps/web/.next`를 게이트가 덮어쓴다** — 청크 1 task-log 환경 메모. 사용자가
   지도를 띄워 둔 세션이면 게이트 전에 알리고, 깨지면 재기동한다. `rm -rf .next`는
   그 서버를 확인하기 전에는 하지 않는다.
5. 계획 문서 상태를 "청크 2 완료"로 바꾸고 다음 액션을 청크 3 `/spec`으로 고친다.

## 실행 결과 (2026-08-28)

**Red → Green**

- 8개 컴포넌트 스토리를 컴포넌트 파일 없이 먼저 작성 → `test:storybook`이
  `Failed to resolve import "./Badge"` 등으로 Red. 기존 atom/example 스토리는
  vite 에러 오버레이의 스크롤 영역을 axe가 잡아 같이 실패(청크 1과 동일 패턴).
- 구현 후 **93개 전부 통과**(기존 56 + 신규 play 37). `OfficeInfoFields.test.tsx`
  5개 무수정 통과. 게이트 전체(typecheck → lint → stylelint → test-storybook →
  test 269 → build) 통과.
- lint에서 `import/order` 5건(빈 줄·`./css`가 형제 import보다 앞) — 컴포넌트가
  아니라 import 정렬만 고침.

**파일럿**

- `OfficeInfoFields` 낮은 신뢰도 배지가 `<p>` → `<Badge variant="warning">`.
  문구·표시 조건 동일. 실제 지도에서 낮은 신뢰도 사무소를 열어 보지는 않음
  (유닛 테스트가 문구를 단정).

## 청크 3이 이 산출물을 쓰는 방법 (미리 적어 두는 핸드오프)

organism 교체 때 대응:

- 별점 입력 블록 → `<RatingInput name={...} value={rating} onChange={setRating} />`
- 별점 표시 → `<RatingDisplay value={review.rating} />`
- 거래 6필드 → `<DealFieldSet values={...} onChange={...} *Options={...} />`
- 태그 선택 → `<TagChipGroup options={[...REVIEW_TAGS]} selected={selectedTags} onToggle={toggleTag} />`
- 사진 → items로 정규화한 `<PhotoUploader max={REVIEW_PHOTOS_MAX} accept={ALLOWED_PHOTO_TYPES.join(",")} />`
- 폼 에러 → `<FormError>{message}</FormError>`
- 태그 뱃지 → `<li><Badge variant="tag">{tag}</Badge></li>`
- `reportButton` 분류와 99개 테스트 무수정 통과는 청크 3 명세의 책임이다.
