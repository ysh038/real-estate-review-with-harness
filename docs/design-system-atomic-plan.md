# 계획: 청기와 기반 Atomic Design 전환 (atoms 후보 목록)

- 작성일: 2026-08-28
- 상태: **계획 (명세 이전 단계)** — 아직 `/spec`도 `/impl`도 시작하지 않았다
- 다음 액션: 아래 "결정 필요" 항목을 확정한 뒤 청크 1(atoms)부터 `/spec`

> 다른 PC에서 이어서 작업할 수 있도록 조사 결과를 근거까지 남긴 문서다.
> 목록만 보고 바로 만들지 말고 "결정 필요" 섹션을 먼저 읽을 것.

## 배경 — 왜 지금 하는가

`docs/specs/design-system-cheonggiwa-rebrand.md`로 청기와 토큰(56개)이 들어왔고
`ds-init`으로 Storybook도 설치됐다. 그런데 **실제 프로덕션 컴포넌트에는 스토리가
하나도 없고**(`design-system/examples/`의 온보딩 예제 3종뿐), 컴포넌트는 전부
Storybook 설치 이전에 `/ds-add` 워크플로를 타지 않고 직접 만들어졌다.

즉 `.cursor/rules/30-design-system.mdc`가 "먼저 확인하라"고 지시하는
`apps/web/design-system/components/` 디렉터리가 **아직 존재하지 않는다.**
이 작업은 새 구조를 발명하는 게 아니라 하네스가 처음부터 전제했던 빈칸을 채우는 것이다.

## 현재 상태 (2026-08-28 조사 실측)

| 항목 | 수치 |
|---|---|
| 청기와 토큰 | 56개 (color 13, space 9, font-size 7, radius 4, z-index 3, shadow 3 …) |
| 컴포넌트 TSX 총량 | 1,797줄 (최대: ReviewSection 617, MyReviewItem 412) |
| 컴포넌트 CSS 총량 | 1,154줄 (최대: ReviewSection 430, MyReviewItem 226) |
| 버튼 클래스 종류 | **25개 이상** (아래 참고 — 실제로는 5개 variant로 수렴) |
| ReviewSection ↔ MyReviewItem 중복 클래스 | **22개** |
| 영향권 테스트 | 99개 (ReviewSection 53, MyPageReviews 25, OfficeSearchBar 21) |
| 전체 web 테스트 | 264개 |

### 중복의 증거 — ReviewSection ↔ MyReviewItem 공유 클래스 22개

```
content, dealFields, dealSelect, formError, item, itemActions, itemHeader,
photoAddLabel, photoFileInput, photoPreviewImage, photoPreviewItem,
photoPreviewList, photoRemoveButton, photoSection, rating, ratingInput,
ratingLabel, tagChip, tagChipGroup, tagChipSelected, textarea, yearInput
```

리뷰 작성 폼이 통째로 복사돼 있다. 원인은
`docs/specs/review-edit-and-delete-ui.md`의 설계 메모 — 당시 "폼 로직 전체를 공유
컴포넌트로 추출하는 큰 리팩터보다 낫다"고 판단하고 미뤘고, 그 직후
`review-edit-photo-changes` 작업에서 사진 편집이 **양쪽에 각각** 구현됐다.

### 이미 발생한 드리프트 (이 리팩터가 실제로 고칠 문제)

`:focus-visible` 정의 개수:

```
ReviewSection      8
OfficeSearchBar    3
LoginButton        3
OfficeDetailPanel  1
MyReviewItem       0   ← ReviewSection과 클래스 22개를 공유하는데 0
PhotoLightbox      0   ← 키보드 내비게이션이 있는 모달인데 0
OfficeInfoFields   0
```

**같은 마크업을 복사해 놓고 접근성 개선은 한쪽에만 반영됐다.** atom으로 묶으면
구조적으로 재발할 수 없는 종류의 버그다.

