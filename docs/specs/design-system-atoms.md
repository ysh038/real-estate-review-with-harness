# 명세: 디자인시스템 atoms (Atomic Design 청크 1)

- 작성일: 2026-08-28
- 상태: 구현됨

## 목표

`docs/design-system-atomic-plan.md`의 청크 1. 지금 이 저장소에는 버튼 클래스가
**25개 이상** 흩어져 있고 그중 실제 스타일은 5가지로 수렴한다. `ReviewSection`과
`MyReviewItem`은 CSS 클래스 **22개를 중복 정의**하고 있는데, 그 결과
`ReviewSection`에는 `:focus-visible`이 8개인 반면 **같은 마크업을 복사해 간
`MyReviewItem`에는 0개**다 — 접근성 개선이 한쪽에만 반영된 드리프트가 이미 발생했다.

`apps/web/design-system/components/`(하네스 규칙 `30-design-system`이 "먼저
확인하라"고 지시하지만 아직 존재하지 않는 디렉터리)에 원자 컴포넌트를 만들고,
각각 Storybook 스토리로 상태·접근성을 고정한다. 이번 청크는 **atom을 만들고 스토리로
증명하는 것**까지이며, 큰 organism(`ReviewSection`·`MyReviewItem`) 교체는 청크 3이다.

## 범위 밖

- **`ReviewSection`·`MyReviewItem` 교체** — 청크 3. 이번에 atom을 만들되 이 두
  파일은 손대지 않는다(합쳐 1,029줄 + CSS 656줄, 테스트 78개가 걸려 있어 별도 청크).
- **molecules** — `RatingInput`·`TagChipGroup`·`DealFieldSet`·`PhotoUploader` 등은
  청크 2. 이번엔 그것들이 쓸 원자만 만든다.
- **`Badge` atom** — Chip(토글)과 역할이 다르다는 것만 확정했고 사용처가 2곳뿐이라
  청크 2로 미룬다(계획 문서 결정 참고).
- **`OfficeSearchBar`·`PhotoLightbox`·`LoginButton`·mypage 페이지 교체** — 청크 4.
- **`Skeleton`·`EmptyState`·`ErrorState` 이동** — 이미 독립 컴포넌트로 잘 동작하고
  있어 이번에 위치만 옮기면 import 경로만 흔들고 얻는 게 없다. 청크 2에서 molecule
  성격으로 재분류할 때 함께 다룬다.
- **다크 모드·간격 토큰 강제** — 청기와 명세가 이미 범위 밖으로 둔 것을 유지한다.

## 원본과의 관계 (통제변인)

원본(`real-estate-agent-review`)에는 디자인시스템·Storybook·atom 계층이 **없다**
(인라인 스타일 + 임의 색상값, 드리프트 254건이 실험 베이스라인). 즉 이 작업은
참조할 원본 인터페이스가 존재하지 않는, 하네스 쪽에서만 나온 산출물이다 —
`docs/decisions.md` #9 통제변인 원칙의 적용 대상이 아니라 **실험의 관측 대상**이다.
`docs/experiment.md`에 지표로 남길 가치가 있다(이번 명세 범위 밖, 기록만).

## 설계: variant / size 축

실측 결과 현재 버튼들은 색상뿐 아니라 **크기와 모양(pill vs 각진)도 제각각**이라,
atom이 정규화 기준을 정해야 한다. 아래가 그 기준이며, 채택 시 일부 지점의 픽셀이
바뀐다(AC로 명시).

### Button variant (5종)

| variant | 배경 / 글자 | 흡수 대상 |
|---|---|---|
| `primary` | `--color-primary` / `--color-text-inverse`, hover `--color-primary-hover` | submitButton, saveButton |
| `ghost` | `transparent` / `--color-text-muted`, `1px solid --color-border` | loadMoreButton×2, cancelButton, deleteButton, editButton, copyLinkButton, closeButton(OfficeDetailPanel), logoutButton |
| `outline` | `--color-background` / `--color-text`, `1px solid --color-border-strong` | draftBannerButton |
| `danger` | `transparent` / `--color-error` | dangerButton(settings) |
| `overlay` | `--color-overlay-control` / `--color-text-inverse` | closeButton·navButton(PhotoLightbox) |

### Button size (3종)

| size | padding | font-size | 비고 |
|---|---|---|---|
| `sm` | `--space-1` `--space-2` | `--font-size-sm` | 카드 안 보조 액션 |
| `md`(기본) | `--space-2` `--space-4` | `--font-size-sm` | 일반 액션 |
| `lg` | `--space-3` `--space-5` | `--font-size-base` | `min-height: 44px` (터치 타깃) |
| `icon` | — | — | 18×18, `--radius-full`, 아이콘 1자 (photoRemoveButton) |

`radius`는 `--radius-sm` 고정(`icon`만 `--radius-full`). 지금 `--radius-md`인
contact 버튼과 `--radius-full`인 pill 버튼들은 아래 규칙으로 정리된다.

### "pill + `aria-pressed` = Chip" 규칙 (중요)

실측: `aria-pressed`를 쓰는 곳이 정확히 5개이고 **전부 `--radius-full`(pill)** 이다.

```
tagChip        ReviewSection    aria-pressed={selectedTags.includes(tag)}
tagChip        MyReviewItem     aria-pressed={selectedTags.includes(tag)}
sortButton     ReviewSection    aria-pressed={sort === option.value}
helpfulButton  ReviewSection    aria-pressed={review.isHelpful === true}
categoryChip   OfficeSearchBar  aria-pressed={isSelected}
```

따라서 **pill 모양 토글은 Button이 아니라 Chip이 흡수한다.** `sortButton`·
`helpfulButton`은 이름만 Button이지 실제로는 `tagChip`과 같은 컴포넌트다.
Button은 pill variant를 갖지 않는다(`icon` 제외).

예외: `reportButton`은 pill이지만 `aria-pressed`가 없다(신고 후 `disabled`가 되는
일반 액션) → 아래 "열린 질문" 1번.

## 수용 기준

### Button (A1)

- [x] AC1: `Button`이 `variant`(`primary`|`ghost`|`outline`|`danger`|`overlay`,
      기본 `primary`)와 `size`(`sm`|`md`|`lg`|`icon`, 기본 `md`)를 prop으로 받고,
      각 조합이 서로 다른 클래스를 적용한다.
- [x] AC2: `disabled`를 넘기면 실제 `<button disabled>`가 되고 클릭 핸들러가
      호출되지 않는다.
- [x] AC3: 모든 variant가 `:focus-visible`에서 `2px solid var(--color-focus)`
      아웃라인을 갖는다 — 현재 `MyReviewItem`·`PhotoLightbox`에 빠져 있는 드리프트를
      atom 차원에서 구조적으로 막는다.
- [x] AC4: `size="lg"`는 `min-height: 44px`를 갖는다(터치 타깃).
- [x] AC5: `type`을 넘기지 않으면 `type="button"`이다 — 폼 안에서 의도치 않게
      submit되지 않아야 한다(현재 코드가 매번 손으로 `type="button"`을 쓰고 있다).
- [x] AC6: CSS에 색상 원시값(`#hex`·`rgb()`)이 없다 — 토큰만 쓴다(stylelint가 강제).

### LinkButton (A1-b)

- [x] AC7: `LinkButton`이 `<a href>`로 렌더되고 `Button`과 같은 `variant`·`size`
      prop을 받으며 시각적으로 동일하다.
- [x] AC8: `external`을 넘기면 `target="_blank"`와 `rel="noopener noreferrer"`가
      함께 붙는다(둘 중 하나만 붙는 실수를 막는다).
- [x] AC9: `LinkButton`에는 `disabled` prop이 없다 — `<a>`는 disabled를 지원하지
      않으므로 타입 수준에서 막는다.

### Chip (A2)

- [x] AC10: `Chip`이 `selected`(boolean)와 `onToggle`을 받고, `aria-pressed`가
      `selected` 값과 일치한다.
- [x] AC11: `selected`가 true면 `--color-primary` 배경 + `--color-text-inverse`
      글자, false면 배경/테두리 형태가 된다.
- [x] AC12: 모양이 `--radius-full`(pill)이다.
- [x] AC13: 클릭하면 `onToggle`이 정확히 1회 호출된다.

### Select / TextArea / Input (A3·A4·A5)

- [x] AC14: `Select`가 `label`(aria-label용)·`value`·`onChange`·options를 받고,
      "선택 안 함"에 해당하는 빈 문자열 옵션을 `placeholder` prop으로 받아 첫 항목에
      렌더한다.
- [x] AC15: `TextArea`가 `value`·`onChange`를 받고 `resize: vertical`·최소 높이를
      갖는다.
- [x] AC16: `Input`이 `type`(`text`|`number`)을 받고, `type="number"`일 때
      `yearInput`과 같은 좁은 폭(6em)을 쓰는 `width` variant를 지원한다.
- [x] AC17: 셋 다 `:focus-visible`에서 `--color-focus` 아웃라인을 갖는다.
- [x] AC18: 셋 다 `font-size`가 16px 미만이 되지 않는 옵션을 갖는다 — iOS Safari
      포커스 시 확대 방지(`--font-size-input` 토큰이 이 목적으로 이미 존재).

### FieldRow (A7)

- [x] AC19: `FieldRow`가 `label`과 children(값)을 받아 라벨 + 값 한 줄을 렌더한다.
- [x] AC20: 값이 비어 있으면(`null`/`undefined`/빈 문자열) `fallback` prop 문구를
      대신 보여준다(현재 `OfficeInfoFields`의 "정보 없음" 패턴).

### Storybook (전 컴포넌트 공통)

- [x] AC21: 위 7개 atom 각각에 `*.stories.tsx`가 있고, Button은 5개 variant ×
      주요 size 조합을 스토리로 보여준다.
- [x] AC22: 각 스토리가 `play` 함수로 키보드 접근(focus)과 상호작용(클릭/토글)을
      검증한다(기존 `ExampleForm.stories.tsx`와 같은 형식).
- [x] AC23: `bun run --cwd apps/web test:storybook`이 전부 통과한다 —
      `addon-a11y`가 붙어 있으므로 접근성 위반도 여기서 걸린다.

### 파일럿 적용 — contact 페이지 (결정 3번)

atom이 실제로 쓰이는지 증명하기 위해 가장 작은 소비처 한 곳만 이번에 교체한다.

- [x] AC24: `app/contact/page.tsx`의 `<a className={styles.primaryButton}>`가
      `<LinkButton variant="primary">`로, `secondaryButton`이
      `<LinkButton variant="ghost" external>`로 바뀐다.
- [x] AC25: 그 결과 이메일 버튼 배경이 `--color-text`에서 `--color-primary`로
      바뀐다 — 청기와 리브랜딩 때 이 파일이 누락돼 생긴 드리프트를 해소하는 것이며,
      **이번 청크에서 화면 색이 실제로 바뀌는 유일한 지점**이다.
- [x] AC26: 기존 `ContactPage.test.tsx`가 수정 없이 통과한다(링크 href·라벨·
      `rel` 속성이 그대로이므로).
- [x] AC27: `contact/page.module.css`에서 `primaryButton`·`secondaryButton`
      규칙이 제거된다(죽은 CSS를 남기지 않는다).

## 영향 범위

- **신규 파일**: `apps/web/design-system/components/` 아래
  `Button/`·`LinkButton/`·`Chip/`·`Select/`·`TextArea/`·`Input/`·`FieldRow/`,
  각각 `.tsx` + `.module.css` + `.stories.tsx` + `index.ts`.
- **수정**: `app/contact/page.tsx`, `app/contact/page.module.css`(파일럿, AC24~27).
- **새 의존성**: 없음.
- **기존 기능 영향**: contact 페이지 버튼 색 1건(AC25)을 제외하면 없다 —
  나머지 atom은 아직 아무도 쓰지 않는 신규 파일이다. 기존 264개 테스트는
  전부 무수정 통과해야 한다.

## 설계 메모

- **`composes` 금지 → variant는 prop + className 연결**: 이 저장소 stylelint에
  CSS-Modules 인식 설정이 없어 `composes`가 표준 CSS로 파싱되지 않는다(legal
  페이지 작업에서 확인). 따라서 `.button` 기본 클래스 + `.variantPrimary` 등을
  `` `${styles.button} ${styles[variantClass]}` `` 로 합친다 — 이 저장소가 이미
  `tagChipSelected`·`sortButtonActive`에서 쓰고 있는 패턴과 동일하다.
- **`Button`/`LinkButton` 분리 이유**: 다형 `as` prop은 `any` 금지 규칙 아래에서
  타입이 복잡해진다. `<a>`는 `disabled`가 없고 `type`도 없으며 `external`이
  필요해 prop 집합 자체가 다르므로, 분리가 오히려 타입을 정확하게 만든다
  (계획 문서 결정 5번).
- **`icon` size를 별도 atom(`IconButton`)으로 빼지 않는 이유**: 사용처가
  `photoRemoveButton` 1종뿐이다(두 곳에 중복). 컴포넌트를 늘리기보다 size 축의
  한 값으로 두고, 세 번째 사용처가 생기면 그때 분리를 재고한다(결정 4번).
  단 `photoRemoveButton`의 `position: absolute`·`top/right: -6px`는 **레이아웃이지
  버튼의 속성이 아니므로 atom에 넣지 않는다** — 감싸는 쪽(청크 2 `PhotoUploader`)이
  positioning을 맡는다.
- **Chip이 `sortButton`·`helpfulButton`을 흡수하는 근거**: 위 "pill + aria-pressed"
  실측. 이름이 Button이라는 이유로 Button atom에 넣으면, 같은 역할·같은 모양의
  컴포넌트가 두 atom으로 갈라진다.
- **`FieldRow`를 atom으로 두는 이유**: 엄밀히는 label+value 조합이라 molecule이지만
  실사용이 단순하고 3곳(OfficeInfoFields·profile·settings)에 흩어져 있어 먼저
  통합하는 실익이 크다(결정 2번).
- **파일럿을 contact로 고른 이유**: 버튼이 2개뿐이고 정적 페이지라 리스크가 가장
  낮으면서, 하필 `LinkButton`(`<a>` 기반)이라는 새 atom을 실제로 검증해준다.
  큰 organism으로 바로 들어가면 atom API 결함을 늦게 발견하게 된다.

## 열린 질문

1. **`reportButton`을 Button `ghost`로 볼 것인가, Chip으로 볼 것인가** — pill
   모양이지만 `aria-pressed`가 없고 신고 후 `disabled`가 되는 일반 액션이다.
   "pill=Chip" 규칙을 따르면 Chip이지만 토글이 아니다. **이번 청크에서는 결정하지
   않아도 된다**(둘 다 청크 3에서 교체되는 대상). 청크 3 명세에서 확정한다.

## 실행 결과 (2026-08-28)

**Red → Green**

- 7개 atom의 `.stories.tsx`를 컴포넌트 파일 없이 먼저 작성 → `bun run --cwd
  apps/web test:storybook`으로 **17개 파일 전부 "Failed to resolve import"로
  Red 확인**(구체적 원인: 컴포넌트 자체가 없음 — 실패 사유가 모호하지 않음).
  이때 기존 example 스토리 3종(10개 테스트)도 덩달아 실패했는데, 원인은 내
  코드가 아니라 깨진 import가 Storybook 공유 dev 서버의 vite 에러 오버레이를
  띄웠고 axe가 그 오버레이 자체의 스크롤 영역을 접근성 위반으로 잡은 것이었다
  — 7개 atom을 구현하자마자 예상대로 다시 통과해 이 가설을 확인했다.
- 7개 atom(Button·LinkButton·Chip·Select·TextArea·Input·FieldRow) 구현 후
  재실행 → **56개 중 49개 통과, 7개 실패**. 실패 원인을 나눠보면:
  - **진짜 버그 1건**: `FieldRow`를 스토리에서 단독 렌더하면 axe가 "dt/dd는
    dl 안에 있어야 한다"고 잡았다. 설계 메모에 "감싸는 `<dl>`은 쓰는 쪽 책임"
    이라고 적었는데, 격리된 스토리 프리뷰에는 그 전제(호출자의 `<dl>`)가 없어
    실제로 깨진 상태였다. 컴포넌트 자체는 정확했고, 스토리에
    `decorators: [(Story) => <dl>{Story()}</dl>]`를 추가해 실사용과 같은
    맥락을 재현하는 것으로 해결 — 컴포넌트를 고치지 않았다.
  - **테스트 작성 실수 2건** (둘 다 `Input.stories.tsx`): (1)
    `getComputedStyle(input).width`를 문자열 `"6em"`과 비교했는데, 브라우저의
    computed style은 항상 계산된 px 값을 돌려준다 — `"96px"`로 수정.
    (2) `KeyboardFocusable` 스토리가 `type: "number"`를 안 넘겨 기본값(text)이
    적용돼 `role="spinbutton"`을 못 찾았다 — args에 명시적으로 추가.
  - 세 지점 모두 수정 후 **56개 전부 Green**(신규 atom 스토리 46개 + 기존
    example 스토리 10개).
- `SelectedAndUnselectedHaveDistinctClasses`(Chip) 스토리가 typecheck에서
  `args` 프로퍼티 누락으로 실패 — CSF3 타입이 `selected`(필수 prop)를
  `render`로 우회했다고 `args` 요구를 면제해주지 않았다. `args: { selected:
  false }`를 명시해 해결(값 자체는 `render`가 무시하지만 타입 요구를 채움).

**전체 회귀 확인**

- `apps/web` 유닛 테스트: 36 파일 269개 통과(기존 264 그대로, `ContactPage.test.tsx`
  포함 — AC26대로 무수정 통과).
- `bun run --cwd apps/web test:storybook`: 10 파일 56개 전부 통과.
- `node .harness/gates/run-checks.mjs` 전체(typecheck → lint → stylelint →
  test-storybook → test → build) 통과. 중간에 `TextArea`의 타입 별칭이
  `ITextAreaProps`였던 것을 `@typescript-eslint/naming-convention`이
  잡았다 — `interface`는 `I` 접두, `type` 별칭은 `T` 접두라는 이 저장소 규칙을
  따라 `TTextAreaProps`로 수정(다른 6개는 전부 `interface`라 문제없었다).

**실제 브라우저 검증 — 사고와 복구**

- `/contact`를 실제로 열어 AC24·25(색상 변경)·AC24(GitHub 링크 `external`이
  `target=_blank`+`rel=noopener noreferrer` 둘 다 설정)를 확인하려던 중,
  직전에 게이트를 돌리며 습관적으로 실행한 `rm -rf apps/web/.next`가 **사용자가
  이어서 보려고 띄워둔 채로 있던 dev 서버**의 `.next/static/development/`를
  런타임에 지워버려 그 서버가 `Internal Server Error`로 죽었다. 서버를 재기동해
  복구했다 — API 서버(8788)는 영향 없이 그대로 살아 있었다.
  - **교훈**: 검증용으로 내가 새로 띄운 서버가 아니라 **사용자가 계속 띄워두라고
    명시적으로 요청한 서버**가 있을 때는, 그 서버가 쓰는 빌드 산출물을
    `rm -rf`하기 전에 먼저 그 서버가 지금 살아 있는지·내가 건드리는 대상인지
    확인해야 한다. `docs/decisions.md`에 별도 항목으로 남길지는 사용자 판단에
    맡긴다.
- 복구 후 재확인: "이메일로 문의 보내기" 배경이 검정→청록으로 바뀜(AC25),
  `mailto:` href 유지, GitHub Issues 링크의 `target="_blank"`·
  `rel="noopener noreferrer"` 둘 다 실제 DOM에서 확인, 콘솔에 새 에러 없음
  (남아있던 500 로그는 복구 전 크래시의 잔존 항목으로 확인).
