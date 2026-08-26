# 명세: 마이페이지 뼈대 + 프로필 편집

- 작성일: 2026-08-26
- 상태: 구현됨

## 목표

지금 "내 리뷰"는 헤더 버튼으로 여는 모달(`MyReviewsPanel`) 하나뿐이고, 닉네임은 카카오
로그인 시점 값을 그대로 보여줄 뿐 확인하거나 고칠 화면이 없다. 원본은 `/mypage` 아래
리뷰·프로필·설정을 서브라우트로 나눠 보여준다(`docs/product-spec.md` Phase 9).

이 명세는 Phase 9의 절반 — **마이페이지 뼈대(레이아웃+탭+인증 가드) + 리뷰 탭(기존 패널
이관) + 프로필 탭(닉네임 편집·가입일·카카오 연동 표시)**을 다룬다. 회원 탈퇴·리뷰
익명화는 스키마 마이그레이션이 얽혀 있어 별도 명세로 분리한다(아래 "범위 밖").

작업 중 발견한 전제 조건 두 가지도 이 명세에서 같이 고친다:
1. **`LoginButton`이 홈 화면에만 있다.** `/offices/[id]`(Phase 8)에 이미 로그인/로그아웃
   수단이 없고, `/mypage`도 마찬가지로 필요하다 — 루트 레이아웃으로 올린다.
2. **로그아웃해도 보호된 화면에 남는다.** `useSession`은 컴포넌트마다 독립적인 로컬
   상태라(공유 컨텍스트 없음), 헤더에서 로그아웃해도 `/mypage`를 지키는 별도의
   `useSession` 인스턴스는 그 사실을 모른다. 로그아웃 시 홈으로 이동시켜 해결한다.

## 범위 밖

- **`/mypage/settings`·회원 탈퇴 플로우·리뷰 익명화** — `reviews.user_id`가 현재
  `NOT NULL` + `ON DELETE CASCADE`라, 계정을 지우면 리뷰까지 통째로 사라진다.
  "탈퇴해도 리뷰는 남기고 작성자만 익명화"하려면 컬럼을 nullable로 바꾸고 FK를
  `SET NULL`로 바꾸는 마이그레이션 + 공개 리뷰 조회 경로에서 "탈퇴한 사용자" 표시
  처리가 필요하다. 범위가 크고 독립적으로 검증 가능해 별도 명세로 뗀다.
- **리뷰 정렬·필터·수정·삭제** — `my-reviews-list.md`가 이미 범위 밖으로 못박은 것을
  그대로 유지한다(Phase 11에서 다룰 항목).
- **프로필 이미지 변경** — 카카오 프로필 이미지를 그대로 쓴다. 별도 업로드는 Phase 2
  범위(사진 업로드)와 겹쳐 지금 하지 않는다.
- **알림 설정 placeholder** — 설정 페이지와 함께 후속.
- **닉네임 중복 검사** — 원본에도 없는 제약이고, 카카오 닉네임 자체가 유일성을 보장하지
  않으므로 이번에도 추가하지 않는다(표시용 값일 뿐 식별자가 아니다).

## 수용 기준

**계약 (`packages/types/src/user.ts`)**

- [x] AC1: `authUserSchema`는 `id`·`nickname`·`profileImageUrl`·`createdAt`(ISO datetime
      문자열)을 포함한다.
- [x] AC2: `updateNicknameRequestSchema`는 1~20자 문자열만 허용하고, 빈 문자열이나
      21자 이상은 거부한다.

**API**

- [x] AC3: `GET /api/me` 응답에 `createdAt`이 포함된다(기존 `id`·`nickname`·
      `profileImageUrl`은 그대로 — 회귀 없음).
- [x] AC4: `PATCH /api/users/me`는 세션 쿠키 없이 요청하면 401.
- [x] AC5: 유효한 닉네임(1~20자)으로 요청하면 200과 함께 갱신된 사용자 정보를 반환한다.
- [x] AC6: 빈 문자열이거나 21자 이상이면 400(DB에 반영되지 않는다).
- [x] AC7: 갱신 후 `GET /api/me`를 다시 조회하면 새 닉네임이 보인다(실제로 DB에
      반영됨을 확인).

**`RequireAuth` (신규, Testing Library — `useSession`·`next/navigation` 모킹)**

- [x] AC8: `status`가 `"authenticated"`면 children을 렌더한다.
- [x] AC9: `status`가 `"unauthenticated"`면 children을 렌더하지 않고
      `router.replace("/")`를 호출한다.
- [x] AC10: `status`가 `"loading"`이면 children도 렌더하지 않고 리다이렉트도 호출하지
      않는다(로그인 여부를 아직 모르는 순간에 성급하게 내쫓지 않는다).

**헤더 전역화 + 로그아웃 이동 (Testing Library + 브라우저 검증)**

- [x] AC11: 로그인 상태의 헤더에 "내 리뷰" 버튼 대신 `/mypage`로 가는 "마이페이지"
      링크가 있다.