## Atomic 계층 매핑 — 5계층 중 2계층만 신규

| Atomic 계층 | 이 저장소 |
|---|---|
| Atoms | **신규 필요** → `apps/web/design-system/components/` |
| Molecules | **신규 필요** → 같은 위치 |
| Organisms | 이미 있음 = 현재 `apps/web/components/` |
| Templates | `app/**/layout.tsx`가 담당 (신규 불필요) |
| Pages | `app/**/page.tsx`가 담당 (신규 불필요) |

교과서식 5계층 폴더를 새로 파는 게 아니라, **빠져 있는 하위 2계층만 채우고
기존 organisms가 그것을 쓰도록 교체**하는 작업이다.

---

## Atoms 후보 목록

우선순위는 "중복 제거 효과 × 사용처 수" 기준.

### A1. `Button` — 최우선

25개 이상의 버튼 클래스가 실측상 **5개 variant**로 수렴한다.

| variant | 스타일 시그니처 | 현재 이 이름들로 흩어져 있음 |
|---|---|---|
| `primary` | `bg: --color-primary` / `color: --color-text-inverse` | `submitButton`, `saveButton`, `sortButtonActive`, (contact `primaryButton`※) |
| `ghost` | `bg: transparent` / `color: --color-text-muted` | `loadMoreButton`×2, `cancelButton`, `deleteButton`, `helpfulButton`, `reportButton`, `sortButton`, `closeButton`(OfficeDetailPanel), `logoutButton`, `copyLinkButton`, `editButton` |
| `outline` | `bg: --color-background` / `color: --color-text` + border | `secondaryButton`(contact), `draftBannerButton` |
| `danger` | `color: --color-error` | `dangerButton`(settings) |
| `overlay` | `bg: --color-overlay-control` / `color: --color-text-inverse` | `closeButton`·`navButton`(PhotoLightbox) |

※ contact의 `primaryButton`만 `bg: --color-text`로 다르다 — 아래 "링크형 버튼" 참고.

추가로 필요한 상태: `disabled`(helpfulButton·reportButton·submitButton에 존재),
`aria-pressed`(helpfulButton·sortButton·tagChip이 토글로 사용).

#### 링크형 버튼 — atom API에 직접 영향 (조사로 확인됨)

`app/contact/page.tsx`의 `primaryButton`·`secondaryButton`은 **`<button>`이 아니라
`<a>`다**:

- `primaryButton` → `<a href="mailto:...">` (이메일 문의)
- `secondaryButton` → `<a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">`

둘 다 `text-decoration: none`으로 링크 티를 지우고 버튼처럼 보이게 한 것. 따라서
`Button` atom은 **`<button>`과 `<a>` 양쪽으로 렌더될 수 있어야 한다.** 설계 선택지:

- (a) 다형 `as` prop — `<Button as="a" href=...>`. 타입이 복잡해짐
- (b) `Button` / `LinkButton` 두 atom으로 분리. 단순하지만 스타일 중복 관리 필요
- (c) 스타일만 공유하는 방식 — `composes` 불가 제약 때문에 사실상 어려움

→ 청크 1 명세에서 확정할 것. **(b)를 권장** — 이 저장소가 `composes`를 못 쓰고
타입 안전성(`any` 금지)을 강하게 요구하므로 (a)의 다형 타입은 비용이 크다.

`primaryButton`의 `bg: --color-text`가 의도인지 드리프트인지는 여전히 미확인
(아래 "결정 필요" 3번).

**별도 atom으로 뺄지 검토**: `photoRemoveButton`(원형 아이콘 버튼,
`bg: --color-secondary`, ReviewSection·MyReviewItem 중복) →
`IconButton` 또는 `Button size="icon"`.

### A2. `Chip` (토글 칩) — 사용처 3곳, 패턴 완전 동일

- `tagChip` / `tagChipSelected` — ReviewSection, MyReviewItem (리뷰 태그 6종)
- `categoryChip` / `categoryChipSelected` — OfficeSearchBar (Places 카테고리 4종)

