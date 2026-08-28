# 명세: 나머지 organism을 atom으로 교체 (Atomic Design 청크 4, 마지막)

- 작성일: 2026-08-28
- 상태: 구현됨
- 선행: `docs/specs/design-system-atoms.md`(구현됨), `docs/specs/design-system-molecules.md`(구현됨),
  `docs/specs/design-system-review-organisms.md`(구현됨), `docs/design-system-atomic-plan.md`

## 목표

청크 1~3이 atom·molecule을 만들고 `ReviewSection`·`MyReviewItem`에 적용했지만,
나머지 organism — `OfficeSearchBar`·`PhotoLightbox`·`LoginButton`·`OfficeDetailPanel`·
`OfficeInfoFields`와 `mypage` 하위 3개 페이지 — 는 여전히 손대지 않은 상태다. 그중
`mypage/profile`·`mypage/settings`의 버튼은 **className이 아예 없는 완전 네이티브
`<button>`** 이다 — 사용자가 세션 초반 "UI가 너무 기본 브라우저 같다"고 지적한 원인의
상당 부분이 여기 있다고 보인다.

이번 청크는 atomic-plan의 마지막 청크다. 끝나면 `apps/web/design-system/components/`의
모든 atom·molecule이 실제 소비처를 최소 하나씩 갖게 되고, "버튼처럼 보이는 것은 전부
`Button`/`Chip`/`LinkButton` 중 하나"라는 규칙이 저장소 전체에 적용된다.

## 범위 밖

- **OfficeSearchBar 드롭다운 결과 목록**(`option`·`optionActive`·`sectionLabel`·
  `listbox`·`loadingState`) — 검색 결과 렌더링은 이 페이지 전용 로직이고 atomic-plan
  어디에도 후보로 없다.
- **`mypage/layout.tsx`의 탭 네비게이션**(`.tab`/`.tabActive`) — 버튼이 아니라 밑줄
  인디케이터가 있는 페이지 탭이다. `Button`/`LinkButton`은 둘 다 버튼 크롬(배경·테두리·
  패딩)을 그리는 컴포넌트라 이 자리에 쓰면 탭이 버튼처럼 보이게 돼 오히려 나빠진다.
  atomic-plan에도 후보로 언급된 적이 없다.
- **`mypage/reviews/page.module.css`의 안 쓰이는 `.status`/`.statusError`** — 코드를
  읽다 발견했다. `page.tsx`가 이 두 클래스를 참조하지 않는 죽은 CSS인데, 이번 청크가
  만든 문제가 아니고 손대는 파일도 아니라서 고치지 않는다. 언급만 해 둔다.
- **`EmptyState`·`ErrorState`·`Skeleton`** — 계속 범위 밖(atoms 명세부터 유지).
- **LoginButton의 "카카오 로그인"·"마이페이지" `<a>` 텍스트 링크** — 아래 "설계"에서
  이유를 설명한다. `LinkButton`으로 바꾸지 않는다.
- **mypage/settings의 회원탈퇴 확인 모달 자체(오버레이·다이얼로그 레이아웃)** — 모달
  컨테이너를 위한 atom은 이번 계획에 없다(`Modal` atom은 atomic-plan 후보 목록에
  없었다). 모달 *안의 버튼*만 바꾼다.
- **다크 모드·간격 토큰 강제** — 계속 범위 밖.

## 원본과의 관계 (통제변인)

청크 1~3과 동일 — 원본에는 atom/molecule 계층이 없어 이 리팩터는 실험 관측 대상이지
원본 복제가 아니다.

## 계획 문서 예측을 실측으로 고친 것

`docs/design-system-atomic-plan.md`의 A7(FieldRow) 항목은 "사용처 3곳(OfficeInfoFields·
profile·settings)"이라고 적었다. 이번 조사로 확인한 실제 상태:

