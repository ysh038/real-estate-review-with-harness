# 명세: 리뷰 목록·작성 폼 UI

- 작성일: 2026-08-21
- 상태: 확정

## 목표

Phase 1의 API는 덩이 A~C로 전부 끝났다 — 조회·작성·수정·삭제·신고·rate limit까지 서버는
다 안다. 그런데 화면에는 아직 리뷰가 하나도 안 보인다. 이 명세는 **사무소 상세 패널에 리뷰
목록과 작성 폼을 붙인다**(product-spec TODO 덩이 D, 마지막 줄: "리뷰 목록·작성 폼 UI(별점 +
본문 10자 이상), 로딩·에러 상태"). 이게 끝나면 Phase 1 10개 항목이 전부 끝난다.

## 범위 밖

- **리뷰 수정·삭제·신고 UI** — API(`PATCH`/`DELETE`/`report`)는 덩이 C에서 이미 만들었지만,
  product-spec의 이 TODO 줄은 "목록·작성 폼"만 명시한다. `reviewSchema`의 `author`에는
  `userId`가 없어(개인정보 최소화 결정, `reviews-schema-and-read-api` 명세) "이게 내 리뷰인지"를
  프론트가 판별할 방법도 없다 — 판별하려면 계약을 넓혀야 하니 이번 범위에서 뺀다.
- **평점 분포 그래프·정렬 옵션** — API가 최신순 하나만 준다(읽기 명세 결정 그대로).
- **리뷰 작성 후 낙관적 업데이트(optimistic UI)** — 성공 응답을 받은 뒤에만 화면을 갱신한다.
  실패 시 롤백 로직을 만들 필요가 없어진다.
- **커서 상태의 URL 반영·새로고침 후 페이지 유지** — 패널을 다시 열면 첫 페이지부터 다시 본다.
- **Storybook** — `kakao-map-render`·`office-detail-panel`에서 이미 두 번 미룬 근거(화면이
  아직 단일 지도 화면 하나뿐)가 그대로 유효하다. 이번에도 Testing Library로 상호작용을
  검증한다(사용자 결정, `office-detail-panel` 명세에서 확정).

## 수용 기준

**`useOfficeReviews` 훅** (Vitest, `fetch` 모킹 — 네트워크 불필요)

- [x] AC1: `officeId`가 주어지면 사무소 집계(`avgRating`·`reviewCount`)와 첫 페이지 리뷰를
      함께 불러온다.
- [x] AC2: 불러오는 동안 `isLoading`이 `true`이고, 끝나면 `false`가 된다.
- [x] AC3: 조회가 실패하면 `error`가 채워지고 예외를 던지지 않는다(화면이 깨지지 않는다).
- [x] AC4: `nextCursor`가 있을 때 `loadMore()`를 부르면 다음 페이지를 **이어붙인다**(기존 목록
      유지 + 추가, 덮어쓰지 않는다).
- [x] AC5: `officeId`가 바뀌면(다른 마커 클릭) 이전 사무소의 리뷰 상태를 버리고 새 사무소
      기준으로 다시 불러온다.
- [x] AC6: 리뷰 작성이 성공하면 목록과 집계를 서버 기준으로 다시 불러온다(낙관적 병합이 아니다).
- [x] AC7: 리뷰 작성이 실패하면 `submitError`가 채워지고, 기존 목록·집계는 그대로 유지된다.

**`ReviewSection` 컴포넌트** (Vitest + `@testing-library/react`, 사용자 관점 쿼리)

- [x] AC8: 집계 헤더에 평균 평점과 리뷰 개수가 보인다.
- [x] AC9: 리뷰가 0건이면(`reviewCount: 0`, `avgRating: null`) "아직 리뷰가 없습니다"류의
      빈 상태 문구가 보이고, 별점·개수는 숫자로 노출하지 않는다.