- [x] AC12: 로그아웃 버튼을 누르면 로그아웃 요청 후 홈(`/`)으로 이동한다.
- [x] AC13(브라우저): `LoginButton`이 `/`뿐 아니라 `/offices/[id]`·`/mypage`에서도
      동일하게 보인다(루트 레이아웃 렌더 확인).

**`/mypage` 레이아웃·탭 (브라우저 검증 — 실 로그인 세션 필요)**

- [x] AC14: 비로그인 상태로 `/mypage`(하위 경로 포함)에 접근하면 홈으로 리다이렉트된다.
- [x] AC15: 로그인 상태로 `/mypage`에 접근하면 `/mypage/reviews`로 이동한다.
- [x] AC16: 탭 내비게이션에 "리뷰"·"프로필" 링크가 있고, 현재 탭이 시각적으로
      구분된다.

**`/mypage/reviews`**

- [x] AC17: 기존 `MyReviewsPanel`과 동일한 내용(사무소 이름·별점·본문·숨김 표시·
      더보기)이 페이지로 보인다.
- [x] AC18: 작성한 리뷰가 없으면 빈 상태 문구가 보인다.

**`/mypage/profile`**

- [x] AC19: 닉네임·가입일(사람이 읽는 형식, 예: "2026년 8월 가입")·"카카오 계정으로
      로그인됨" 문구가 보인다.
- [x] AC20: "수정" 버튼을 누르면 닉네임 입력 필드가 나타나고, 저장하면
      `PATCH /api/users/me` 호출 후 재조회 없이 화면 닉네임이 즉시 갱신된다.
- [x] AC21: 닉네임을 빈 값으로 저장하려 하면 에러 문구가 보이고 요청이 나가지 않는다.
- [x] AC22: `useSession`이 노출하는 `updateNickname`을 호출해 성공하면 훅의 `user`
      상태(`nickname`)가 즉시 새 값으로 바뀐다(Vitest 훅 단위).

## 영향 범위

- **만질/새로 만들 파일**
  - `packages/types/src/user.ts`(신규) — `authUserSchema`·`updateNicknameRequestSchema`
  - `packages/types/src/index.ts` — 위 export 추가
  - `apps/api/src/services/authService.ts` — `IAuthUser`에 `createdAt` 추가,
    `IUserRepository`에 `updateNickname(userId, nickname)` 추가
  - `apps/api/src/repositories/userRepository.ts` — `findById`/`upsertByKakaoId`가
    `createdAt`도 select, `updateNickname` 구현
  - `apps/api/src/routes/users.ts`(신규) — `PATCH /api/users/me`
  - `apps/api/src/routes/auth.ts` — `GET /api/me` 응답을 `authUserSchema.parse(...)`로
    검증(AC3)
  - `apps/api/src/app.ts` — 신규 라우트 등록
  - `apps/web/lib/authApi.ts` — `IAuthUser`를 `@repo/types`의 `TAuthUser`로 교체,
    `updateNickname(nickname, baseUrl)` 추가
  - `apps/web/hooks/useSession.ts` — `updateNickname` 노출(성공 시 로컬 `user` 갱신)
  - `apps/web/components/RequireAuth/`(신규)
  - `apps/web/app/layout.tsx` — `<LoginButton />` 전역 렌더
  - `apps/web/app/page.tsx` — 중복 방지로 `<LoginButton />` 제거(레이아웃이 대신 그림)
  - `apps/web/components/LoginButton/LoginButton.tsx` — "내 리뷰" 버튼 → `/mypage`
    링크, `MyReviewsPanel` 의존 제거, 로그아웃 후 `router.push("/")`
  - `apps/web/components/MyReviewsPanel/` + 대응 테스트 — **삭제** (`/mypage/reviews`로
    대체)
  - `apps/web/app/mypage/layout.tsx`(신규) — `RequireAuth` + 탭 내비게이션
  - `apps/web/app/mypage/page.tsx`(신규) — `/mypage/reviews`로 redirect
  - `apps/web/app/mypage/reviews/page.tsx`(신규)
  - `apps/web/app/mypage/profile/page.tsx`(신규)
  - `apps/web/__tests__/unit/LoginButton.test.tsx` — 모달 기반 케이스를 링크·리다이렉트
    기반으로 재작성
  - 그 외 신규 파일 각각의 `__tests__/unit/*` 추가

- **새 의존성**: 없음.

- **기존 기능 영향**
  - `GET /api/me` 응답에 필드가 하나 늘 뿐 기존 필드는 그대로라 `useSession`·
    `LoginButton`의 기존 로직에 영향 없음(AC3로 회귀 확인).
  - `MyReviewsPanel` 삭제로 그 컴포넌트의 기존 테스트(9건)도 함께 지운다 — 동작 자체는
    `/mypage/reviews` 페이지 테스트(AC17·AC18)로 이어받는다.
  - `LoginButton`을 루트 레이아웃으로 옮기면 `/offices/[id]`에도 처음으로 로그인 헤더가
    생긴다 — Phase 8 명세엔 없던 항목이지만 Phase 9가 요구하는 전제 조건이라 여기서
    같이 고친다.