| 예측 | 실제 |
|---|---|
| FieldRow 사용처 3곳 | **1곳**(OfficeInfoFields). `mypage/settings`엔애초에 `.value`를 그리는 필드가 없다 — "계정" 라벨 옆은 값 표시가 아니라 버튼 그룹(`actionRow`)이다. `mypage/profile`엔 `.field`+`.label`+`.value` 마크업이 있지만 `<dl>`로 안 감싸여 있고, 두 필드 중 하나(닉네임)는 FieldRow 모양이 아니다(아래 "열린 질문" 참고) |
| A2 Chip 후보에 `categoryChip`만 나열 | 실제로 꽂아 보니 Chip에 `className`이 없어 그대로는 못 쓴다(아래 "Chip 확장" 참고) |

## 설계

### 매핑 표

| 현재 | 교체 대상 | 근거 |
|---|---|---|
| `OfficeSearchBar` `.categoryChip`/`.categoryChipSelected` | `Chip`(+`className` 확장) | 청크 1 A2, "pill + aria-pressed = Chip" 규칙 |
| `OfficeSearchBar` `.input`(콤보박스) | `Input`(+`className`으로 플로팅 위젯 오버라이드) | 청크 1 A5 |
| `PhotoLightbox` `.closeButton` | `Button variant="overlay" size="icon"`(+`className`으로 40×40 오버라이드) | 청크 1 매핑표: overlay = PhotoLightbox의 close·nav |
| `PhotoLightbox` `.navButton`(prev/next) | `Button variant="overlay" size="icon"`(+`className`으로 44×44 오버라이드) | 위와 동일 |
| `OfficeDetailPanel` `.closeButton` | `Button variant="ghost"`(+`ref` 확장) | 청크 1 매핑표에 이미 명시 |
| `LoginButton` `.logoutButton` | `Button variant="ghost"` | 청크 1 매핑표에 이미 명시 |
| `OfficeInfoFields` 대표자명·전화번호 필드 | `FieldRow` | 손으로 만든 마크업이 FieldRow와 클래스명까지 동일 |
| `mypage/profile` 저장 버튼 | `Button variant="primary"` | |
| `mypage/profile` 취소·수정 버튼 | `Button variant="ghost"` | |
| `mypage/profile` 닉네임 입력 | `Input` | `onChange(value:string)`이 기존 `setDraftNickname`과 시그니처 일치 |
| `mypage/profile` 에러 문구 | `FormError` | 현재 `role="alert"`가 없다 — 도입하면서 자동으로 생김(접근성 개선) |
| `mypage/settings` 로그아웃·모달 취소 버튼 | `Button variant="ghost"` | |
| `mypage/settings` 회원탈퇴·탈퇴하기 버튼 | `Button variant="danger"` | 청크 1 매핑표에 이미 "danger: dangerButton(settings)"로 명시 |
| `mypage/settings` 에러 문구 | `FormError` | 역시 `role="alert"` 없었음 |
| `mypage/reviews/page.tsx` `.loadMoreButton` | `Button variant="ghost"` | `ReviewSection`(청크 3)과 완전히 같은 CSS — "ghost: loadMoreButton×2"의 두 번째 사례 |

### Chip 확장 — `className`

`OfficeSearchBar`의 카테고리 칩은 지도 위에 뜨는 플로팅 위젯이라 최소 터치 타깃
(`min-height:32px`)·굵은 글자·그림자(`box-shadow:shadow-sm`)가 필요하다. 이 값은
`ReviewSection`의 태그/정렬 칩에는 없던 이 위젯만의 스타일이라 `Chip` 기본 클래스에
넣을 수 없다(태그 칩 등 다른 소비처가 원치 않는 그림자를 갖게 된다).

```ts
export interface IChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;   // 신규 — 소비처별 오버라이드(min-height·padding·shadow 등)
}
```

`Button`이 이미 이 패턴(`[styles.button, VARIANT_CLASS[variant], SIZE_CLASS[size],
className].filter(Boolean).join(" ")`)을 쓰고 있다 — `Chip`도 동일하게 맞춘다.

### Button 확장 — `ref`

