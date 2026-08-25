# 명세: 관리자 — 숨김 리뷰 목록 + 복구

- 작성일: 2026-08-25
- 상태: 구현됨

## 목표

원본과 실제 코드를 대조해 발견한 리뷰 모델 격차(`docs/decisions.md` #9)를 좁히는 마지막
덩이(J). 원본은 신고 누적으로 숨겨진 리뷰를 관리자가 목록으로 확인하고 필요하면 복구할 수
있다(`x-admin-api-key` 헤더 인증, admin web UI 없이 API만). 이 저장소엔 신고 5건 누적 시
자동 숨김(덩이 C)은 있지만, 무엇이 숨겨졌는지 확인하거나 되돌릴 방법이 전혀 없다 — 한 번
숨겨지면 영구적이다. 이 명세로 Phase 1 격차 보완(덩이 E~J)이 전부 끝난다.

## 범위 밖

- **Admin web UI** — 원본도 없다. API만.
- **역할 기반 접근 제어**(사용자 테이블에 role 컬럼 등) — 원본처럼 단순 API 키 헤더로
  충분하다. 신뢰된 운영자만 이 키를 아는 것을 전제한다.
- **숨김 리뷰 완전 삭제(hard delete)** — 복구 아니면 그대로 둔다. "진짜 삭제"는 별도 기능.
- **신고 사유별 필터·검색** — 목록·복구만.
- **관리자 액션 감사 로그·rate limit** — 원본에도 없다.
- **`ADMIN_API_KEY` 미설정 시 서버 부팅 자체를 막기** — 다른 필수 env(카카오 키 등)와
  달리 선택값으로 둔다. 관리자 기능을 아직 안 쓰는 배포도 있을 수 있고, 그 경우 admin
  라우트만 503으로 막히면 충분하다(원본과 동일한 "설정 안 됨" 처리, 설계 메모 참고).

## 수용 기준

**계약 (`packages/types`)**

- [x] AC1: 숨김 리뷰 응답 항목은 기존 리뷰 필드 전부 + `officeName`(문자열) +
      `reportCount`(누적 신고 수, 정수) + `hiddenAt`(숨겨진 시각, ISO datetime 문자열)을
      포함한다.

**인증** (`requireAdmin` 미들웨어, 아래 두 라우트 공통)

- [x] AC2: 서버에 `ADMIN_API_KEY`가 설정되지 않았으면 헤더 유무와 무관하게 503.
- [x] AC3: `ADMIN_API_KEY`는 설정됐지만 요청에 `x-admin-api-key` 헤더가 없거나 값이 다르면
      403.
- [x] AC4: 올바른 `x-admin-api-key` 헤더를 주면 통과한다.

**목록** (`GET /api/admin/reviews/hidden`)

- [x] AC5: 숨겨진 리뷰만 반환한다 — 노출 중인 리뷰는 섞이지 않는다.
- [x] AC6: 각 항목에 `officeName`·`reportCount`·`hiddenAt`이 정확히 채워진다.
- [x] AC7: 숨겨진 리뷰가 없으면 빈 배열(에러 아님).
- [x] AC8: 커서 페이지네이션 — 기존 리뷰 목록과 같은 방식(작성일 최신순, `nextCursor`).

**복구** (`POST /api/admin/reviews/:id/restore`)

- [x] AC9: 존재하지 않는 리뷰 id면 404.
- [x] AC10: 이미 노출 중인(숨겨지지 않은) 리뷰를 복구하려 하면 409.
- [x] AC11: 정상 복구되면 200과 함께 갱신된 리뷰(`hiddenAt: null`인 상태 — 응답은 일반
      `reviewSchema` 모양)를 반환한다.
- [x] AC12: 복구 후에는 공개 목록(`GET /api/offices/:id/reviews`)에 다시 나타난다
      (`hiddenAt` 필터 로직이 그대로 재사용됨을 회귀 확인).
- [x] AC13: 복구해도 기존 신고 기록(`review_reports`)은 지우지 않는다 — 신고 개수 자체는
      그대로 남는다(설계 메모의 트레이드오프 참고).

## 영향 범위

- **만질 파일**
  - `packages/env/src/index.ts` — `serverEnvSchema`에 `ADMIN_API_KEY: z.string().min(1).optional()`
    추가.
  - `.env.example` — `ADMIN_API_KEY=` 주석과 함께 추가.
  - `packages/types/src/review.ts` — `adminHiddenReviewSchema`(`reviewSchema` 확장),
    `adminHiddenReviewListResponseSchema`.
  - `apps/api/src/middleware/requireAdmin.ts`(신규) — `x-admin-api-key` 헤더 검증. 원본과
    달리 전역 `getEnv()`를 부르지 않고 `adminApiKey: string | undefined`를 deps로 주입받는다
    (이 저장소의 기존 DI 패턴 — `webBaseUrl`·`isProduction`과 같은 자리, `index.ts`가
    조립 지점).
  - `apps/api/src/repositories/reviewRepository.ts` — `findHidden(limit, after?)`
    (`reviews ⋈ offices` + `review_reports` count 서브쿼리, `hiddenAt is not null`),
    `restore(reviewId): Promise<IReviewOwnedRow | null>`.
  - `apps/api/src/services/reviewService.ts` — `ReviewAlreadyVisibleError`,
    `listHidden({limit, cursor})`, `restore(reviewId)`.
  - `apps/api/src/routes/admin.ts`(신규) — `GET /reviews/hidden`, `POST /reviews/:id/restore`,
    둘 다 `requireAdmin`.
  - `apps/api/src/app.ts` — `/api/admin` 마운트, `IAppDeps`에 `adminApiKey?: string` 추가.
  - `apps/api/src/index.ts` — `env.ADMIN_API_KEY`를 `adminApiKey`로 전달.
  - 신규 테스트: `apps/api/src/__tests__/unit/adminReviewsRoute.test.ts`,
    `reviewService.test.ts`·`reviewRepository.test.ts`(통합)에 케이스 추가.
- **새 의존성**: 없음.
- **기존 기능 영향**: `ADMIN_API_KEY`를 설정하지 않은 기존 배포(로컬 개발 포함)는
  admin 라우트가 항상 503을 반환할 뿐 다른 동작에 영향 없음. `GET /api/offices/:id/reviews`는
  무변경(AC12는 기존 필터 로직의 회귀 확인용).

## 설계 메모

- **`ADMIN_API_KEY`를 deps로 주입하는 이유**: 원본은 미들웨어 안에서 전역 `getEnv()`를
  직접 호출한다. 이 저장소는 지금까지 모든 라우트가 `createApp(deps)`로 의존성을 주입받는
  패턴을 지켜왔다(`webBaseUrl`·`isProduction`과 동일) — 단위 테스트가 실제 env 없이 라우트를
  돌릴 수 있어야 하기 때문이다. 여기서만 예외를 두면 이 파일만 env 유무에 따라 테스트
  결과가 달라진다.
- **미설정 시 503, 설정 후 헤더 불일치 시 403을 구분하는 이유**: "관리자 기능이 아예 꺼져
  있음"과 "권한이 없음"은 다른 상황이다. 503은 배포 설정 문제(운영자가 고칠 일), 403은
  요청자 문제(잘못된 키)라 원인 파악이 빨라진다 — 원본의 구분을 그대로 따른다.
- **정렬은 hiddenAt이 아니라 createdAt 기준(AC8)**: 기존 커서 유틸(`lib/cursor.ts`)이
  `(createdAt, id)` 조합에 고정돼 있다. "최근에 숨겨진 순"이 모더레이션 큐로는 더
  자연스러울 수 있지만, 이거 하나를 위해 커서 유틸을 제네릭하게 바꾸는 비용이 이득보다
  크다고 판단해 기존 정렬(작성일 최신순)을 그대로 쓴다.
- **복구해도 신고 기록을 지우지 않는 트레이드오프(AC13)**: `hideIfThresholdReached`는
  `(select count(*) from review_reports where review_id=?) >= threshold`를 매번 다시
  계산한다(`review-write-and-report` 설계 메모). 신고 기록을 안 지우면, 복구된 리뷰는
  신고 수가 이미 임계치 이상인 채로 남아 있어 **새 신고가 단 1건만 더 들어와도 즉시
  재숨김된다** — 5건을 다시 채울 필요가 없다. 원본도 복구 시 신고 기록을 지우지 않아 같은
  특성을 가진다. 의도적으로 그대로 둔다: "한 번만 더 기회를 준다"는 관리자 판단을 존중하되,
  재범(추가 신고)에는 즉시 반응하는 쪽이 안전한 기본값이라고 판단했다.
- **본인 리뷰 제한이 없는 것과 같은 이유로 admin 라우트엔 세션 인증이 아예 없다**: 관리자는
  서비스 사용자가 아니라 운영자다 — 카카오 로그인 세션 체계와 무관한 별도 인증 수단(API
  키)이 원본에서도 맞는 선택이었고 그대로 따른다.

## 열린 질문

없음 — 정렬 기준(createdAt 유지)·복구 시 신고 기록 처리(유지)·인증 방식(API 키 헤더)
전부 기존 코드베이스 패턴과 원본 인터페이스를 근거로 확정했다.

## 실행 결과 (2026-08-25)

- **AC1~13 전부 확인.** 계약·env·미들웨어·리포지토리·서비스·라우트를 먼저 세운 뒤
  새 테스트 21개(`adminReviewsRoute.test.ts` 12개 + `reviewService.test.ts` 5개 + 통합
  4개) 작성 — 이미 구현이 앞서 있던 터라 즉시 통과했는데, AC10(이미 노출 중인 리뷰
  복구 시도 → 409) 검증 로직을 일부러 깨서 테스트가 실제로 실패하는지 확인한 뒤
  원복했다(Red를 사후 검증).
- **테스트 작성 중 실수 2건 발견·수정**(구현 버그 아님):
  - 구조분해 기본값(`{ adminApiKey = ADMIN_KEY }`)이 "생략"과 "명시적 `undefined`"를
    구분하지 못해 `buildApp({ adminApiKey: undefined })`로 "관리자 기능 꺼짐"을
    표현하려던 테스트가 조용히 `ADMIN_KEY`로 되돌아가는 문제 — 기본값을 없애고 호출부가
    항상 명시하도록 고쳤다. 헤더 값에 비ASCII 문자("아무값" 등)를 쓰면 Fetch API의
    ByteString 제약에 걸려 즉시 예외가 난다는 것도 이때 발견해 ASCII 값으로 바꿨다.
  - `repository.restore`/`toggleHelpful` override를 plain async 함수로 넘겨
    `toHaveBeenCalledWith` 단정이 "스파이가 아니다"로 실패 — `vi.fn()`으로 감쌌다.
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 새 케이스 4개(officeName·
  reportCount·hiddenAt 정확성, 빈 목록, 복구 후 공개 목록 재노출, 복구해도 신고 기록
  유지) 포함 33개 전부 통과 — `review_reports` 서브쿼리 카운트와 `reviews ⋈ offices ⋈
  users` 조인이 실제 Postgres에서 정확함을 확인했다.
- **개발 DB 스모크 테스트**: 로컬 `.env`에 임시 `ADMIN_API_KEY`를 채우고(스모크 종료 후
  제거 — 기본값 "관리자 기능 꺼짐" 상태로 되돌림) `bun run dev` 서버에 직접 curl:
  - 인증 없이 목록 조회 → 403.
  - 리뷰 작성 → 신고 5건 시뮬레이션(직접 DB 삽입) → `hidden_at` 설정 → 관리자 목록에서
    `officeName`·`reportCount: 5`·`hiddenAt` 정확히 확인.
  - 존재하지 않는 리뷰 복구 → 404.
  - 정상 복구 → 200, 이후 재복구 시도 → 409.
  - 복구 후 공개 목록(`GET /api/offices/:id/reviews`)에 다시 나타남을 확인(AC12).
  - DB에서 `review_reports` 5건이 복구 후에도 그대로 남아있음을 직접 확인(AC13).
  스모크로 만든 리뷰·신고·가짜 신고자 계정·세션 행은 종료 후 전부 직접 삭제했다.
- **버그 없음(구현 자체)**: 실제 런타임 버그는 발견되지 않았다 — 위 2건은 전부 테스트
  코드 자체의 실수였다.
- **Phase 1 격차 보완(덩이 E~J) 완료**: 이 덩이로 `docs/decisions.md` #9에서 발견한
  원본과의 리뷰 모델 격차가 전부 좁혀졌다. 남은 미완료 항목은 실 카카오 로그인이
  필요한 브라우저 시각 검증(review-list-and-write-ui AC20~22, my-reviews-list
  MyReviewsPanel)뿐이며 `docs/decisions.md`에 후속 조치로 기록돼 있다.
