# 명세: 회원 탈퇴 + 리뷰 익명화

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

Phase 9(마이페이지)의 나머지 절반. `mypage-shell-and-profile` 명세(2026-08-26,
`e2127f0`)에서 스키마 마이그레이션이 필요하다는 이유로 분리해뒀던 두 기능을 구현한다:

1. `/mypage/settings` 페이지 — 로그아웃 + 회원 탈퇴 UI.
2. `DELETE /api/users/me` — 회원 탈퇴. 계정은 즉시 삭제되지만 **작성한 리뷰는 남기고
   작성자만 익명화**한다(원본과 동일한 정책 — 리뷰는 "그 사무소를 이용한 경험"이라는
   공개 정보로 취급하고, 계정 존재 여부와 분리한다).

원본(`apps/api/src/db/schema.ts`)의 `authorUserId`가 `.notNull()` 없이
`onDelete: "set null"`로 선언돼 있음을 직접 확인했다(통제변인 — 인터페이스만 참조).
이 저장소의 `reviews.userId`는 현재 `notNull()` + `onDelete: "cascade"`라 탈퇴 시 리뷰가
통째로 사라진다 — 정책이 다르므로 스키마부터 바꿔야 한다.

## 범위 밖

- **탈퇴 유예 기간(soft delete, N일 후 완전 삭제)** — 원본에 없다. 즉시 hard delete.
- **탈퇴 사유 설문** — 원본에 없다.
- **재가입 시 이전 리뷰 복구/연결** — 카카오 재로그인은 새 `users` row를 만들 뿐 과거
  익명화된 리뷰와 다시 연결할 방법이 없다(연결할 식별자를 일부러 안 남긴다). 의도된 동작.
- **탈퇴한 사용자의 리뷰에 달린 "도움돼요"/신고 기록 보존** — 아래 설계 메모에서
  CASCADE로 정리하기로 결정. 별도 익명화 없음.
- **관리자가 탈퇴 처리를 대행하는 기능** — 본인 탈퇴만.
- **비밀번호/이메일 재확인 등 추가 인증 단계** — 카카오 세션 자체가 이미 인증이다.
  원본도 확인 모달 하나로 끝낸다.

## 수용 기준

**스키마 마이그레이션**

- [x] AC1: `reviews.user_id`가 nullable로 바뀌고 FK가 `ON DELETE SET NULL`이 된다
      (기존 `ON DELETE CASCADE`에서 변경).
- [x] AC2: `review_reports.reporter_user_id`, `review_helpful_votes.user_id`는
      `ON DELETE CASCADE` 그대로 유지한다(아래 설계 메모).
- [x] AC3: 마이그레이션 적용 후에도 기존 `unique(office_id, user_id)` 제약은 그대로 —
      `user_id`가 NULL인 리뷰가 여러 건이어도 서로 유니크 위반이 나지 않는다(Postgres는
      NULL끼리 다른 값으로 취급).

**계정 삭제** (`DELETE /api/users/me`)

- [x] AC4: 세션 없이 요청하면 401.
- [x] AC5: 정상 요청 시 `users` row가 실제로 삭제되고 204를 반환한다.
- [x] AC6: 삭제 성공 시 세션 쿠키도 지운다(로그아웃 라우트와 동일하게 `deleteCookie`) —
      DB의 `sessions` row는 `onDelete: cascade`로 이미 함께 사라지지만, 브라우저 쿠키
      자체는 별도로 지워야 클라이언트가 즉시 "로그아웃 상태"로 보인다.
- [x] AC7: 탈퇴한 사용자가 작성했던 리뷰는 삭제되지 않고 그대로 남는다 —
      `GET /api/offices/:id/reviews` 등 공개 목록에서 계속 조회된다.
- [x] AC8: 남은 리뷰의 `author.nickname`은 고정 문구 `"탈퇴한 사용자"`로,
      `author.profileImageUrl`은 `null`로 나온다(원본은 리뷰에 작성자 닉네임을 공개
      노출하지 않아 참조할 인터페이스가 없음 — 아래 설계 메모에서 독자적으로 정한 값).
- [x] AC9: 탈퇴 후 남은 리뷰는 더 이상 아무도 수정/삭제/신고 대상 소유자로 판정되지
      않는다 — 예: 다른 계정으로 로그인해도 그 리뷰에 대한 `isOwner`류 판정(수정/삭제
      버튼 노출)이 항상 false.