React 19라 `forwardRef`는 필요 없지만, `IButtonProps`가 `ButtonHTMLAttributes`만
확장하고 있어 `ref` 타입이 없고 컴포넌트도 `ref`를 명시적으로 꺼내 `<button>`에
붙이지 않는다. `OfficeDetailPanel`이 열릴 때 닫기 버튼에 포커스를 옮겨야 해서
(`closeButtonRef.current?.focus()`, 기존 동작 — AC9로 이미 테스트됨) `Button`이
`ref`를 받아야 한다.

```ts
export interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TButtonVariant;
  size?: TButtonSize;
  ref?: Ref<HTMLButtonElement>;   // 신규
}

export const Button = ({ variant = "primary", size = "md", type = "button", className, ref, ...props }: IButtonProps) => (
  <button ref={ref} type={type} className={...} {...props} />
);
```

### 크기 오버라이드 패턴 (PhotoLightbox) — 청크 3 선례 재사용

`PhotoLightbox`의 닫기(40×40)·이전/다음(44×44) 버튼은 `Button`의 4개 size(`sm`/`md`/
`lg`/`icon`) 어디에도 정확히 맞지 않는다. `size="icon"`(패딩 0·radius-full·작은
글자)을 기반으로 삼고, `PhotoLightbox.module.css`에 남기는 로컬 클래스로 `width`·
`height`·`font-size`·`position`만 오버라이드한다 — 청크 3 `PhotoUploader`의
`removeButton`(`Button size="icon"` + 로컬 `position` 오버라이드)과 같은 캐스케이드
순서(원자 CSS가 먼저 번들되고 이를 쓰는 쪽의 CSS Module이 나중에 로드돼 동률
specificity에서 이긴다)에 의존한다. 이미 청크 3 브라우저 검증에서 이 순서가
실제로 성립함을 확인했다(2026-08-28, `design-system-review-organisms.md` 실행 결과).

### OfficeInfoFields — 주소 필드는 왜 FieldRow로 안 바꾸는가

주소 필드는 값 하나(`office.address`) 외에 낮은 신뢰도 `Badge`가 조건부로 딸려
붙는다. `FieldRow`는 `label`+`value`만 받고 추가 콘텐츠를 위한 슬롯이 없다.
청크 3의 `removeLabel` 확장과 같은 기준 — "두 번째로 필요한 소비처가 생기기 전에는
슬롯을 만들지 않는다" — 을 적용해, 이번에도 슬롯을 새로 만들지 않고 주소 필드는
지금처럼 손으로 둔다. 대표자명·전화번호 두 필드만 `FieldRow`로 바꾼다.

FieldRow는 `value ? value : fallback`(truthy 체크, null/undefined 전용 아님)를
쓴다는 점은 청크 1부터 있던 특성이고 이번에 새로 생기는 리스크가 아니다 — 현재
테스트 데이터에 빈 문자열 케이스가 없어 안전하다.

### mypage/reviews — loadMoreButton

`ReviewSection`의 `loadMoreButton`(청크 3에서 이미 `Button variant="ghost"`로
교체)과 CSS가 한 글자도 다르지 않다(`padding:space-2` 사방 동일 vs `Button md`의
`space-2/space-4` 차이는 청크 3에서 이미 겪은 것과 같은 변화). 그대로 같은 패턴을
적용한다.

## 수용 기준

### Chip 확장

- [x] AC1: `Chip`이 `className`을 받으면 기본 클래스 뒤에 이어 붙는다(선택/미선택
      양쪽 다).
- [x] AC2: `className`을 안 넘기면 기존 동작과 동일하다(기존 스토리 회귀 없음).
- [x] AC3: `Chip.stories.tsx`에 `className`으로 커스텀 스타일(예: 다른 `min-height`)이
      실제로 적용되는지 확인하는 story+play 1개 추가. 구현 전에 이 스토리부터 추가해
      Red(커스텀 클래스가 안 붙어 있어 계산된 스타일이 기본값과 같음)를 확인한다.

