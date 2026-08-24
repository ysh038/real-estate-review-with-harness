# 결정 기록 — real-estate-review-with-harness

> 기술적 결정을 내릴 때마다 **근거와 함께** 기록한다. 결론만 적으면 몇 주 뒤 같은 논쟁을 반복한다.
> 형식: 최신이 위. 번복된 결정은 지우지 말고 취소선 + 번복 사유.

## 결정

### 2026-08-24 #9 — 리뷰 모델이 원본과 다르다는 걸 뒤늦게 확인, 격차를 덩이 E~J로 좁힌다

- **발견**: Phase 1(리뷰 시스템) 10개 항목을 전부 완료로 표시한 뒤, 원본 저장소
  (`/Users/sanghoon/Desktop/real-estate-agent-review`)의 **실제 코드**(`apps/api/src/db/schema.ts`
  등, grep 0건으로 확인)를 열어보니 리뷰의 핵심 모델 자체가 다르다는 게 드러났다:
  - 원본은 **`rating`(별점) 컬럼이 아예 없다.** 대신 `dealType`/`dealResult`(거래유형·결과),
    `visitedYear`/`visitedMonth`(방문 시기), 태그(`REVIEW_TAGS` + 사무소별 `tagCounts`),
    사진, "도움돼요"(helpful) 토글, 비속어 필터(`containsProfanity`, 422), 내 리뷰 목록
    (`GET .../me/reviews`), 관리자 숨김 리뷰 목록·복구(`x-admin-api-key` 헤더 기반
    `requireAdmin`, DB role 컬럼 없음)로 리뷰를 표현한다.
  - 이 저장소는 처음부터 `AGENTS.md` 도메인 용어에 "review = 별점 + 본문"으로 못박고
    시작했다 — 원본의 **실제 스키마를 확인하지 않고** 세운 가정으로 보인다(원본 자체의
    `docs/product-spec.md`에는 `rating smallint` 재설계가 `[x]` 완료로 적혀 있지만 실제
    코드엔 반영되지 않은 원본 쪽 문서-코드 드리프트가 있어, 그 문서만 보고 따라갔을 가능성).
  - `docs/experiment.md`는 "범위: MVP + Phase 1 (비교는 동일 구간만)"을 전제하는데, 지금
    이 저장소의 Phase 1은 원본의 실제 Phase 1과 기능적으로 다른 걸 구현한 셈이라 비교
    타당성에 영향이 있다.
- **결정**: 별점(rating)은 이미 여러 명세·API·UI에 걸쳐 구현·검증됐으므로 되돌리지 않고
  유지한다(제거는 더 큰 재작업이고, "리뷰에 정량 지표가 있다"는 것 자체는 사용자 가치가
  있다). 대신 **원본에 있고 이 저장소에 없는 항목을 덩이 E~J로 나눠 추가한다**:
  - 덩이 E — dealType/dealResult/visitedYear/visitedMonth (리뷰 작성 폼 필드 확장)
  - 덩이 F — 리뷰 태그(REVIEW_TAGS) + 사무소 태그 집계
  - 덩이 G — 비속어 필터(생성·수정 시 422)
  - 덩이 H — "도움돼요" 토글 + helpfulCount/isHelpful
  - 덩이 I — 내 리뷰 목록
  - 덩이 J — 관리자: 숨김 리뷰 목록 + 복구 (API 전용, 원본도 web UI 없음)
  사진 첨부는 여전히 제외한다(Phase 2, `docs/product-spec.md` "하지 않기로 한 것"에 이미
  근거 있음 — 유일하게 의도적으로 뺀 항목이었다는 게 이번에 확인됐다).
- **대안**: 별점을 제거하고 원본처럼 태그/거래정보 기반으로 리뷰 모델을 다시 짠다.
- **근거**: 별점 제거는 이미 통과한 명세 6개(schema, write/report, list-and-write-ui 등)를
  전부 재작업해야 하는 비용인데, 원본 문서(`rating smallint [x]`)가 최소한 "원본도 별점을
  의도했었다"는 근거는 되므로 완전한 창작은 아니다. 반면 부족한 기능(태그·비속어 필터 등)은
  기존 리뷰 작성 경로에 필드/엔드포인트를 얹는 정도라 추가 비용이 더 적다.