- [x] AC10: 탈퇴한 사용자가 다른 리뷰에 남긴 "도움돼요" 투표(`review_helpful_votes`)는
      함께 삭제되고, 그 리뷰의 `helpfulCount`는 그만큼 즉시 감소한다(COUNT 기반 집계라
      추가 코드 없이 자연히 반영됨 — 회귀 확인만 필요).
- [x] AC11: 탈퇴한 사용자가 남긴 신고 기록(`review_reports`)도 함께 삭제된다 — 단,
      **이미 숨김 처리된 리뷰는 계속 숨김 상태 유지**(신고 삭제로 카운트가 줄어도
      `hidden_at`을 되돌리지 않는다 — 숨김은 처리 당시 임계치 도달로 확정된 상태다).

**프런트엔드** (`/mypage/settings`)

- [x] AC12: `/mypage` 레이아웃의 탭에 "설정"이 추가되고 `/mypage/settings`로 이동한다.
- [x] AC13: 로그아웃 버튼 — 기존 헤더의 로그아웃과 동일하게 동작(세션 종료 후 홈으로).
- [x] AC14: "회원 탈퇴" 버튼을 누르면 확인 모달이 뜬다. 모달에는 "탈퇴 시 계정이 즉시
      삭제되며, 작성한 리뷰는 익명으로 남는다"는 안내 문구가 있다.
- [x] AC15: 모달에서 취소하면 아무 일도 일어나지 않는다.
- [x] AC16: 모달에서 확정하면 `DELETE /api/users/me` 호출 → 성공 시 세션 정리 후 홈(`/`)
      으로 이동한다.
- [x] AC17: 탈퇴 요청이 실패하면(네트워크 오류 등) 모달에 에러 메시지를 보여주고 로그인
      상태를 유지한다(원본과 동일 — 실패 시 그대로 둔다).
- [x] AC18: 처리 중에는 버튼이 비활성화되고 "처리 중..." 등 로딩 표시가 있다(중복 클릭
      방지).

## 영향 범위

- **만질 파일**
  - `apps/api/drizzle/` — 신규 마이그레이션 SQL. `reviews.user_id`
    `DROP NOT NULL` + FK `DROP CONSTRAINT` 후 `ADD CONSTRAINT ... ON DELETE SET NULL`로
    재생성.
  - `apps/api/src/db/schema.ts` — `reviews.userId`에서 `.notNull()` 제거,
    `onDelete: "cascade"` → `onDelete: "set null"`. 타입이
    `uuid | null`로 바뀌므로 이를 참조하는 곳(`IReviewOwnedRow` 등) 타입 전파 확인.
  - `apps/api/src/repositories/reviewRepository.ts` — `findByOfficeId`·`findHidden`·
    `restore` 세 곳의 `.innerJoin(users, eq(reviews.userId, users.id))`를
    `.leftJoin(...)`으로 변경(안 바꾸면 INNER JOIN이 `user_id IS NULL` 행을 통째로
    걸러내 익명화된 리뷰가 목록에서 사라짐 — AC7 위반). `findByUserId`(내 리뷰 목록)는
    본인 리뷰만 다뤄 users 조인이 없으므로 무관.
  - `apps/api/src/services/reviewService.ts` — `toReviewWithAuthor` 계열 매핑 함수에서
    `row.userId ?? row.nickname`이 null인 경우 `{ nickname: "탈퇴한 사용자",
    profileImageUrl: null }`로 치환하는 분기 추가. 소유자 판정(`review.userId ===
    requestingUserId`) 로직은 `userId`가 `null`이면 자연히 항상 false라 별도 분기 불필요.
  - `apps/api/src/services/authService.ts` — `IUserRepository`에 `delete(id): Promise<void>`
    추가.
  - `apps/api/src/repositories/userRepository.ts` — `delete` 구현(`db.delete(users).where(eq(users.id, id))`).
  - `apps/api/src/routes/users.ts` — `DELETE /me` 라우트 추가(`requireAuth` +
    `deleteCookie(c, SESSION_COOKIE_NAME)` + `userRepository.delete`).
  - `apps/web/hooks/useSession.ts` — `deleteAccount(): Promise<void>` 추가(`logout`과
    동일한 형태: API 호출 후 `setUser(null); setStatus("unauthenticated")`).
  - `apps/web/lib/authApi.ts` — `deleteAccountRequest()` 추가(`DELETE /api/users/me`,
    `credentials: "include"`).
  - `apps/web/app/mypage/layout.tsx` — `TABS`에 `{ href: "/mypage/settings", label: "설정" }`
    추가.
  - `apps/web/app/mypage/settings/page.tsx`(신규) — 로그아웃/탈퇴 버튼 + 확인 모달.
  - 신규/수정 테스트: `apps/api/src/__tests__/unit/usersRoute.test.ts`(신규 또는 기존
    확장), `reviewService.test.ts`(익명화 매핑), `reviewRepository.test.ts`(통합 —
    탈퇴 후 리뷰 잔존·조인 회귀), `apps/web/__tests__/mypage/settings.test.tsx`(신규).
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존 리뷰(모두 `user_id NOT NULL`)는 마이그레이션으로 값이
  바뀌지 않는다 — 컬럼 제약만 완화. `findByOfficeId`의 `leftJoin` 전환은 기존 데이터에
  대해서는 `innerJoin`과 결과가 동일하다(모든 기존 리뷰가 유효한 `user_id`를 가짐).