### Button 확장

- [x] AC4: `Button`에 `ref`를 넘기면 그 ref가 실제 `<button>` DOM 노드를 가리킨다.
- [x] AC5: `Button.stories.tsx`에 `ref`로 받은 노드에 `.focus()`를 호출하면 그 버튼이
      포커스를 받는지 확인하는 story+play 1개 추가. 구현 전 Red(ref가 안 붙어
      `document.activeElement`가 그 버튼이 아님)를 확인한다.

### OfficeSearchBar

- [x] AC6: 카테고리 칩 4개가 `Chip`이다(`aria-pressed`·클릭 동작은 기존과 동일 —
      `OfficeSearchBar.test.tsx`의 "장소 카테고리 필터" describe 4개 무수정 통과).
- [x] AC7: 검색 입력이 `Input`이다. `role="combobox"`·`aria-expanded`·`aria-controls`·
      `aria-autocomplete`·`aria-activedescendant`·`onKeyDown`이 그대로 동작한다
      (`OfficeSearchBar.test.tsx`의 콤보박스 관련 테스트 무수정 통과).
- [x] AC8: `OfficeSearchBar.module.css`에서 `.categoryChip`/`.categoryChipSelected`의
      색상·테두리·radius·`:hover`·`:focus-visible`·선택 상태 규칙이 제거되고, 칩
      전용 크기(`min-height`·padding·box-shadow)만 남는다. `.input`도 마찬가지로
      색상·기본 padding·기본 radius·기본 `:focus-visible`이 제거되고 이 위젯 전용
      오버라이드만 남는다.

### PhotoLightbox

- [x] AC9: 닫기·이전·다음 버튼이 `Button variant="overlay" size="icon"`이다.
      `aria-label`·클릭·키보드(ArrowLeft/ArrowRight/Escape) 동작은 기존과 동일
      (`PhotoLightbox.test.tsx` 11개 무수정 통과).
- [x] AC10: `PhotoLightbox.module.css`에서 각 버튼의 색상·배경·radius·기본 크기
      규칙이 제거되고, 위치(`position`/`top`/`right`/`left`/`transform`)와 이
      위젯 전용 크기(40×40, 44×44, font-size)만 남는다.

### OfficeDetailPanel

- [x] AC11: 닫기 버튼이 `Button variant="ghost"`다. 마운트 시 포커스가 이 버튼으로
      이동한다(`OfficeDetailPanel.test.tsx` AC9 무수정 통과).
- [x] AC12: `OfficeDetailPanel.module.css`에서 `.closeButton`의 색상·배경·테두리·
      radius·`:hover`·`:focus-visible` 규칙이 제거된다.

### LoginButton

- [x] AC13: 로그아웃 버튼이 `Button variant="ghost"`다(`LoginButton.test.tsx` AC12
      무수정 통과).
- [x] AC14: `LoginButton.module.css`에서 `.logoutButton`의 색상·배경·테두리·
      `:hover`·`:focus-visible` 규칙이 제거된다. `.link`·`.myPageLink`(텍스트 링크)는
      그대로 둔다.

### OfficeInfoFields

- [x] AC15: 대표자명·전화번호 필드가 각각 `<FieldRow label=... value=...
      fallback="정보 없음" />`다. 주소 필드는 그대로 손으로 둔다(Badge 슬롯 문제).
- [x] AC16: `OfficeInfoFields.test.tsx` 5개 무수정 통과(`getAllByText("정보
      없음")).toHaveLength(2)` 포함).
- [x] AC17: `OfficeInfoFields.module.css`에서 FieldRow로 대체된 두 필드분의
      `.field`/`.label`/`.value` 규칙이 제거된다(주소 필드가 여전히 이 클래스들을
      쓰므로 완전 삭제는 아니고, 대체됐다고 죽는 규칙이 없는지만 확인 —
      실제로는 세 필드가 클래스를 공유해 규칙 자체는 안 없어질 수 있다. 이 경우
      "제거할 게 없음"도 유효한 결과로 인정한다).