- **주의(통제변인)**: `docs/experiment.md`의 "소스 미복사" 원칙에 따라, 이 항목들은 원본의
  API 스펙(엔드포인트 모양, 상태 코드, threshold 값 등 "인터페이스")만 참고하고 구현 코드나
  비속어 단어 목록 자체는 복사하지 않는다 — `seed-sigungu` 명세의 선례와 동일한 기준.

### 2026-08-15 #6 — 원본과 겹치는 모든 로컬 자원을 분리한다 (compose 프로젝트·포트)

- **결정**: `infra/docker/docker-compose.yml` 에 `name: harness-review` 를 명시하고,
  볼륨을 `harness_postgres_data` 로 둔다. 포트는 전부 원본과 어긋나게 잡는다 —
  Postgres `5433`(원본 5432), API `8788`(원본 8787), web `3001`(원본 3000).
- **대안**: 원본 컨테이너·서버를 끄고 같은 포트를 번갈아 쓴다.
- **근거**: compose 프로젝트 기본 이름은 **컴파일 파일의 부모 디렉터리명**이다. 두 저장소가
  똑같이 `infra/docker/` 규약을 쓰므로 둘 다 `docker` 가 되어, 한쪽에서 `up` 하면 다른 쪽
  컨테이너를 갈아치우고 **named volume(`docker_postgres_data`)까지 공유**한다.
  실제로 이번에 원본의 `app-postgres` 가 제거되고 새 컨테이너가 원본 데이터 볼륨(offices 2273행)에
  마운트됐다. 마이그레이션 직전에 발견해 되돌렸고 데이터 손실은 없었다.
  포트도 같은 병이었다. 원본 API(8787)가 떠 있는 상태에서 새 API를 띄웠더니 `EADDRINUSE` 로
  조용히 죽었고, **그 뒤의 curl 검증이 전부 원본 서버의 응답을 새 서버 것으로 착각하게 만들었다.**
  응답 형식이 달라서(`swLat`/`swLng` vs `bbox=`) 알아챘지, 우연히 비슷했으면 통과로 기록됐을 것이다.
  두 프로젝트를 나란히 두고 비교하는 실험이라 동시 실행이 전제다 — 분리는 선택이 아니다.

### 2026-08-15 #5 — 좌표는 PostGIS 없이 double precision 두 컬럼으로 둔다

- **결정**: `lat`·`lng` `double precision` + `(lat, lng)` 복합 인덱스. bbox는 `gte`/`lte` 범위 질의.
- **대안**: PostGIS `geography(Point)` + GiST 인덱스.
- **근거**: 지금 필요한 질의는 사각형 범위 하나뿐이다. PostGIS는 확장 설치가 Docker 이미지와
  배포 환경에 제약을 더하는데, 그 대가로 얻는 공간 인덱스가 아직 필요 없다.
  반경 검색("내 위치에서 1km")이 생기면 그때 재검토한다.

### 2026-08-15 #4 — 하네스 갭은 이 저장소에서 우회하고, create-harness는 고치지 않는다

- **결정**: 설치 과정에서 발견한 G1~G6을 대상 저장소 쪽 설정으로만 우회한다.
  create-harness 저장소에는 손대지 않고 `docs/experiment.md` 에 근거와 함께 기록만 남긴다.
- **대안**: create-harness에 `next-fe`·`monorepo` 프리셋을 추가해 근본 수정 (v0.3 TODO).
- **근거**: 실험의 조작변인은 "강제 수단의 유무"다. 실험 도중에 하네스 자체를 개선하면
  측정 대상이 움직여 결과를 해석할 수 없다. 갭 로그가 v0.3 프리셋 작업의 입력이 된다.

### 2026-08-15 #3 — 하네스 설정을 turbo `globalDependencies` 에 등록한다

- **결정**: `eslint.config.mjs`·`eslint.harness.config.js`·`stylelint.config.js`·
  `.harness/config.json`·`packages/config/**` 를 `turbo.json` 의 `globalDependencies` 에 넣는다.
- **대안**: 체크 명령을 `turbo lint --force` 로 바꿔 캐시를 아예 끈다.
- **근거**: 등록하지 않으면 규칙을 강화해도 캐시된 '통과'가 재생돼 게이트가 위조된다(G6).
  `--force` 는 캐시 이득을 통째로 버려 M6(기능당 소요) 지표를 오염시킨다. 입력 등록이 정확한 해법이다.