- [x] AC10: 리뷰가 있으면 각 항목에 작성자 닉네임·별점·본문이 보인다.
- [x] AC11: 처음 불러오는 동안 로딩 상태 표시가 보인다.
- [x] AC12: `nextCursor`가 있으면 "더보기" 버튼이 보이고, 누르면 다음 페이지 리뷰가 기존
      목록 아래에 이어붙는다.
- [x] AC13: 비로그인 상태면 작성 폼 대신 로그인 유도 문구가 보인다(폼 자체가 렌더링되지 않는다).
- [x] AC14: 로그인 상태면 별점(1~5, 라디오 5개)과 본문 입력 폼이 보인다.
- [x] AC15: 본문이 10자 미만이면 제출 시 클라이언트 검증 에러가 보이고 요청이 나가지 않는다.
- [x] AC16: 별점을 선택하지 않고 제출하면 에러가 보이고 요청이 나가지 않는다.
- [x] AC17: 정상 제출하면 폼이 비워지고 새로 고쳐진 목록에 방금 쓴 리뷰가 보인다.
- [x] AC18: 제출하는 동안 제출 버튼이 비활성화된다(중복 제출 방지).
- [x] AC19: 서버가 실패를 반환하면(예: 409) 에러 문구가 보이고 입력한 내용은 지워지지 않는다
      (다시 고쳐 낼 수 있게).

**브라우저 확인** (실제 카카오 로그인 + `bun run dev`, 3000 포트) — **스킵됨, 아래 "실행 결과" 참고**

- [ ] AC20: 로그인 후 사무소를 골라 실제로 리뷰를 작성하면 화면에 즉시 반영되고, 패널을
      닫았다 다시 열어도(=새로 고쳐 불러와도) 남아있다.
- [ ] AC21: 비로그인 상태로 사무소를 클릭하면 작성 폼 없이 로그인 유도만 보인다.
- [ ] AC22: 다른 마커(다른 사무소)를 클릭하면 리뷰 섹션이 그 사무소 것으로 바뀐다
      (office-detail-panel의 선택 전환과 함께 회귀 없이 동작하는지 확인).

## 영향 범위

- **만질 파일**
  - `apps/web/lib/reviewsApi.ts` (신규) — `fetchOfficeDetail`·`fetchReviews`·`createReview`.
    전부 `@repo/types`의 기존 스키마(`officeDetailResponseSchema`·`reviewListResponseSchema`·
    `createReviewRequestSchema`)로 파싱한다 — 덩이 A·C에서 이미 정의돼 있어 타입 추가가 없다.
  - `apps/web/hooks/useOfficeReviews.ts` (신규) — 위 세 호출을 오케스트레이션.
  - `apps/web/components/ReviewSection/` (신규) — `ReviewSection.tsx`·`.module.css`·`index.ts`.
    `useSession()`(기존)과 `useOfficeReviews()`를 각각 독립적으로 사용한다 — 세션과 리뷰
    데이터는 서로 다른 관심사라 한 훅에 합치지 않는다.
  - `apps/web/components/OfficeDetailPanel/OfficeDetailPanel.tsx` — 기존 필드 아래에
    `<ReviewSection officeId={office.id} />` 추가.
  - `apps/web/__tests__/unit/reviewsApi.test.ts`, `useOfficeReviews.test.ts`,
    `ReviewSection.test.tsx` (신규)
- **새 의존성**: 없음(fetch 내장, `@testing-library/react`·`user-event`는 이미 있다).
- **기존 기능 영향**: `OfficeDetailPanel`은 새 자식이 하나 늘 뿐 기존 필드·ESC·포커스·
  비모달 동작은 무변경(office-detail-panel AC1~19 회귀 확인).

## 설계 메모

- **집계는 리뷰 작성 시 다시 fetch한다**: 새 리뷰를 목록 맨 앞에 직접 끼워 넣고 `avgRating`을
  프론트에서 재계산할 수도 있지만, 평균 계산 로직이 서버(`officeService`)와 두 곳에 존재하게
  된다. 서버가 진실의 원천이라 다시 불러오는 쪽이 더 단순하고 안전하다.