### mypage/profile

- [x] AC18: 저장 버튼이 `Button variant="primary"`, 취소·수정 버튼이
      `Button variant="ghost"`다.
- [x] AC19: 닉네임 입력이 `Input`이다.
- [x] AC20: 빈 닉네임 저장 시 에러 문구가 `FormError`(`role="alert"`)로 보인다.
- [x] AC21: `MyPageProfile.test.tsx` 3개 무수정 통과.
- [x] AC22: `page.module.css`에서 대체된 버튼·입력·에러 규칙(구체적으로 버튼엔
      원래 스타일이 없었으므로 `.input`·`.error` 규칙)이 제거된다.

### mypage/settings

- [x] AC23: 로그아웃·모달 취소 버튼이 `Button variant="ghost"`, 회원탈퇴·탈퇴하기
      버튼이 `Button variant="danger"`다. 탈퇴 처리 중 `disabled`·문구 변경("처리
      중...")은 그대로 유지된다.
- [x] AC24: 두 에러 문구(탈퇴 실패)가 `FormError`로 보인다.
- [x] AC25: `MyPageSettingsPage.test.tsx` 6개 무수정 통과.
- [x] AC26: `page.module.css`에서 `.dangerButton`·`.error` 규칙이 제거된다.

### mypage/reviews

- [x] AC27: 더보기 버튼이 `Button variant="ghost"`다(`MyPageReviews.test.tsx` AC17
      무수정 통과).
- [x] AC28: `page.module.css`에서 `.loadMoreButton`(+`:hover`) 규칙이 제거된다.

### 회귀

- [x] AC29: 이번 청크가 손대는 8개 테스트 파일(LoginButton 3·OfficeDetailPanel 8·
      OfficeInfoFields 5·PhotoLightbox 11·OfficeSearchBar 21·MyPageProfile 3·
      MyPageSettings 6·MyPageReviews 25 = 82개)이 **한 글자도 수정하지 않고**
      통과한다.
- [x] AC30: `apps/web` 유닛 테스트 전체(청크 3 기준 269개)가 무수정 통과한다.
- [x] AC31: `bun run --cwd apps/web test:storybook`이 통과한다(청크 3 기준 94개 +
      이번 청크 신규 2개, 기존 스토리 회귀 없음).
- [x] AC32: `node .harness/gates/run-checks.mjs` 전체(typecheck → lint → stylelint →
      test-storybook → test → build) 통과.

## 영향 범위

- **수정**: `apps/web/design-system/components/Chip/Chip.tsx`·`Chip.stories.tsx`,
  `apps/web/design-system/components/Button/Button.tsx`·`Button.stories.tsx`,
  `apps/web/components/OfficeSearchBar/OfficeSearchBar.tsx`·`.module.css`,
  `apps/web/components/PhotoLightbox/PhotoLightbox.tsx`·`.module.css`,
  `apps/web/components/OfficeDetailPanel/OfficeDetailPanel.tsx`·`.module.css`,
  `apps/web/components/LoginButton/LoginButton.tsx`·`.module.css`,
  `apps/web/components/OfficeInfoFields/OfficeInfoFields.tsx`·`.module.css`,
  `apps/web/app/mypage/profile/page.tsx`·`.module.css`,
  `apps/web/app/mypage/settings/page.tsx`·`.module.css`,
  `apps/web/app/mypage/reviews/page.tsx`·`.module.css`.
- **새 의존성**: 없음.
- **기존 기능 영향**: 아래 "시각 변경"만 있고 그 외 동작 변화 없음.

### 시각 변경

1. `OfficeSearchBar` 카테고리 칩·검색 입력 — 색상/포커스 링이 `Chip`/`Input` 기본
   토큰으로 통일된다(현재도 같은 토큰을 손으로 넣고 있어 눈으로는 거의 차이 없음).
2. `PhotoLightbox` 버튼 — 로직·크기는 그대로, 클래스 출처만 바뀐다(시각 차이 없음
   목표).
3. `OfficeDetailPanel` 닫기 버튼 — padding이 `space-2/space-3`→`space-2/space-4`로
   커진다(청크 3에서 이미 여러 번 나온 ghost 표준화 패턴).
4. `LoginButton` 로그아웃 버튼 — 지금은 테두리 없는 텍스트 버튼인데 `ghost`는
   `1px solid border`가 있다 — **테두리가 새로 생긴다**(청크 1 매핑표가 이미 정한
   변경, 이번에 처음 실제로 반영).
5. `mypage/profile`·`mypage/settings`의 모든 버튼 — 지금은 브라우저 기본 버튼
   렌더링(OS·브라우저마다 다름)인데 디자인시스템 버튼으로 바뀐다. **이번 청크에서
   가장 크게 체감될 변화**이자 애초에 이 리팩터를 시작한 이유(사용자의 "기본
   브라우저 같다" 피드백)에 가장 직접적으로 대응하는 지점.

## 설계 메모

- **Chip·Button 확장을 별도 AC로 증명하는 이유**: 청크 3에서 `PhotoUploader`에
  `removeLabel`을 추가할 때도 스토리를 먼저 Red로 만들고 구현해 Green으로 바꾸는
  절차를 썼고, 그 결과 "새 prop이 실제로 동작하는지"를 organism에 꽂아보기 전에
  atom 단위에서 미리 검증할 수 있었다. 이번에도 같은 절차를 반복해 조합 단계에서
  atom 결함을 늦게 발견하는 상황을 막는다(청크 1 설계 메모와 같은 논리).
- **FieldRow를 주소 필드까지 억지로 맞추지 않는 이유**: 위 "OfficeInfoFields" 절
  참고. `children`/`slot` prop을 지금 추가하면 소비처가 하나뿐인 채로 API 표면만
  넓어진다.
- **LoginButton의 텍스트 링크를 LinkButton으로 안 바꾸는 이유**: `LinkButton`은
  청크 1에서 "버튼처럼 보이는 링크"(배경·테두리·패딩이 있는)를 위해 만들었다.
  "카카오 로그인"·"마이페이지"는 배경도 테두리도 없는 순수 텍스트 링크라
  `LinkButton`을 쓰면 오히려 새 버튼 크롬이 생겨 시각이 바뀐다 — `ReviewSection`의
  `loginPrompt`(청크 3에서도 같은 이유로 안 바꿈)와 동일한 판단이다.
- **mypage 두 페이지의 버튼이 지금까지 안 바뀐 이유(경위 확인용 메모)**: 청기와
  리브랜딩(토큰 교체)과 청크 1~3(atom 도입) 모두 "만질 파일" 목록에 이 두 페이지가
  없었다 — 각 작업이 스코프를 좁게 잡을 때마다 반복적으로 빠진 것으로 보인다.
  이번이 이 두 페이지를 실제로 만지는 첫 청크다.

## 열린 질문 (해결됨)

1. **`mypage/profile`의 "가입일" 필드를 `FieldRow`로 통일할 것인가?** → **사용자
   확정: 그대로 둔다.** `mypage/profile`은 이번 청크에서 버튼·입력·에러 문구만
   atom으로 바꾸고, "가입일" 필드와 "닉네임" 필드의 `<div>/<span>` 구조는 손대지
   않는다(AC18~22가 이 필드들의 마크업 변경을 요구하지 않는 이유). `mypage/profile`은
   `FieldRow`의 실제 소비처에서 빠지고, `FieldRow`는 이번 청크에서도 `OfficeInfoFields`
   1곳만 쓴다.

## 구현 순서 (Red → Green)

1. `Chip.stories.tsx`에 `className` 검증 story 추가 → Red 확인 → `Chip.tsx`에
   `className` 추가 → Green.
2. `Button.stories.tsx`에 `ref` 검증 story 추가 → Red 확인 → `Button.tsx`에 `ref`
   추가 → Green. 두 확장 모두 `bun run --cwd apps/web test:storybook`으로 기존
   스토리 회귀 없음 확인.
3. `OfficeDetailPanel`·`LoginButton`·`mypage/reviews`부터 교체(단순 버튼 스왑,
   리스크 낮음) — 매 파일 교체 직후 해당 테스트로 확인.
4. `OfficeInfoFields`(FieldRow) 교체 → 테스트 확인.
5. `mypage/profile`·`mypage/settings`(Button+Input+FormError 조합, 가장 많이
   바뀌는 두 파일) 교체 → 테스트 확인.
6. `OfficeSearchBar`(Chip+Input, 카테고리 필터 4개 테스트가 걸려 있어 마지막
   근처에) → `PhotoLightbox`(오버레이 크기 오버라이드, 시각 확인이 필요해 마지막)
   순으로 교체.
7. `node .harness/gates/run-checks.mjs` 전체 통과 확인.
8. Docker가 떠 있으면(청크 3에서 확인된 컨테이너 재사용) 실제 브라우저로 "시각
   변경" 5개, 특히 4번(로그아웃 버튼 테두리)·5번(mypage 버튼 전체)을 확인한다.
9. `docs/design-system-atomic-plan.md` 상태를 "청크 1~4 전부 완료"로 갱신 —
   atomic-plan 자체가 끝나는 마지막 항목이다.

## 실행 결과 (2026-08-28)

**Red → Green (atom 확장)**

- `Chip.stories.tsx`에 `CustomClassNameIsApplied` story 추가 → **typecheck에서
  Red 확인**(`className`이 `IChipProps`에 없다는 TS2353). `Button.stories.tsx`에
  `RefAttachesToButtonElement` story 추가 → 이쪽은 스토리 자체는 우연히 런타임에서
  통과했다(`Button`이 이미 `...props`를 `<button>`에 스프레드하고 있어서 `ref`가
  스프레드 객체 안에 있으면 호스트 엘리먼트가 그냥 인식한다) — 하지만
  **typecheck는 Red**였다(`<Button ref={ref}>`가 `IButtonProps`에 없는 프로퍼티).
  즉 이번 확장의 진짜 Red 신호는 storybook 테스트가 아니라 `tsc`였다 — 스토리
  테스트만으로는 타입 계약 위반을 못 잡는다는 걸 확인한 사례로 기록해 둔다.
- `Chip`에 `className?: string`, `Button`에 `ref?: Ref<HTMLButtonElement>` 추가 →
  **typecheck·storybook 둘 다 Green**(96개 = 기존 94 + 신규 2).

**organism 교체**

- 계획한 8개 파일(OfficeDetailPanel·LoginButton·mypage/reviews·OfficeInfoFields·
  mypage/profile·mypage/settings·OfficeSearchBar·PhotoLightbox)을 순서대로 교체.
  각 파일 교체 직후 해당 테스트를 돌려 **82개 전부 한 글자도 수정 없이 통과**
  (LoginButton 3·OfficeDetailPanel 8·OfficeInfoFields 5·PhotoLightbox 11·
  OfficeSearchBar 21·MyPageProfile 3·MyPageSettings 6·MyPageReviews 25).
- 구현 중 발견한 것 하나: `OfficeSearchBar`의 카테고리 칩 `:hover`를 로컬
  클래스로 이식할 때, 처음엔 선택/미선택 공통 `.categoryChip` 클래스에 그대로
  `:hover{background-color:surface}`를 옮겼더니 **선택된(칩 primary 배경) 칩의
  hover도 덮어버리는 회귀**가 될 뻔했다(Chip 내부의 `.selected` 클래스는 이
  모듈에서 이름을 모른다). `aria-pressed="false"` 속성 선택자로 미선택 상태만
  겨냥해 해결 — 테스트로는 안 잡히는 종류의 버그라 직접 코드를 다시 읽다가
  발견했다.

**회귀**

- `apps/web` 유닛 테스트: 36파일 **269개 그대로 통과**(AC30).
- `bun run --cwd apps/web test:storybook`: 17파일 **96개 통과**(AC31).
- `node .harness/gates/run-checks.mjs` 전체(typecheck → lint → stylelint →
  test-storybook → test → build) **통과**(AC32). lint·stylelint 둘 다 처음부터
  깨끗했다(청크 3 때와 달리 import 정렬 위반 없음).

**브라우저 검증 — 닿은 곳과 못 닿은 곳**

Docker(`harness-review-postgres`·`harness-review-minio`)가 청크 3 때부터 계속
떠 있어 재사용했다. 비로그인 상태에서 보이는 부분은 실제로 확인했다:

- `OfficeSearchBar` 카테고리 칩: `min-height:32px`, `box-shadow` 있음, `border-radius:
  9999px`(Chip pill) — 실측대로.
- `OfficeSearchBar` 검색 입력: `aria-label="사무소 검색"`(신규, 접근성 개선),
  `border-radius:4px`(`--radius-md`), `box-shadow` 있음 — 실측대로.
- `OfficeDetailPanel` 닫기 버튼: 검색으로 사무소를 선택해 패널을 실제로 띄운 뒤
  확인. `background:transparent`, `border:1px solid`, `border-radius:2px`
  (`--radius-sm`), `padding:8px 16px`(md 사이즈) — 예고한 시각 변경 3번과 일치.
  **`document.activeElement`가 이 버튼과 같음도 확인** — `Button`의 `ref` 확장이
  실제로 마운트 시 포커스 이동(AC11)을 살렸다는 직접 증거.
- `PhotoLightbox`: QA용 리뷰 1건 + 사진 2장을 SQL로 직접 넣어(확인 후 즉시 삭제)
  닫기·다음 버튼을 확인. 닫기 `40×40`, 다음 `44×44`, 둘 다 `border-radius:9999px`
  + 반투명 흰 배경(`--color-overlay-control`) + 흰 글자, `position:absolute`
  좌표도 원래 값 그대로 — 크기 오버라이드 캐스케이드가 예상대로 작동했다.
- 콘솔 에러 없음(`/api/me` 401 다수는 비로그인 상태의 정상 동작).

**여전히 확인 못 한 것**: 시각 변경 4번(`LoginButton` 로그아웃 버튼 — 로그인
상태에서만 보임)과 5번(`mypage/profile`·`mypage/settings` 전체 — 이번 청크에서
가장 크게 바뀐 곳)은 카카오 로그인이 필요하다. 세션 쿠키가 `httpOnly`라 브라우저
자동화 도구의 페이지 컨텍스트 JS로는 세팅할 수 없고(CDP 수준 쿠키 주입 같은 더
침습적인 방법은 이번 청크 범위를 넘어선다고 판단해 시도하지 않았다), 실제
카카오 계정으로 로그인하는 것도 사용자 자격증명이 필요해 내가 대신 할 수 없다.
`MyPageProfile.test.tsx`(3)·`MyPageSettings.test.tsx`(6)·`LoginButton.test.tsx`(3)가
마크업·상호작용을 role 기반으로 촘촘히 단정하고 있어 구조적 리스크는 낮다고
보지만, **"기본 브라우저 버튼이 실제로 디자인시스템 버튼처럼 보이는지"는 사용자가
로그인해서 직접 확인해야 한다.**

## atomic-plan 완료

이 청크로 `docs/design-system-atomic-plan.md`의 4개 청크가 전부 끝났다. 청크
1(atoms 7종)·2(molecules 7종+Badge)·3(ReviewSection·MyReviewItem 리팩터)·4(나머지
organism)를 거쳐, `apps/web/design-system/components/`의 모든 atom·molecule이
실제 소비처를 최소 하나씩 갖는다. 남은 CSS 원시값·`any` 타입 등은 이 계획의
스코프 밖이며, 발견된 것은 각 명세의 "범위 밖"에 이유와 함께 기록해 뒀다.