### 2026-08-15 #2 — 디자인시스템을 `apps/web/design-system/` 에 둔다

- **결정**: 하네스가 루트 `src/design-system/` 에 만든 토큰 파일을 `apps/web/design-system/` 로 옮기고
  `layout.tsx` 에서 `tokens.css` 를 import한다.
- **대안**: `packages/ui/` 안에 두고 워크스페이스로 공유.
- **근거**: 루트 `src/` 는 어느 tsconfig include에도 없어 `tokens.ts` 가 typecheck 밖에 놓인다(G4).
  소비자가 web 하나뿐인 지금 `packages/ui` 로 올리는 것은 이른 추상화다. 두 번째 소비자가 생기면 옮긴다.

### 2026-08-15 #1 — 원본과 동일한 스택으로 재구현한다 (하네스 정합 스택으로 바꾸지 않는다)

- **결정**: Turborepo + Next.js 15 + Bun/Hono 를 그대로 쓴다. 하네스의 `react-fe` 프리셋이
  전제하는 Vite SPA + axios + TanStack Query 로 갈아타지 않는다.
- **대안**: 프론트를 Vite SPA로 바꿔 하네스를 100% 적용 (참조 구현 모듈까지 전부 켜짐).
- **근거**: 실험의 통제변인은 스택이다. 스택을 바꾸면 결과물 차이가 하네스 때문인지 스택 때문인지
  분리할 수 없다. 대신 `auth-http`·`data-fetching` 모듈이 빠져 하네스의 절반만 적용된다는 사실
  자체를 결과로 기록한다.

### 2026-08-20 #8 — 통합 테스트를 시딩된 개발 DB에 직접 돌리지 않는다

- **사고**: 다른 PC 작업분(`git fetch`)을 받은 뒤 환경을 이어받는 과정에서
  `DATABASE_URL=... bunx vitest run` 으로 통합 테스트를 실행했다. `officeRepository.test.ts`·
  `reviewRepository.test.ts` 가 `beforeEach`/`afterAll`에서 `db.delete(offices)`(리뷰
  테스트는 `reviews`·`users`도 함께)로 격리를 하는데, 이걸 **격리된 테스트 DB가 아니라
  시딩 데이터(1914건)가 든 개발 DB에 직접** 돌려서 `offices` 가 통째로 비었다.
  `bun run --cwd apps/api seed:sigungu` 로 즉시 복구했다(2273건 → 1914건, 이전 1913건과
  거의 동일 — 카카오 지오코딩 결과가 시점에 따라 1건 차이 나는 정상 범위). **영구 손실은
  없었다.**
- **근본 원인**: 이 프로젝트에 "테스트용 DB"와 "브라우저로 보는 개발용 DB"의 구분이 없다.
  `.env` 의 `DATABASE_URL` 하나가 둘 다를 가리킨다. 통합 테스트가 정상 동작(격리)한 것 자체는
  옳다 — 잘못은 그 테스트를 실사용 데이터가 있는 DB에 대고 돌린 실행 판단이었다.
- **결정**: 통합 테스트는 **CI 또는 일회성 스크래치 DB**에서만 돌린다. 로컬에서 시딩된
  `offices` 데이터를 유지하며 개발 중이라면, `DATABASE_URL` 을 오버라이드해 별도 DB/스키마를
  가리키게 하지 않는 한 `DATABASE_URL=... vitest run` 형태로 직접 실행하지 않는다.
  기본 게이트(`bun run test`, env 파일 없음)는 원래도 이 테스트들을 skip하므로 안전하다 —
  위험한 것은 "확인 삼아 실DB 붙여서 한 번 더 돌려보자"는 수동 실행이다.
- **후속 조치 — 완료 (2026-08-20, kakao-oauth-login 작업 중)**: `userRepository` 통합
  테스트를 추가하는 시점에 저렴한 구조적 해법을 바로 적용했다. 같은 postgres 서버에
  `app_test` 데이터베이스를 하나 더 만들고(`CREATE DATABASE app_test`, 컨테이너 재사용,
  compose 변경 없음), 통합 테스트 3개 파일(`officeRepository`·`reviewRepository`·
  `userRepository`)이 전부 `DATABASE_URL` 대신 **`TEST_DATABASE_URL`** 이라는 별도 변수만
  읽게 바꿨다(`__tests__/helpers/testDb.ts`). 이제 `DATABASE_URL=... vitest run` 을 실수로
  쳐도 통합 테스트가 그 값을 아예 보지 않아 자동 skip된다 — "돌리지 마라"는 규칙이 아니라
  변수명을 분리해 구조로 막았다. 안전하게 실DB 검증하려면
  `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5433/app_test bunx vitest run`.

