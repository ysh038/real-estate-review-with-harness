# 명세: 로딩/빈/에러 상태 일관화 + 리뷰 작성 임시저장

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

`docs/product-spec.md` Phase 11의 마지막 두 항목(`review-permalink-report-and-sort`
명세로 이미 끝난 퍼머링크·신고·정렬 다음 항목들).

1. **로딩 스켈레톤 + 빈 상태 + 에러 상태 일관화** — 지금은 `ReviewSection`·
   `mypage/reviews`·`OfficeSearchBar` 세 곳이 각자 다른 마크업으로 "불러오는 중…"·
   "~가 없습니다"·"불러오지 못했습니다"를 그린다. 특히 `OfficeSearchBar`는
   `useOfficeSearch`가 이미 돌려주는 `error`를 아예 화면에 안 그리고, 검색 중에는
   드롭다운에 아무 표시도 없다(직접 코드 확인). 공유 컴포넌트로 통일한다.
2. **작성 중 임시저장 + 이탈 경고 + draft 복원** — 리뷰 작성 폼에 내용을 입력하다가
   실수로 새로고침·이탈하면 전부 날아간다.

원본(`components/ui/Skeleton.tsx`·`ReviewForm.tsx`의 draft 로직)을 인터페이스만
참조한다(통제변인, `docs/decisions.md` #9). 원본엔 `EmptyState`/`ErrorState` 공유
컴포넌트가 없다 — 그 부분은 이 저장소에서 독자적으로 설계한다.

## 범위 밖

- **지도(`KakaoMap`·`OfficeMiniMap`)의 로딩·에러 상태** — 스켈레톤은 "콘텐츠 모양을
  흉내낸 자리표시자"라는 개념이라 지도 하나(리스트가 아님)에는 적용 대상이 아니다.
  기존 절대 위치 오버레이 방식을 그대로 둔다.
- **사진 업로드 중 스켈레톤** — 리뷰 작성 폼의 "사진 업로드 중..." 버튼 문구로
  이미 충분하다(review-photo-upload AC16).
- **검색 결과 드롭다운의 카드형 스켈레톤** — 검색 결과 한 줄은 이름+주소뿐이라
  리뷰 카드 스켈레톤을 그대로 쓰면 모양이 안 맞는다. 대신 짧은 로딩 문구를 쓴다
  (아래 설계 메모).
- **draft에 첨부 사진(File) 포함** — `File` 객체는 직렬화가 안 돼 localStorage에
  못 담는다(원본도 동일한 이유로 제외).
- **여러 탭 간 draft 동기화(`storage` 이벤트)** — 같은 사무소를 여러 탭에서 동시에
  작성하는 경우는 고려하지 않는다.

## 수용 기준

**공유 상태 컴포넌트**

- [x] AC1: `Skeleton`(shimmer 애니메이션 사각형)과 이를 조합한 `ReviewListSkeleton`
      (리뷰 카드 모양 N개)이 만들어진다.
- [x] AC2: `EmptyState`·`ErrorState` 공유 컴포넌트가 만들어지고, 메시지 텍스트를
      prop으로 받는다.

**리뷰 목록 (`ReviewSection`) 적용**

- [x] AC3: 로딩 중에는 `ReviewListSkeleton`이 보이고 기존 "불러오는 중…" 텍스트는
      사라진다.
- [x] AC4: 에러 시 `ErrorState`로 통일된 문구가 보인다.
- [x] AC5: 리뷰가 0건이면 `EmptyState`로 통일된 문구가 보인다.

**내 리뷰 목록 (`/mypage/reviews`) 적용**

- [x] AC6: 로딩·에러·빈 상태가 `ReviewListSkeleton`·`ErrorState`·`EmptyState`로
      통일된다(AC3~AC5와 같은 컴포넌트 재사용).

**사무소 검색 (`OfficeSearchBar`) 적용 — 기존 누락 보완**

- [x] AC7: 검색 중에는 드롭다운에 로딩 문구가 보인다(지금은 아무것도 안 보임).
- [x] AC8: 검색이 실패하면 `ErrorState`로 에러 문구가 보인다(지금은
      `useOfficeSearch`의 `error`가 화면에 전혀 안 쓰이고 있었음).
- [x] AC9: 검색 결과가 없으면 `EmptyState`로 통일된 문구가 보인다(기존 동작 유지,
      컴포넌트만 교체).

**리뷰 작성 임시저장**

- [x] AC10: 리뷰 작성 폼에 별점·본문·거래정보·방문시기·태그 중 하나라도 입력하면
      `localStorage`(`review-draft-{officeId}` 키)에 자동 저장된다.
- [x] AC11: 모든 필드가 비어 있으면(초기 상태로 돌아가면) 저장된 draft를 지운다 —
      빈 draft가 영구히 남지 않는다.
- [x] AC12: 사무소 상세 화면에 재진입했을 때 본문이 있는 draft가 남아 있으면
      "이어서 작성하시겠어요?" 안내와 함께 복원/새로 작성 버튼이 보인다.
- [x] AC13: "이어서 작성" 클릭 시 draft의 값이 폼에 채워지고 안내는 사라진다
      (storage는 그대로 둔다 — 계속 자동저장 대상이어야 한다).
- [x] AC14: "새로 작성" 클릭 시 draft가 storage에서 삭제되고 안내가 사라지며 폼은
      빈 상태를 유지한다.
- [x] AC15: 리뷰 작성에 성공하면 draft가 storage에서 삭제된다.
- [x] AC16: 본문이 비어 있지 않은 상태로 페이지를 벗어나려 하면(새로고침·닫기)
      브라우저의 이탈 확인 대화상자가 뜬다. 본문이 비어 있으면 뜨지 않는다.

## 영향 범위

- **만질 파일**
  - `apps/web/components/Skeleton/`(신규) — `Skeleton.tsx`(기본 shimmer),
    `ReviewListSkeleton.tsx`, `Skeleton.module.css`, `index.ts`.
  - `apps/web/components/EmptyState/`(신규) — `EmptyState.tsx`·`.module.css`·`index.ts`.
  - `apps/web/components/ErrorState/`(신규) — `ErrorState.tsx`·`.module.css`·`index.ts`.
  - `apps/web/components/ReviewSection/ReviewSection.tsx` — 로딩/에러/빈 상태 교체,
    draft 배너·자동저장·이탈 경고 연동.
  - `apps/web/app/mypage/reviews/page.tsx` — 로딩/에러/빈 상태 교체.
  - `apps/web/components/OfficeSearchBar/OfficeSearchBar.tsx` — 로딩 문구·에러 표시
    추가.
  - `apps/web/hooks/useReviewDraft.ts`(신규) — draft 로드/저장/삭제, `beforeunload`
    등록을 캡슐화(라우트·컴포넌트에 비즈니스 로직을 두지 않는 기존 레이어링 원칙,
    `.cursor/rules/10-architecture`).
  - 신규/수정 테스트: `Skeleton.test.tsx`, `EmptyState.test.tsx`, `ErrorState.test.tsx`,
    `useReviewDraft.test.ts`, `ReviewSection.test.tsx`·`MyPageReviews.test.tsx`·
    `OfficeSearchBar.test.tsx` 확장.
- **새 의존성**: 없음.
- **기존 기능 영향**: 화면에 보이는 문구·마크업만 바뀐다. API·데이터 흐름은
  그대로다.

## 설계 메모

- **`EmptyState`·`ErrorState`를 `apps/web/components/`에 두고 `packages/ui`에
  안 두는 이유**: `packages/ui`의 기존 컴포넌트(`VisuallyHidden`)는 인라인 스타일만
  쓴다 — CSS Modules를 그 패키지에서 실제로 써본 전례가 없고, Next.js 빌드가
  워크스페이스 패키지의 `.module.css`를 그대로 처리해줄지 검증되지 않았다. 이
  컴포넌트들은 색상(에러 텍스트 등) 토큰이 필요해 인라인 스타일로 만들면 stylelint
  색상 검사망을 완전히 피해가게 된다 — 이 저장소 전역에서 지켜온 "CSS Modules +
  토큰만" 원칙을 지키기 위해 검증된 위치(`apps/web/components/`)에 둔다.
- **검색 드롭다운은 스켈레톤 대신 로딩 문구**: 스켈레톤은 콘텐츠의 "모양"을
  흉내내는 것이 핵심인데, 검색 결과 한 줄(이름+주소)은 이미 리뷰 카드보다 훨씬
  단순해서 별도 스켈레톤을 만들 실익이 적다. 기존 `EmptyState` 톤과 맞춰 간단한
  로딩 문구만 추가한다.
- **draft를 훅으로 분리하는 이유**: `ReviewSection`은 이미 폼 필드 상태(평점·본문·
  거래정보 등)를 여러 개의 `useState`로 들고 있다. 이 필드들 자체를 훅으로
  옮기는 대신(기존 검증된 코드를 건드리는 범위가 커짐), localStorage 저장/복원/
  `beforeunload` 등록만 별도 훅(`useReviewDraft`)으로 캡슐화하고 `ReviewSection`은
  필드가 바뀔 때 훅의 `saveDraft`를 부르는 `useEffect` 하나만 추가한다 — 최소
  변경으로 레이어링 원칙(컴포넌트에 비즈니스 로직 금지)을 지킨다.
- **"복원"은 storage를 안 지우고 "새로 작성"만 지우는 이유**: 원본과 동일한 구분이다
  (직접 코드 확인). 복원은 "이어서 편집하겠다"는 뜻이라 계속 자동저장 대상이어야
  하고, "새로 작성"은 그 draft를 명시적으로 버리겠다는 사용자 의사 표시다.
- **draft에 `rating`을 포함하는 이유**: 원본에는 별점이 없어(decision #9) draft
  스키마에도 없지만, 이 저장소는 별점을 유지하기로 했으므로(decision #10) 다른
  필드와 동등하게 취급해 draft에 포함한다 — 원본에 없는 필드라 독자적으로 정한다.

## 열린 질문

없음 — 스켈레톤 적용 범위(지도 제외), 공유 컴포넌트 위치, draft 훅 분리,
"복원 vs 새로 작성" 시 storage 처리 전부 위 설계 메모에서 확정했다.

## 실행 결과 (2026-08-27)

**Red → Green 확인**

- `Skeleton.test.tsx`·`EmptyState.test.tsx`·`ErrorState.test.tsx`: 컴포넌트 파일이
  없는 상태에서 import 해석 실패로 Red 확인 → 구현 후 3개 파일 6개 테스트 모두
  Green.
- `ReviewSection.test.tsx`에 AC3·AC4용 테스트 2개 추가 후 Red 확인(스켈레톤 카드
  미존재, `error` 상태를 그릴 곳이 없어 `role=alert` 못 찾음) → `ReviewListSkeleton`·
  `ErrorState`로 교체 후 Green. AC5는 기존 AC9 테스트("아직 리뷰가 없습니다")가
  문구를 그대로 유지하는 `EmptyState`로 바뀌었으므로 별도 수정 없이 계속 통과.
- `MyPageReviews.test.tsx`에 AC6용 테스트 2개(스켈레톤·에러) 추가 후 Red 확인 →
  구현 후 Green. 기존 빈 상태 테스트는 문구 유지로 그대로 통과.
- `OfficeSearchBar.test.tsx`에 AC7·AC8용 테스트 2개 추가 후 Red 확인(로딩 문구·
  `role=alert` 모두 없음 — `useOfficeSearch`가 돌려주는 `error`가 화면에 전혀
  안 쓰이고 있었다는 설계 메모의 관찰이 테스트로도 재확인됨) → 구현 후 Green.
  `isEmptyState` 조건에 `!error`를 추가해 에러 상태와 빈 상태가 동시에 뜨는
  것도 막았다(설계 메모에 없던 사소한 보강).
- `useReviewDraft.test.ts`(신규, 9개 테스트: 저장/삭제/배너 노출/복원/새로 작성/
  clearDraft/beforeunload 2건)를 먼저 작성해 Red 확인(훅 파일 자체가 없어 import
  해석 실패) → 구현 후 전부 Green.
- `ReviewSection.test.tsx`에 draft 통합 테스트 7개(AC10~AC16) 추가 후 Red 확인
  (배너 문구·복원/새로 작성 버튼·자동저장·제출 시 삭제·beforeunload 전부 없음) →
  `useReviewDraft` 훅을 연동한 뒤 전부 Green.

**테스트 작성 중 발견한 실수**

- `useReviewDraft.test.ts`·`ReviewSection.test.tsx`의 draft 픽스처에 태그
  `"친절"`을 썼다가 typecheck에서 `TReviewTag` 유니언에 없는 값이라는 에러로
  발견 — 실제 태그 값 `"친절함"`으로 수정(테스트 데이터 오타, 구현 결함 아님).

**전체 회귀 확인**

- `apps/web` 전체 테스트: 35 파일 212개 테스트 모두 통과(기존 205개 + 이번에
  추가된 7개 신규 테스트 파일/스펙 확장분).
- `node .harness/gates/run-checks.mjs` 전체 게이트(typecheck → lint → stylelint →
  test → build) 통과. 중간에 `app/mypage/reviews/page.tsx`의 import 순서
  위반(`import/order`)을 `eslint --fix`로 수정 — 새로 추가한 `components/*` import를
  기존 `hooks/*` import보다 앞에 두지 않아 걸린 것으로, 로직에는 영향 없음.

**실제 브라우저 검증**

- `docker stop app-web` → 이 저장소 `apps/web`을 `--port 3000`으로, `apps/api`를
  `:8788`로 각각 foreground 기동 → 검증 후 `docker start app-web`으로 원복(기존
  세션에서 확립한 절차, AGENTS.md 카카오 도메인 제약 때문).
- 검색바 최초 시도 시 `apps/api`를 안 띄운 상태라 `ERR_CONNECTION_REFUSED`로
  실패했는데, 그 결과 화면에 "검색에 실패했습니다"(`ErrorState`, role=alert)가
  바로 떴다 — AC8이 실제로 동작한다는 것을 뜻하지 않게 먼저 확인한 셈. api를
  띄운 뒤 재검증:
  - "분당" 검색 → 실제 시딩 데이터 8건이 드롭다운에 정상 표시.
  - "존재하지않는사무소이름" 검색 → "검색 결과가 없습니다"(`EmptyState`) 정상 표시.
  - 검색 결과 중 하나(`인텔리지2공인중개사사무소`, 리뷰 0건)를 클릭 →
    상세 패널과 `/offices/41135-2024-00077` 라우트 양쪽에서 "아직 리뷰가
    없습니다"(`EmptyState`)가 정상 표시됨을 확인.
  - 로딩 스켈레톤·검색 로딩 문구는 로컬 개발 서버 응답이 너무 빨라(수십ms) 스크린샷
    타이밍으로 못 잡았다 — mock된 `isLoading: true` 상태로 컴포넌트 단위 테스트가
    이미 그 마크업을 직접 검증하고 있어 실기능 검증은 충분하다고 판단.
  - 리뷰 작성 폼(draft 배너·자동저장·이탈 경고)은 카카오 로그인이 필요해 실제
    OAuth 없이는 브라우저로 재현 불가 — `useReviewDraft.test.ts` 9개 +
    `ReviewSection.test.tsx`의 draft 통합 테스트 7개(localStorage 실제 읽기/쓰기,
    실제 `beforeunload` 이벤트 디스패치 포함)로 대체 검증했다.
  - 콘솔 에러 중 남은 것은 최초 api 미기동 시점의 `ERR_CONNECTION_REFUSED`와
    비로그인 상태의 401(로그인 여부 확인 요청) 뿐 — 이번 변경이 새로 만든 에러는
    없음을 확인.
