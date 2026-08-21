# 명세: 카카오 OAuth 로그인 + 세션

- 작성일: 2026-08-20
- 상태: 구현됨 — AC1~AC10 전부 확인

## 목표

Phase 1 덩이 A(리뷰 스키마+읽기 API)까지 왔지만 로그인이 없어 "누가" 리뷰를 쓰는지 알 방법이
없다. 이 명세는 **카카오 OAuth 로그인 → 세션 발급 → 로그인/로그아웃 UI**까지를 정의한다
(product-spec TODO 덩이 B, 두 줄: "카카오 OAuth" + "로그인/로그아웃 UI + 세션 컨텍스트").
리뷰 작성·수정·삭제는 다음 덩이(C) — 이번엔 "로그인한 사용자가 누구인지 서버가 안다"까지만.

## 범위 밖

- **리뷰 작성·수정·삭제(`POST`/`PATCH`/`DELETE /api/reviews`)** — 덩이 C. 세션만 있으면
  된다는 걸 검증하려고 `GET /api/me`(내 정보 확인용)까지만 이번에 넣는다.
- **신고 API·rate limit** — 덩이 C.
- **회원 탈퇴** — 범위 밖. 로그아웃만.
- **다른 소셜 로그인(구글 등)** — 카카오 하나만.
- **Remember me / 자동 로그인 연장** — 세션 만료(고정 TTL)면 재로그인.
- **동시 로그인 기기 수 제한** — 세션은 여러 개 동시에 존재할 수 있다(기기별 로그아웃 미지원).

## 수용 기준

**OAuth 플로우 + 세션 발급** (외부 API를 인터페이스로 주입받는 단위 테스트, 네트워크 불필요)

- [x] AC1: 카카오 프로필로 신규 사용자면 `users`에 새로 만들고, 기존 `kakaoId`면 닉네임·
      프로필 이미지를 최신값으로 갱신한다(재로그인 시 카카오 쪽 정보 변경 반영).
- [x] AC2: 로그인이 성공하면 세션이 발급되고, 응답에 `Set-Cookie`가 HttpOnly·SameSite로 붙는다.
- [x] AC3: `state` 파라미터가 발급 시 저장한 값과 다르면 콜백을 거부한다(CSRF 방지) —
      카카오 토큰 교환을 시도하지 않는다.
- [x] AC4: 카카오 토큰 교환(코드 → 액세스 토큰)이 실패하면(잘못된 코드 등) 로그인이 거부되고
      세션이 만들어지지 않는다.

**세션 확인 · 로그아웃** (API 단위 테스트, DB는 fake)

- [x] AC5: 유효한 세션 쿠키로 `GET /api/me`를 부르면 200과 함께 `{ id, nickname, profileImageUrl }`
      를 반환한다.
- [x] AC6: 세션 쿠키가 없거나 만료된 세션이면 `GET /api/me`는 401을 반환한다.
- [x] AC7: `POST /api/auth/logout`을 부르면 세션이 무효화되고, 이후 같은 쿠키로 `GET /api/me`는
      401이 된다.

**프론트엔드** (브라우저 실행으로 확인)

- [x] AC8: 비로그인 상태에서 로그인 버튼이 보이고, 누르면 카카오 로그인 화면으로 이동한다.
- [x] AC9: 로그인 완료 후 앱으로 돌아오면 로그인 버튼 대신 닉네임(또는 로그아웃 버튼)이 보인다.
- [x] AC10: 로그아웃을 누르면 다시 로그인 버튼이 보이고, 새로고침해도 로그인 상태로 안 돌아온다.

## 검증 방법

AC1~AC7은 Vitest(가짜 카카오 클라이언트·가짜 repository)로 자동화했다 — api 27개 테스트
신규(authService 9 + authRoutes 5 + userRepository 통합 3 + 기존 파일 보강), web 9개
신규(authApi 5 + useSession 4). 게이트 5종 + turbo --force 캐시 우회 재검증 통과.

AC8~AC10은 실제 카카오 계정으로 로그인해야 해서 브라우저로 직접 확인했다
(다른 PC에서 이어받은 세션 — 아래 실행 결과 참고).

### 부수적으로 고친 안전장치 — 통합 테스트가 시딩 DB를 지운 사고 재발 방지