### 2026-08-20 #7 — 브라우저 검증은 3000에서 한다 (3001 도메인 등록은 하지 않는다)

- **결정**: 저장소 기본 포트는 `3001`로 그대로 두되, **지도가 필요한 브라우저 검증은
  포트 3000으로 띄워서** 한다. 원본 저장소의 `app-web` 컨테이너를 잠시 내리고 쓴다.
  카카오 콘솔의 `localhost:3001` 도메인 등록은 **하지 않기로 한다.**
- **대안**: 콘솔에 `http://localhost:3001` 을 등록해 원본과 동시 실행 가능하게 만든다(#6의 취지).
- **근거**: 등록은 콘솔 로그인이 필요해 에이전트가 대신 할 수 없고, 사용자가 매번 하기엔
  번거롭다. 반면 3000 우회 비용은 `docker stop app-web` 한 줄이고 데이터 위험이 없다 —
  #6이 실제로 걱정한 것은 Postgres 볼륨 공유였고 그건 `5433`으로 이미 분리돼 있다.
  Phase 1의 카카오 OAuth에서 **어차피 콘솔에 Redirect URI를 등록해야 하므로**, 그때
  `3000` 기준으로 한 번에 맞추면 포트가 일관된다.
- **부작용(감수함)**: 저장소 기본값 `bun run dev`(3001)로는 지도가 계속 401로 뜨지 않는다.
  이 저장소를 처음 여는 사람은 3000으로 띄워야 지도를 본다.
- **재현 근거**: 같은 앱키로 referer 만 바꿔 SDK 를 직접 받아 확인했다 —
  `3001 → 401 domain mismatched`, `3000 → 200`. SDK 밖의 층(오피스 API·CORS)은 3001 에서도
  정상이라, 막힌 지점은 도메인 등록 하나뿐이다.

## 논의 중 (아직 결정 아님)

### 리뷰 작성 UI — 실 카카오 로그인 브라우저 검증(AC20~22) 미완료

- **상황**: `docs/specs/review-list-and-write-ui.md`(Phase 1 덩이 D) 구현 후 브라우저 검증
  단계에서 "카카오 로그인" 버튼을 눌러 `accounts.kakao.com` 로그인 화면까지는 도달했지만,
  거기서부터는 실제 카카오 계정 아이디/비밀번호 입력이 필요했다. 에이전트가 사용자를 대신해
  자격증명을 입력하는 것은 하드 제약(자격증명 직접 입력 금지)이라 더 진행할 수 없었고,
  사용자가 "AC20~22 브라우저 검증은 스킵하고 넘어가줘"라고 결정해 스킵했다.
- **영향**: AC1~19(단위·컴포넌트 테스트, `useOfficeReviews`/`ReviewSection` 로직)는 전부
  통과했지만, 실제 로그인 세션 + 실 API + 실 DB를 통한 "리뷰 작성 → 화면 반영 → 새로고침
  후 유지"(AC20), "비로그인 시 폼 미노출"(AC21), "마커 전환 시 리뷰 섹션 전환"(AC22)은
  end-to-end로 확인되지 않았다.
- **후속 조치**: 다음에 이 화면을 만지거나, 사용자가 직접 브라우저에서 카카오 로그인을 마친
  세션이 있을 때 AC20~22를 마저 확인한다. `kakao-oauth-login` 명세에서 로그인 자체(닉네임
  표시 등)는 이미 실 계정으로 검증된 바 있어 로그인 플로우 자체의 위험은 낮다 — 남은 위험은
  리뷰 작성 폼과 목록 갱신의 연결부뿐이다.

- **상황**: `apps/web` 기본 포트는 `3001`(원본과 충돌 방지, #6). 그런데 카카오 개발자
  콘솔에 등록된 도메인은 `localhost:3000`(원본 프로젝트가 예전에 등록해둔 것으로 추정) —
  `3001`은 미등록이라 `401 domain mismatched` 로 지도 로드가 막힌다. 원본 FE를 끄고
  `3000`으로 임시 실행해 검증은 통과시켰지만(`docs/specs/kakao-map-render.md`), **저장소
  기본값(package.json `dev` 스크립트, `.env.example`)은 그대로 `3001`이다** — 아무도
  콘솔에서 도메인을 안 고치면 다음에 `bun run dev` 로 켰을 때 다시 401이 난다.
- **선택지**:
  1. **(권장)** [카카오 개발자 콘솔](https://developers.kakao.com) → 해당 앱 → 플랫폼 설정
     → Web → 사이트 도메인에 `http://localhost:3001` 추가. 콘솔 로그인이 필요해 에이전트가
     대신 할 수 없다. 이러면 원본(3000)과 이 저장소(3001)를 동시에 띄워도 둘 다 된다.
  2. 이 저장소도 `3000`을 기본값으로 바꾼다 — 대신 원본과 동시 실행이 안 된다
     (포트 분리 결정 #6과 정면으로 충돌).
- 결정 전까지: 로컬에서 지도를 켜려면 원본 FE(3000)를 끄고 `bun run --cwd apps/web dev -- --port 3000`
  처럼 수동으로 3000을 쓰거나, 콘솔에 3001을 등록한다.
- **2026-08-20 재현 확인** — 추정이 아니라 확정이다. 같은 앱키로 referer만 바꿔 SDK를 직접 받아봤다:

  ```
  Referer: http://localhost:3001 → 401 {"errorType":"AccessDeniedError",
      "message":"domain mismatched! caller=http://localhost:3001. check out registered web domains."}
  Referer: http://localhost:3000 → 200 (SDK 정상 반환)
  ```

  3001로 `bun run dev` 하면 `window.kakao` 가 `undefined` 로 남아 지도 컴포넌트가 에러 상태
  ("지도를 불러오지 못했습니다")로 떨어진다. **SDK와 무관한 층(오피스 API·CORS)은 3001 origin
  에서 정상**임도 같이 확인했다(200, `Access-Control-Allow-Origin` 응답).
  → 즉 막힌 것은 카카오 도메인 등록 하나뿐이고, 나머지 배선은 3001에서 이미 맞다.
- **검증 이력에 대한 정직한 표기**: `kakao-map-render`·`office-marker-bbox-sync`·`marker-clustering`
  세 명세의 브라우저 검증은 전부 **3000에서** 수행됐다. 컴포넌트 로직은 이 저장소 코드가 맞지만
  (마커 데이터가 이 저장소 DB `:5433`, API 호출이 `:8788` 인 것으로 확인), **저장소 기본 경로인
  `bun run dev`(3001)로는 아직 한 번도 통과된 적이 없다.** 도메인 등록 후 재검증이 필요하다.

### 지도 기본 줌 레벨 — 레벨 8이 예상보다 훨씬 넓다

- **상황**: `docs/specs/kakao-map-render.md` AC5는 "성남시청 중심, 시 전체가 보이는 레벨(8)"
  로 정했는데, 실제로 레벨 8을 브라우저에서 확인해보니 성남·용인·이천을 아우르는 50km+
  범위가 보인다 — "시 전체"라는 처음 의도와 다르다. 코드는 명세대로지만 명세의 레벨 추정이
  틀렸다.
- **선택지**: 지금 레벨을 낮춰(예: 5~6) 성남시 경계에 맞게 조이거나, 다음 명세(마커·bbox
  연동)에서 실제 시딩 데이터 분포를 보면서 같이 정한다.
- 바꿀 파일: `apps/web/components/KakaoMap/KakaoMap.tsx` 의 `DEFAULT_LEVEL` 상수 하나.

### 인라인 스타일 하드코딩 색상 (기존 논의)

- 인라인 스타일(`style={{ color: '#hex' }}`)을 막을 결정적 수단. stylelint는 `.css` 만 본다.
  원본의 드리프트 254건이 전부 여기 있었다(`docs/experiment.md` 베이스라인).
  ESLint `react/forbid-dom-props` 나 hex 리터럴 금지 규칙을 별도로 얹는 안이 있으나,
  하네스 본체의 변경이므로 실험이 끝난 뒤 판단한다.
