# 결정 기록 — real-estate-review-with-harness

> 기술적 결정을 내릴 때마다 **근거와 함께** 기록한다. 결론만 적으면 몇 주 뒤 같은 논쟁을 반복한다.
> 형식: 최신이 위. 번복된 결정은 지우지 말고 취소선 + 번복 사유.

## 결정

### 2026-08-15 #6 — compose 프로젝트 이름과 포트를 원본과 분리한다

- **결정**: `infra/docker/docker-compose.yml` 에 `name: harness-review` 를 명시하고,
  볼륨을 `harness_postgres_data`, 호스트 포트를 `5433` 으로 둔다.
- **대안**: 원본 컨테이너를 끄고 5432를 번갈아 쓴다.
- **근거**: compose 프로젝트 기본 이름은 **컴파일 파일의 부모 디렉터리명**이다. 두 저장소가
  똑같이 `infra/docker/` 규약을 쓰므로 둘 다 `docker` 가 되어, 한쪽에서 `up` 하면 다른 쪽
  컨테이너를 갈아치우고 **named volume(`docker_postgres_data`)까지 공유**한다.
  실제로 이번에 원본의 `app-postgres` 가 제거되고 새 컨테이너가 원본 데이터 볼륨(offices 2273행)에
  마운트됐다. 마이그레이션 직전에 발견해 되돌렸고 데이터 손실은 없었다.
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

## 논의 중 (아직 결정 아님)

- 인라인 스타일(`style={{ color: '#hex' }}`)을 막을 결정적 수단. stylelint는 `.css` 만 본다.
  원본의 드리프트 254건이 전부 여기 있었다(`docs/experiment.md` 베이스라인).
  ESLint `react/forbid-dom-props` 나 hex 리터럴 금지 규칙을 별도로 얹는 안이 있으나,
  하네스 본체의 변경이므로 실험이 끝난 뒤 판단한다.