이번 기능을 구현하며 `userRepository` 통합 테스트를 추가하는 시점에, 기존 통합 테스트
(`officeRepository.test.ts`·`reviewRepository.test.ts`)가 `DATABASE_URL`(시딩 데이터가
든 개발 DB)을 그대로 읽던 걸 발견했다 — 바로 며칠 전 이 변수로 시딩 데이터가 지워진
사고가 있었다(`docs/decisions.md` #8). 셋 다 `TEST_DATABASE_URL` 이라는 별도 변수만
읽도록 바꾸고(`__tests__/helpers/testDb.ts`), 같은 서버에 `app_test` 라는 전용 DB를
만들어 거기에만 돌아가게 했다. `DATABASE_URL=... vitest run` 을 실수로 쳐도 이제 통합
테스트는 그 값을 아예 보지 않아 자동 skip된다 — 규칙이 아니라 구조로 막는다.

## 실행 결과 (다른 PC → 이 세션으로 이어받아 브라우저 검증)

- **AC8**: 로그인 버튼 클릭 → 실제 `accounts.kakao.com` 카카오 계정 화면으로 정상 이동.
- **콘솔 설정 오류 2단계를 실제로 겪고 순서대로 풀었다** (둘 다 사용자가 콘솔에서 처리,
  Claude는 콘솔 로그인이 필요해 대신 할 수 없었다):
  1. `KOE006`(앱 관리자 설정 오류) — **카카오 로그인 활성화 설정**이 꺼져 있었다. 켠 뒤 재시도.
  2. 그 다음 뜬 `KOE205`(잘못된 요청) — 아래 실제 버그를 고치며 명시적으로 `scope`를
     요청하게 되자 드러났다. **동의항목에 닉네임·프로필 사진 자체가 설정돼 있지 않았다.**
     콘솔 → 카카오 로그인 → 동의항목에서 켠 뒤 재시도해 해결.
- **실제 버그 발견·수정: 닉네임이 항상 "카카오 사용자" 폴백으로만 나왔다.**
  `buildAuthorizeUrl`이 `scope` 파라미터 없이 인가를 요청하고 있었다 — 콘솔의 "필수 동의"
  기본값에 조용히 기대는 코드였다. 처음 로그인 성공 시(AC9 최초 확인) 실제로 닉네임 대신
  fallback 문자열만 떴다. `scope=profile_nickname,profile_image`를 명시적으로 요청하도록
  고치고 `kakaoOAuthClient.test.ts` 신규 추가(2건) — 이후 재로그인에서 동의 화면에
  "(필수) 닉네임, 프로필 사진"이 정확히 뜨고, 앱에 실제 닉네임("유상훈")이 표시됨을 확인했다.
  **위 KOE205는 이 수정이 콘솔 설정의 숨은 결함을 드러낸 것** — scope를 생략한 채였다면
  계속 조용히 fallback만 쓰고 아무도 몰랐을 것이다.
- **AC9·AC10 재확인**: 로그아웃 → 즉시 로그인 버튼으로 복귀 → 새로고침해도 로그인 상태
  안 돌아옴 → `GET /api/me` 401, 쿠키 빈 값까지 확인.
- 이번에도 카카오 도메인 미등록으로 3000에서 검증(`docs/decisions.md` #7). 원본 `app-web`을
  잠시 내렸다가 복구.
- **부수 확인**: 이 세션은 다른 머신이라 `.env`가 비어 있어 API 서버가 아예 부팅되지 않는
  상태로 시작했다 — `KAKAO_OAUTH_CLIENT_ID`·`KAKAO_OAUTH_CLIENT_SECRET`이 `serverEnvSchema`에
  필수값(기본값 없음)으로 추가돼 있어서다. 사용자가 값을 채운 뒤 정상 기동 확인.
  같은 김에 성남시 실시딩도 재실행(2273건 → 1913건, 이전 결과와 일치).

## 영향 범위

- **만질 파일**
  - `apps/api/src/db/schema.ts` — `sessions` 테이블 추가 (열린 질문 #2에 따라 확정)
  - `apps/api/drizzle/000X_*.sql` (신규 마이그레이션)
  - `apps/api/src/lib/kakaoOAuthClient.ts` (신규) — 토큰 교환·프로필 조회 어댑터
  - `apps/api/src/services/authService.ts` (신규) — 콜백 오케스트레이션(교환→upsert→세션)
  - `apps/api/src/repositories/userRepository.ts`, `sessionRepository.ts` (신규)
  - `apps/api/src/routes/auth.ts` (신규) — `/auth/kakao`(리다이렉트), `/auth/kakao/callback`,
    `/api/me`, `/api/auth/logout`
  - `apps/api/src/app.ts` — 라우트 등록, CORS를 특정 origin + `credentials: true`로 좁힘
    (이미 주석으로 예고돼 있었음)
  - `apps/web/hooks/useSession.ts` (신규) — 세션 컨텍스트
  - `apps/web/components/LoginButton/`, `apps/web/app/layout.tsx` 또는 지도 화면에 배치
  - `packages/env/src/index.ts` — OAuth 관련 서버 env 추가
  - `.env.example`
- **새 의존성**: 없음(fetch 내장). 세션 쿠키 서명이 필요 없다면(열린 질문 #2 참고) 추가 패키지 불필요.
- **기존 기능 영향**: `app.ts`의 CORS가 넓은 허용(`cors()` 기본값)에서 특정 origin으로 좁아진다 —
  기존 공개 API(offices)는 인증이 없으니 영향 없어야 하지만, CORS 테스트(`cors.test.ts`)는
  origin을 명시적으로 넣어 다시 통과하는지 확인해야 한다.

## 열린 질문 (해소됨 — 2026-08-20)

1. **콜백 위치** → API(8788). `GET /auth/kakao/callback`이 토큰 교환·DB 쓰기·세션 발급을
   하고 마지막에 web(`http://localhost:3000/`)으로 302 리다이렉트한다.
   **콘솔에 등록할 Redirect URI: `http://localhost:8788/auth/kakao/callback`** (사용자 액션).
2. **세션 저장** → DB 세션 테이블. `sessions(id, user_id, expires_at)`, 쿠키엔 불투명
   랜덤 토큰만 — 로그아웃 즉시 무효화되고 새 시크릿 관리가 없다.
3. **Client Secret** → **켜져 있음.** 토큰 교환 요청에 `client_secret`을 함께 보낸다.
   값은 `.env`의 `KAKAO_OAUTH_CLIENT_SECRET`로 받는다(사용자가 콘솔에서 가져와 채워야 함).
4. **로그인 후 리다이렉트** → 항상 `/`(홈)으로 고정.