## 설계 메모

- **`review_reports`/`review_helpful_votes`는 SET NULL이 아니라 CASCADE로 유지하는 이유
  (AC2, AC10, AC11)**: 이 둘은 원본에 없는 이 저장소 고유 기능이라 참조할 원본 인터페이스가
  없다 — 독자적으로 결정했다. `helpfulCount`/`reportCount`는 둘 다
  `findHelpfulCountsByReviewIds`/`hideIfThresholdReached`에서 매번 `COUNT(*)` 서브쿼리로
  다시 계산하는 구조(`review-helpful-toggle`·`review-write-and-report` 설계 메모)라,
  기록 자체가 사라져도 집계가 자동으로 맞아떨어진다. `user_id`를 SET NULL로 남기면
  "탈퇴한 사용자가 누른 도움돼요"처럼 식별자 없는 유령 행이 계속 카운트에 영향을 주는데,
  이건 지킬 이유가 없는 정보다(누가 신고했는지 익명으로 남겨봤자 모더레이션에 쓸모없음).
  삭제가 더 단순하고 부작용도 없다.
- **숨김 상태는 신고 기록이 사라져도 되돌리지 않는 이유(AC11)**: `admin-hidden-reviews`
  명세(덩이 J)에서 이미 "복구해도 신고 기록은 안 지운다"는 반대 방향 트레이드오프를
  정했다. 여기서도 같은 원칙의 반대쪽을 적용한다 — `hidden_at`은 "그 시점에 임계치에
  도달했다"는 사실의 기록이지, 현재 신고 수의 실시간 함수가 아니다. 신고자 탈퇴로 카운트가
  줄었다고 자동 복구하면 악용 여지가 생긴다(신고 후 바로 계정 탈퇴를 반복해 숨김을 피하는
  패턴). 복구는 여전히 관리자의 명시적 액션(`POST /admin/reviews/:id/restore`)으로만.
- **익명 작성자 표시 문구 `"탈퇴한 사용자"`(AC8)**: 원본은 리뷰에 작성자 닉네임을 공개
  노출하지 않는다(`ReviewList.tsx`에 `isOwner` 판정용 `authorUserId` 비교만 있고, 화면에
  닉네임을 렌더링하는 코드가 없음 — 직접 확인). 반면 이 저장소는 `reviewAuthorSchema`
  (`nickname`, `profileImageUrl`)를 처음부터(`reviews-schema-and-read-api` 명세) 공개
  응답에 포함해왔다 — 이미 여러 화면이 의존하는 기존 설계라 지금 바꾸지 않는다. 따라서
  탈퇴 계정의 표시 문구는 원본에 참조할 대상이 없어 독자적으로 정한다. `reviewAuthorSchema.
  nickname`이 `z.string()`(non-nullable)이라 스키마 변경 없이 고정 문자열을 채우는 쪽이
  가장 단순하다.
- **`DELETE /api/users/me`가 존재 확인 없이 바로 삭제하는 이유**: 원본
  (`users.service.ts`)은 `findById` → 없으면 `UserNotFoundError` → 있으면 삭제, 2단계다.
  이 저장소는 `requireAuth` 미들웨어가 이미 세션→유저 조회를 마친 뒤 `authUser`를
  컨텍스트에 심어준다 — 라우트에 진입한 시점에 유저 존재가 이미 보장돼 있어 원본과 같은
  존재 확인 단계가 불필요한 중복이다(기존 `PATCH /me`도 같은 이유로 존재 확인을 안 한다).
- **탈퇴 확인 모달 문구는 원본 카피를 그대로 쓰지 않고 재작성**: 원본 화면 텍스트
  ("정말 탈퇴하시겠습니까?" 등)를 직접 봤지만, 통제변인 원칙(구현 코드·워딩 비복사,
  인터페이스만 참조)에 따라 이 저장소 자체 문구로 새로 쓴다. "확인 모달 + 안내 문구 +
  취소/확정 버튼"이라는 인터랙션 구조만 원본과 동일하게 따른다.