셋 다 "선택 시 `--color-primary` 배경 + inverse 글자, 미선택 시 배경/테두리"라는
같은 구조에 `aria-pressed`로 토글한다. 실질적으로 이미 같은 컴포넌트다.

### A3. `Select` — 중복 확정

`dealSelect`가 ReviewSection·MyReviewItem에 중복. 현재 사용처:
거래유형, 거래결과, 방문 월, 전문성, 하자 대응 = **한 폼에 5개**, 그게 두 컴포넌트에.

### A4. `TextArea` — 중복 확정

`textarea`가 ReviewSection·MyReviewItem에 중복.
(MyReviewItem 쪽에는 `:focus-visible`이 빠져 있음 — 위 드리프트 참고)

### A5. `Input` — 중복 확정, 두 종류

- `yearInput`(number, 폭 6em) — ReviewSection·MyReviewItem 중복
- `input`(text) — OfficeSearchBar, profile

`type` prop으로 하나의 atom에 흡수 가능한지, 아니면 `NumberInput`을 나눌지 검토.
OfficeSearchBar의 input은 `--font-size-input`(iOS 확대 방지 전용 토큰)을 쓰는
특수 케이스라 주의.

### A6. `Badge` — 사용처 2곳, 통합 여지

- `tagBadge` — ReviewSection (리뷰에 붙은 태그 표시, 읽기 전용)
- `lowConfidenceBadge` — OfficeInfoFields (낮은 신뢰도 경고)

Chip(토글 가능)과 Badge(읽기 전용)는 역할이 달라 **분리 유지 권장**.

### A7. `FieldRow` (label + value) — 사용처 3곳

`field` + `label` 조합이 OfficeInfoFields, profile, settings에 각각 존재.
정의 위치가 셋으로 흩어져 있어 통합 대상이나, atom인지 molecule인지 애매하다
(아래 "결정 필요" 2번).

### 검토했으나 atom에서 제외 권장

| 후보 | 제외 이유 |
|---|---|
| `Skeleton` | 이미 `components/Skeleton/`에 독립 존재. **위치만 이동**하면 됨 |
| `EmptyState` / `ErrorState` | 이미 독립 컴포넌트. atom보다는 molecule 성격 (메시지 + 레이아웃) |
| `title` / `content` 등 타이포 | 7곳에 `title`이 있으나 각자 크기가 달라 토큰만으로 충분. atom화 실익 낮음 |
| `card` | 3곳에 있으나 legal 페이지 전용 성격이 강함. molecule 단계에서 재검토 |

---

## Molecules 후보 (다음 청크 — 참고용)

atoms가 확정된 뒤에 진행. 여기서 22개 중복이 실제로 해소된다.

| molecule | 구성 | 대체 대상 |
|---|---|---|
| `RatingInput` | Radio×5 | `ratingInput`+`ratingLabel` (2곳 중복) |
| `RatingDisplay` | ★ 문자열 + `--color-rating` | `rating` (2곳 중복) |
| `TagChipGroup` | Chip×6 | `tagChipGroup` (2곳 중복) |
| `DealFieldSet` | Select×4 + NumberInput×1 | `dealFields` (2곳 중복) |
| `PhotoUploader` | 미리보기 + IconButton + file input | `photoSection` 일체 (2곳 중복, 사진 편집 기능 포함) |
| `FormError` | role=alert 문구 | `formError` (2곳 중복) |

---

## 제약 조건 (반드시 지킬 것)

1. **CSS Modules `composes` 사용 불가.** 이 저장소 stylelint에 CSS-Modules 인식
   설정이 없어 `composes`가 표준 CSS로 파싱되지 않는다(legal 페이지 작업 때 확인).
   → atom 조합은 className 문자열 연결 또는 variant prop으로만 한다.