- **"내가 이미 썼는지"는 서버 에러로만 안다**: `reviewSchema.author`에 `userId`가 없어(개인정보
  최소화) 프론트가 미리 판별해 폼을 숨길 수 없다. 대신 서버가 409를 주면 AC19로 안내한다 —
  계약을 넓히지 않고 기존 API로 충분히 처리된다.
- **별점 입력은 네이티브 `radio` 5개**: 커스텀 별 위젯 대신 `<input type="radio">` 그룹으로
  구현한다. 키보드 접근성(화살표 이동, 스크린리더 "N/5")을 공짜로 얻고, 테스트도
  `getByRole('radio', { name: 'N점' })`로 단순해진다.
- **레이어**: `lib/reviewsApi.ts`(순수 fetch) → `hooks/useOfficeReviews.ts`(오케스트레이션) →
  `components/ReviewSection`(프레젠테이션). `office-marker-bbox-sync`에서 세운 web 레이어
  순서와 동일.

## 열린 질문 (해소됨 — 2026-08-21)

1. **로그인 유도 문구 vs 로그인 버튼 병행** → **안내 문구만.** 지도 위 `LoginButton`이 이미
   항상 떠 있어 중복 진입점을 늘리지 않는다.

## 실행 결과 (2026-08-21)

- **AC1~19 (Vitest + Testing Library)**: 전부 통과. `reviewsApi.test.ts`(6개)·
  `useOfficeReviews.test.ts`(6개)·`ReviewSection.test.tsx`(12개) = 24개 신규 테스트, 전체
  하네스 게이트(`node .harness/gates/run-checks.mjs`: typecheck·lint·stylelint·test·build)
  통과. `OfficeDetailPanel.test.tsx`(기존 7개)도 `ReviewSection` 삽입 후 재실행해 회귀 없음을
  확인했다 — jsdom 환경에서 `ReviewSection`이 모킹되지 않은 실제 `fetch`를 호출하지만, 실패가
  `useOfficeReviews`의 `error`/`catch` 경로로 흡수되어(AC3 설계대로) 테스트가 깨지지 않는다.
- **AC20~22 (실제 카카오 로그인 브라우저 검증)**: **스킵.** 3000 포트로 `app-web` 컨테이너를
  내리고 `web-verify-3000` preview를 띄운 뒤 "카카오 로그인" 버튼을 눌렀더니 실제 카카오
  계정 로그인 화면(`accounts.kakao.com`)으로 이동했다 — 이 지점부터는 실제 카카오 계정
  아이디/비밀번호 입력이 필요한데, 이는 에이전트가 사용자를 대신해 자격증명을 입력할 수 없는
  하드 제약이라 더 진행할 수 없었다. 사용자에게 직접 로그인해줄 수 있는지 물었고, 사용자가
  "AC20~22 브라우저 검증은 스킵하고 넘어가줘"라고 명시적으로 결정해 스킵했다.
  - **리스크**: AC17(정상 제출 시 폼 초기화 + 새 리뷰 반영)과 AC6(성공 시 재조회)는 Vitest에서
    `createReview`를 모킹해 검증했을 뿐, 실제 API 서버·DB를 통한 end-to-end 경로는 확인되지
    않았다. `review-write-and-report` 명세(덩이 C)에서 API 자체는 이미 실제 서버로 검증된
    바 있어 위험은 낮다고 판단하지만, 다음에 이 화면을 만질 때(또는 다음 PC 세션에서 카카오
    로그인이 가능할 때) 실제 로그인 → 리뷰 작성 → 새로고침 확인을 한 번은 통과시켜야 한다.
  - **후속 조치**: 이 AC20~22는 미해결로 남는다. `docs/decisions.md`에 후속 작업 항목으로
    기록한다.