## 설계 메모

- **모달 폐기, 서브라우트로 전환**: product-spec Phase 9의 열린 선택지("모달 유지 vs
  서브라우트 전환") 중 후자를 택한다. 프로필·설정까지 늘어나는 화면을 모달 하나에
  구겨 넣는 것보다, Phase 8에서 이미 "진짜 페이지"(`/offices/[id]`) 패턴을 만들어 둔
  김에 마이페이지도 같은 결로 가는 게 자연스럽다.
- **`RequireAuth`를 클라이언트 컴포넌트로 만드는 이유**: 세션이 쿠키 기반이고 API가
  다른 오리진(`:8788`)이라, 서버 컴포넌트에서 인증 여부를 알려면 들어온 요청의
  `Cookie` 헤더를 직접 읽어 API로 전달하는 배선이 새로 필요하다. 기존 `useSession`
  훅이 이미 이 문제를 클라이언트에서 풀어뒀으므로 그대로 재사용하는 게 훨씬 적은
  변경이다 — 대가는 로그인 여부가 확정되기 전 잠깐 빈 화면이 보이는 것뿐이다.
- **로그아웃 시 `router.push("/")`를 쓰는 이유**: "Refactor" 섹션에서 다시 언급하지만,
  `useSession`이 컴포넌트별 로컬 상태라 헤더의 로그아웃이 `/mypage`를 지키는
  `RequireAuth`의 상태를 갱신하지 않는다. 세션을 Context로 승격하는 게 정공법이지만
  지금 화면 개수(2~3개)에서는 과한 리팩터다 — "로그아웃하면 무조건 홈으로" 라우팅
  규칙 하나로 같은 결과(보호된 화면에 남지 않음)를 훨씬 적은 변경으로 얻는다. 화면이
  늘어나 이 트릭이 버거워지면 그때 Context로 승격한다.
- **가입일 형식**: "YYYY년 M월 가입"처럼 일 단위까지는 보여주지 않는다 — 정확한 날짜가
  중요한 정보가 아니고, 원본도 이 정도 정밀도였다(인터페이스만 참고, 문구는 새로 씀).

## 열린 질문

없음 — "설계 메모"의 선택(서브라우트 전환, RequireAuth 클라이언트 가드, 로그아웃
홈이동)에 이견이 없으면 `/impl`로 진행한다.

## 실행 결과 (2026-08-26)

- **AC1~AC12, AC14, AC16~AC22**: Vitest 신규 22건 전부 통과
  (RequireAuth 3 + LoginButton 재작성 3 + useSession 신규 1 + MyPageLayout 2 +
  MyPageReviews 4 + MyPageProfile 3 + usersRoute 5 + authRoutes/authService/
  reviewService 갱신 회귀 확인). 기존 회귀 없음 — `bun run test` 기준 web 110개·api
  191개 전부 통과. `MyReviewsPanel`의 기존 9개 테스트는 페이지 테스트로 대체되며
  삭제했다.
- **AC13, AC14(브라우저)**: `bun run dev --port 3000`으로 확인.
  - `/`·`/offices/[id]` 양쪽에서 "카카오 로그인" 헤더가 동일하게 보임 —
    `/offices/[id]`는 Phase 8에는 없던 로그인 수단이 이번에 처음 생겼다.
  - 비로그인 상태로 `/mypage` 접속 → `/mypage/reviews`로 서버 리다이렉트 →
    `RequireAuth`가 `unauthenticated`를 감지해 홈(`/`)으로 재리다이렉트. 지도 화면이
    정상적으로 뜨는 것까지 실제 브라우저에서 확인.
- **AC15, AC19~21(로그인 상태 화면)**: 실 카카오 로그인 세션이 없어 인증된 상태의
  `/mypage/reviews`·`/mypage/profile` 실제 렌더링은 브라우저에서 끝까지 확인하지
  못했다 — `kakao-oauth-login`·`review-list-and-write-ui` AC20~22·`my-reviews-list`
  때와 동일한 제약(에이전트가 카카오 자격증명을 대신 입력할 수 없음). `RequireAuth`가
  `authenticated`일 때 children을 그대로 렌더한다는 것과, `/mypage/page.tsx`의
  `redirect("/mypage/reviews")`가 Next.js 표준 API 한 줄이라는 점, 그리고 각 페이지의
  렌더 로직 자체는 Testing Library로 이미 확인됐다는 점에서 위험은 낮다고 판단했다.
  다음에 실 로그인 세션이 있을 때 마저 확인이 필요하다(다른 미완료 항목들과 함께
  `docs/decisions.md`에 누적 기록 필요).
- **버그 없음(구현 자체)**: 실제 런타임 버그는 발견되지 않았다. 다만 구현 중 두 가지
  기존 문제(Phase 8까지 `/offices/[id]`에 로그인 헤더 없음, `useSession`이 컴포넌트별
  로컬 상태라 로그아웃이 다른 화면에 전파되지 않음)를 발견해 이번 명세 범위에 포함해
  같이 고쳤다(위 "설계 메모" 참고).