2. **위치는 `apps/web/design-system/components/`.** `packages/ui`에는 CSS Modules
   전례가 없고(`VisuallyHidden`이 인라인 스타일뿐), 워크스페이스 패키지의
   `.module.css`를 Next 빌드가 처리해줄지 미검증이다. 또한 인라인 스타일로 만들면
   stylelint 색상 검사망을 통째로 피해가게 된다.
3. **색상 원시값 금지** — `tokens.css` 변수만. stylelint가 error 처리한다.
4. **스토리 필수** — `.cursor/rules/30-design-system.mdc`가 컴포넌트 추가 시
   `*.stories.tsx`(play 함수 포함)를 함께 요구한다. `main.ts`의 stories 글롭이
   `design-system/**`·`components/**` 둘 다 스캔하므로 위치는 문제없다.
5. **기존 99개 테스트가 그대로 통과해야 한다.** 이건 동작을 바꾸지 않는 리팩터다.
   테스트를 고쳐야 한다면 그건 리팩터가 아니라 동작 변경이므로 멈추고 재검토.

## 진행 순서 (청크 제안)

1. **청크 1 — atoms**: A1~A5 (+ 스토리). 가장 확실한 5개만. A6·A7은 결정 후.
2. **청크 2 — molecules**: 위 표 6종. 여기서 중복 22개 해소.
3. **청크 3 — ReviewSection·MyReviewItem 교체**: 진짜 리팩터. 99개 테스트가
   무수정 통과해야 함. 여기서 `:focus-visible` 드리프트가 자동 해소된다.
4. **청크 4 — 나머지 organisms**: OfficeSearchBar, PhotoLightbox, LoginButton,
   mypage 하위 페이지들.

각 청크마다 `/spec` → `/impl` → `/ship`. 청크 1을 명세할 때 atom API(variant 이름,
prop 형태)를 확정하면 이후가 규정되므로, **청크 1 명세에 가장 공을 들일 것.**

## 결정 필요 (착수 전 사용자 확인)

1. **variant 이름 체계** — 위 표의 `primary`/`ghost`/`outline`/`danger`/`overlay`는
   내가 실측 스타일에서 역산해 붙인 이름이지 확정이 아니다.
   **확인 완료: 청기와 명세에는 버튼 variant 정의가 없다** — 토큰만 교체했고
   컴포넌트 API는 건드리지 않았다. 즉 이 이름들은 이번에 새로 정하는 것이다.
2. **`FieldRow`(A7)를 atom으로 볼 것인가 molecule로 볼 것인가** — label+value 두
   요소의 조합이라 엄밀히는 molecule이지만, 실사용은 atom처럼 단순하다.
3. **contact 페이지 `primaryButton`의 `bg: --color-text`** — 다른 primary 버튼은
   전부 `--color-primary`인데 여기만 다르다. 의도된 디자인인지, 청기와 적용 때
   누락된 드리프트인지 확인 후 `primary`로 통합할지 결정.
   (참고: 청기와 명세의 "만질 파일" 목록에 `contact/page.module.css`가 없다 —
   토큰 교체 대상에서 빠졌을 가능성이 있어 **드리프트 쪽에 무게**를 둔다.)
4. **`photoRemoveButton`을 `IconButton` 별도 atom으로 뺄지, `Button size="icon"`으로
   흡수할지.**
5. **`Button` vs `LinkButton` 분리 여부** — 위 "링크형 버튼" 참고. (b) 분리 권장.

## 참고 문서

- `docs/specs/design-system-cheonggiwa-rebrand.md` — 청기와 토큰 정의·근거
- `.cursor/rules/30-design-system.mdc` — 토큰 강제·컴포넌트 선행 추가 규칙
- `.claude/skills/design-system/SKILL.md` — `/ds-init`·`/ds-add` 절차
- `apps/web/design-system/tokens.css` / `tokens.ts` — 토큰 정본
- `apps/web/design-system/examples/` — ds-init이 만든 스토리 작성 예시 3종
