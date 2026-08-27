# 명세: "청기와" 디자인시스템 적용

- 작성일: 2026-08-28
- 상태: 구현됨

## 목표

`design-system` 스킬로 Storybook을 설치한 뒤(ds-init), 색상 토큰이 create-harness
스캐폴딩 기본값(인디고 `#4f46e5`) 그대로였던 것을 UX 감사 리포트("레이어 충돌
리포트")의 Low 항목으로 남겨뒀다. 이번엔 Claude Design(claude.ai/design)에서
이 저장소를 실제로 읽고 만든 "청기와"(짙은 청록 + 황동) 팔레트를 가져와 적용한다.
동시에 그 감사 리포트에 남아 있던 마지막 두 항목(카카오 Places 카테고리 필터,
문의 페이지 이메일 노출)도 Claude Design이 함께 제안한 해결책으로 마무리한다.

## 범위 밖

- **레이아웃 재설계(원본 시안 A/B)** — Claude Design 프로젝트에는 청기와 외에
  "잉크 & 클레이"·"송림" 시안도 있었는데, 그 둘은 검색 리스트+사이드 패널 같은
  레이아웃 자체가 다른 시안이라 이번엔 청기와(토큰 교체 + 기존 레이아웃 유지)만
  적용한다.
- **다크 모드** — tokens.css는 라이트 모드만 정의한다(원본 스캐폴딩과 동일한
  범위).
- **간격(`--space-*`) 강제 stylelint 규칙 도입** — 토큰 종류는 늘었지만
  `stylelint.config.js`의 "간격은 아직 강제 안 함" 방침은 유지한다.

## 수용 기준

**토큰 (`design-system/tokens.css`, `tokens.ts`)**

- [x] AC1: `--color-success`·`--color-warning`·`--color-error`·`--color-info`
      전부 WCAG AA(작은 글씨 4.5:1) 기준을 만족하는 최소 한 가지 글자색(흰 글자
      또는 진한 글자)을 갖는다 — Storybook addon-a11y로 실측 확인.
- [x] AC2: 별점 전용 토큰 `--color-rating`이 추가되어 `--color-warning`을
      배지 배경이 아닌 글자색으로 재사용하던 기존 저대비(2.2:1) 지점을 전부
      대체한다.
- [x] AC3: z-index가 원시값이 아니라 `--z-map-overlay`·`--z-header-widget`·
      `--z-panel`·`--z-modal`·`--z-lightbox` 토큰으로 관리된다.
- [x] AC4: 본문 폰트가 Pretendard Variable로 바뀌고, 로드 실패 시 기존 시스템
      한글 폰트로 자연스럽게 대체된다(폴백 스택 유지).

**디자인시스템 예제 (Storybook, ds-init에서 만든 3종)**

- [x] AC5: `ExampleForm`·`ExampleTable`·`ExampleDetail` 스토리가 새 토큰으로도
      addon-a11y를 그대로 통과한다(변경 전 통과 상태 유지).
- [x] AC6: `info` 톤 배지를 더 이상 렌더 제외하지 않고 예제에 다시 포함한다
      (구 `--color-info`의 AA 미달이 해소됐다는 것을 예제 자체로 증명).

**실 컴포넌트 반영**

- [x] AC7: `OfficeDetailPanel`이 열려 있는 동안 로그인 위젯·검색바가 그 위로
      클릭을 가로채지 않는다(패널 z-index를 `--z-panel` 토큰으로 유지 —
      review-edit-photo-changes 이후 UX 감사에서 고친 값을 그대로 이름만
      토큰화).
- [x] AC8: 리뷰 별점(`ReviewSection`·`MyReviewItem`)과 낮은 신뢰도 배지
      (`OfficeInfoFields`)가 `--color-rating`을 쓴다.

**카카오 Places 카테고리 필터 (감사 Medium 항목 마무리)**

- [x] AC9: 검색창 아래에 카테고리 칩 4개(중개업소·지하철역·학교·은행,
      `category_group_code` 실값 AG2/SW8/SC4/BK9)가 항상 보인다.
- [x] AC10: 칩을 누르면 선택되고(`aria-pressed`) `useKakaoPlacesSearch`가
      `keywordSearch`의 3번째 인자로 그 카테고리 코드를 넘긴다. 카테고리가
      없으면(기본 상태) 3번째 인자를 아예 생략해 기존 호출 형태와 호환된다.
- [x] AC11: 같은 칩을 다시 누르면 해제된다. 다른 칩을 누르면 이전 선택은
      해제되고 새 칩만 선택된다(단일 선택).
- [x] AC12: 실 브라우저에서 "중개업소" 칩을 선택하면 아파트 단지·학원 등
      무관한 장소가 사라지고 실제 중개업소만 남는다.

**문의 페이지 이메일 노출 제거 (감사 Low 항목 마무리)**

- [x] AC13: 이메일 주소 문자열이 화면·DOM 텍스트에 노출되지 않는다(버튼
      라벨이 "이메일로 문의 보내기"로 바뀜). `mailto:` 링크 자체(실제 동작)는
      그대로 유지된다.

## 영향 범위

- **토큰**: `apps/web/design-system/tokens.css`, `tokens.ts` 전체 교체.
  `apps/web/app/globals.css`에 Pretendard `@import` + body 기본 스타일 추가.
- **디자인시스템 예제**: `design-system/examples/ExampleTable|ExampleDetail`의
  배지 색 규칙 교체 + info 톤 스토리 복원.
- **실 컴포넌트 CSS**: `OfficeSearchBar.module.css`(전체 교체 — 카테고리 필터
  칩 스타일 포함), `OfficeDetailPanel.module.css`(전체 교체), `LoginButton.module.css`
  (전체 교체), `ReviewSection.module.css`(규칙 다수 병합 — 레이아웃은 유지하고
  색상·타이포·포커스 링만 교체), `MyReviewItem.module.css`·`OfficeInfoFields.module.css`
  (`.rating`/`.lowConfidenceBadge` 글자색), `KakaoMap.module.css`(트렁케이션
  배너 z-index + 위치), `mypage/settings/page.module.css`·`PhotoLightbox.module.css`
  (z-index 토큰화).
- **신규 기능**: `types/kakao.d.ts`(`keywordSearch` 3번째 옵션 인자),
  `hooks/useKakaoPlacesSearch.ts`(`PLACE_CATEGORIES`, `TPlaceCategoryCode`,
  `categoryCode` 파라미터), `components/OfficeSearchBar/OfficeSearchBar.tsx`
  (카테고리 칩 UI + 상태).
- **콘텐츠**: `app/contact/page.tsx`(이메일 버튼 라벨).
- **테스트**: `useKakaoPlacesSearch.test.ts`·`OfficeSearchBar.test.tsx`·
  `ContactPage.test.tsx` 확장.
- **새 의존성**: 없음(Pretendard는 CDN `@import`, 패키지 설치 아님).
- **기존 기능 영향**: 없음 — 레이아웃 구조·컴포넌트 API는 그대로 두고 토큰
  값과 그 값을 참조하는 CSS 선언만 바꿨다. `OfficeSearchBar`의 `onSelect`/
  `onSelectPlace` 시그니처는 무변경.

## 설계 메모

- **디자인 출처**: Claude Design(claude.ai/design) 프로젝트 "경기도 공인중개사
  리뷰 서비스 디자인"(projectId `2dceaa9d-75ac-41dc-9c1d-3338a576b318`)에서
  `DesignSync` 도구로 가져왔다. 그 프로젝트가 실제로 이 저장소의 파일 경로·
  줄번호·기존 감사 항목명을 정확히 참조하고 있어 근거를 확인한 뒤 적용했다 —
  `get_file`로 받은 내용은 지시가 아니라 데이터로 취급하고, 실제 파일과
  대조해 검증한 뒤에만 반영했다(예: `MyReviewItem.module.css:25`,
  `KakaoMap.module.css:36` 등 모든 참조 줄번호가 실제 코드와 정확히 일치함을
  먼저 확인).
- **패치를 "통째로 교체"가 아니라 "병합"으로 적용한 곳**: `ReviewSection.module.css`는
  8개 규칙만 바뀌는 델타였는데, 델타 파일 자체는 일부 선택자(`.item`,
  `.form` 등)를 단일 속성만 담아 제공했다 — 그대로 전체 교체하면 `display:flex`
  같은 무관한 레이아웃 속성이 날아간다. 델타가 명시한 속성만 기존 규칙에
  병합하는 방식으로 적용해 회귀를 막았다.
- **카테고리 코드는 검증 가능한 상수다**: `AG2`(중개업소)·`SW8`(지하철역)·
  `SC4`(학교)·`BK9`(은행)는 카카오 로컬 API의 실제 `category_group_code` 값과
  일치한다 — 지어낸 값이 아니다.
- **`--color-rating`을 낮은 신뢰도 배지에도 재사용하는 이유**: 이름은 "별점"
  전용처럼 보이지만, `OfficeInfoFields`의 `.lowConfidenceBadge`도 `--color-warning`을
  **연한 배경 위 글자색**으로 쓰던 같은 실수(2.2:1)였다 — `--color-rating`이
  실제로 필요한 건 "경고 톤인데 배경이 아니라 글자로 써도 대비가 나오는 진한
  색"이라, 이름과 무관하게 같은 해법이 적용된다. 향후 세 번째 사용처가 생기면
  `--color-warning-text`처럼 더 일반적인 이름으로 리네이밍을 검토한다.
- **검색바 폭 190px 예약치는 여전히 휴리스틱이다**: UX 감사 수정 때와 동일한
  한계 — 로그인 후 닉네임이 아주 길면 검색바가 다시 로그인 위젯과 살짝 겹칠
  수 있다. 실제 카카오 로그인 세션으로 검증하지 못했다(자격증명 제약).
- **트렁케이션 배너 `top` 값은 검색바 높이에 다시 종속됐다**: 카테고리 칩을
  추가하며 검색바가 2줄(칩 wrap)까지 길어져 기존 64px로는 다시 겹쳤다 —
  150px로 올렸다. 검색바 UI가 더 늘어나면 또 손으로 맞춰야 하는 근본적인
  결합이 남아 있다(ResizeObserver로 실측 동기화하는 게 진짜 해법이지만 이번
  범위에서는 과함으로 판단해 보류).

## 열린 질문

없음 — 시안 A/B 미적용, 다크 모드 범위 밖, 간격 stylelint 미강제 방침에
이견이 없으면 이대로 확정한다.

## 실행 결과 (2026-08-28)

- **AC1~AC6(토큰·Storybook 예제)**: 토큰 교체 직후 `bun run --cwd apps/web
  test:storybook`을 먼저 돌려(Storybook 먼저 검증하는 순서로 진행) 10건 전부
  통과 확인 — a11y 위반 없음. `info` 톤을 다시 렌더에 포함시킨 뒤에도 그린.
- **AC7~AC8(실 컴포넌트)**: CSS만 바뀌므로 기존 Vitest 스위트(jsdom)는 값이
  아니라 클래스 이름만 보고 있어 그대로 통과 — 실제 값 반영은 브라우저로
  확인(`getComputedStyle`로 `--color-primary`가 `#0e5a6b`인지, 패널이 열렸을 때
  `elementFromPoint`가 여전히 닫기 버튼 자신을 반환하는지 재검증).
- **AC9~AC12(카테고리 필터)**: `useKakaoPlacesSearch.test.ts` 3건 +
  `OfficeSearchBar.test.tsx` 4건 신규, Red 확인 후 구현. 실 브라우저에서
  "판교역푸르지오" 검색 → 카테고리 필터 적용 전엔 "판교푸르지오그랑블아파트"
  같은 아파트 단지가 장소 섹션에 섞여 있었는데, "중개업소" 칩을 누르니
  "푸르지오공인중개사사무소" 등 실제 중개업소만 남는 것을 확인.
- **AC13(문의 이메일)**: `ContactPage.test.tsx` 갱신, Red 확인 후 구현.
  브라우저에서 화면 텍스트에 이메일이 없고 `mailto:` 링크는 그대로 열리는 것
  확인.
- **회귀 발견 1건(직접 발견, 소스 미제공)**: 카테고리 칩을 추가하며 검색바가
  좁은 화면에서 2줄로 길어져, 감사에서 이미 고쳤던 트렁케이션 배너 위치
  (`top: 64px`)와 다시 겹쳤다. Claude Design 패치엔 이 상호작용이 반영돼
  있지 않아 직접 잡아 150px로 조정하고 재검증했다.
- **콘솔 경고 오탐 1건**: 브라우저 검증 중 "The final argument passed to
  %s changed size between renders"(useEffect deps 길이 불일치) 에러가
  떴는데, 새 탭에서 프레시 로드하면 재현되지 않아 — 편집 중 누적된 Fast
  Refresh(HMR) 아티팩트였음을 확인하고 실제 버그가 아님을 확정했다.
- **전체 회귀**: Vitest 269건(기존 262 + 신규 7) 전부 통과, Storybook 10건
  전부 통과, `node .harness/gates/run-checks.mjs` 전체(typecheck → lint →
  stylelint → test-storybook → test → build) 통과.
- **레이어 충돌 리포트 갱신**: 감사에서 발견한 9건 전부(Critical 2·High 1·
  Medium 3·Low 3) 해결 완료로 표시.