## 열린 질문

없음 — SET NULL 대상 범위(리뷰만)·익명 표시 문구·신고/도움돼요 처리 방식(CASCADE)·
확인 모달 유무 전부 위 설계 메모에서 확정했다.

## 실행 결과 (2026-08-27)

- **AC1~18 전부 확인.** 마이그레이션(`0007_pink_satana.sql`) → 백엔드(스키마 타입·
  repository·service·route) → 프런트엔드(hook·api·layout·페이지) 순으로 구현하고,
  각 계층에 새 테스트를 추가했다: `reviewRepository.test.ts`(통합) 5개, `reviewService.
  test.ts`(단위) 4개, `usersRoute.test.ts`(단위) 3개, `useSession.test.ts` 1개,
  `MyPageLayout.test.tsx` 1개, `MyPageSettings.test.tsx`(신규) 6개.
- **Red 확인**: `toReview`의 익명화 분기, `DELETE /api/users/me` 라우트(사용자 삭제·
  세션 무효화), `useSession.deleteAccount`, `/mypage/settings` 페이지 전체는 구현
  전에 테스트를 먼저 돌려 실패를 확인했다(마지막 항목은 파일 자체가 없어 import
  에러로 Red). 소유권 판정(update/remove/report가 `userId: null`을 이미 자연히
  거부/허용하는 부분)은 기존 로직이 우연히 이미 맞는 케이스라 — 사후에 로직을
  일부러 깨서(임시로 되돌려서) 테스트가 실제로 잡아내는지 확인한 뒤 원복했다
  (`toReview` 익명화 분기, `DELETE /me` 라우트 본문 둘 다 이 방식으로 검증).
- **leftJoin 전환이 실제로 필요했음을 통합 테스트로 확인**: `findByOfficeId`·
  `findHidden`·`restore`의 `innerJoin(users, ...)`을 `leftJoin`으로 안 바꾸면
  탈퇴한 작성자의 리뷰가 목록에서 통째로 사라지는 것을 실 Postgres로 재현·수정
  확인했다(AC7 통합 테스트).
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 새 마이그레이션을 적용한 뒤
  `reviewRepository.test.ts` 39개(기존 34 + 신규 5) 전부 통과 — 사용자 삭제 후 리뷰
  잔존·`user_id NULL` 유니크 무충돌·공개 목록 노출 지속·도움돼요 투표 CASCADE로
  helpfulCount 자동 감소·신고자 전원 탈퇴해도 숨김 상태 유지를 실제 FK 동작으로
  검증했다. `officeRepository`·`userRepository` 통합 테스트 포함 전체 51개 통과 —
  기존 테이블에는 영향 없음을 확인했다.
- **개발 DB 스모크 테스트**: `bun run db:migrate`로 개발 DB에도 마이그레이션 적용 후
  `bun run --cwd apps/api dev` 서버에 직접 curl — 임시 사무소·사용자·리뷰·세션을
  DB에 직접 심고 `DELETE /api/users/me` 호출 → 204 + `set-cookie: session_id=;
  Max-Age=0` 확인, 이후 `GET /api/me` 401 확인, `GET /api/offices/:id/reviews`에서
  해당 리뷰가 `author.nickname: "탈퇴한 사용자"`로 계속 노출됨을 확인. 테스트 데이터는
  종료 후 전부 정리했다(세션은 CASCADE로 이미 삭제됨을 확인).
- **스타일린트에서 발견한 갭 1건(버그 아님)**: 확인 모달의 반투명 배경에 쓸 색상
  토큰이 `tokens.css`에 없어(원시값 rgb() 사용 시 stylelint error) `--color-overlay`
  토큰을 `tokens.css`·`tokens.ts` 양쪽에 새로 추가했다.
- **네이밍 컨벤션 위반 1건 수정**: `fakeAuthDeps.ts`의 테스트용 지역변수
  `deleted`(boolean)가 `is/has/...` 접두사 규칙을 위반해 `isDeleted`로 수정.
- **하네스 게이트**: `node .harness/gates/run-checks.mjs` 전체 통과
  (typecheck → lint → stylelint → test → build). `apps/web/.next` 캐시가 새 라우트
  등록 전 상태로 남아있어 typecheck가 한 번 실패했다 — 기존에 문서화된 동일 원인
  (로컬 dev 서버 실행 이력의 stale `.next/types` 캐시)이라 `rm -rf apps/web/.next`로
  해결, 실제 코드 결함 아님.
