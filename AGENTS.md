# real-estate-review-with-harness — Agent Guide

> 이 파일은 모든 AI 에이전트(Cursor, Claude Code 등)가 항상 읽는 정본이다.
> 짧게 유지한다. 상세 규칙은 `.cursor/rules/` 에 있고, 해당 파일을 만질 때 로드된다.

## 프로젝트 개요

경기도 공인중개사 사무소를 카카오 지도에서 탐색하고 실제 이용 경험을 리뷰로 남기는
소비자 웹 서비스. Turborepo 모노레포 — Next.js 15(web) + Bun/Hono(api) + PostgreSQL/Drizzle.

**도메인 용어**
- **office(사무소)** — 공인중개사 사무소. 외부 공공 API로 시딩하고 주소를 좌표로 지오코딩한다
- **bbox** — 지도의 현재 화면 영역. 마커는 bbox 기준으로 동적 로딩된다
- **review** — 사무소당 1인 1건. 별점 + 본문(10자 이상)
- **hidden_at** — 신고 누적으로 숨겨진 리뷰의 soft hide 시각

> 이 저장소는 [real-estate-agent-review](https://github.com/ysh038/real-estate-agent-review)를
> **하네스를 얹은 상태로** 다시 만들어 결과물 차이를 측정하는 실험이다.
> 실험 설계·지표·하네스 갭 로그: `docs/experiment.md`

## 자주 쓰는 명령어

```bash
bun install
cp .env.example .env                 # 카카오 JS/REST 키 입력
docker compose -f infra/docker/docker-compose.yml up -d postgres   # :5433
bun run db:migrate
bun run dev                          # web :3001, api :8788

node .harness/gates/run-checks.mjs   # 전체 검증 (.harness/config.json 의 checks 순차 실행)
```

`bun run lint` 등 개별 스크립트는 turbo 캐시를 탄다. 하네스 설정을 고친 직후에는
`turbo lint --force` 로 확인한다 (캐시된 '통과'가 재생될 수 있다 — `docs/experiment.md` G6).

## 새 컴퓨터에서 이어서 작업하기

git이 옮기지 못하는 두 가지가 있다 — 위 "자주 쓰는 명령어"만 따라 하면 서버는 뜨지만
**빈 지도**가 뜬다.

1. **시딩 데이터**는 로컬 docker 볼륨(`harness_postgres_data`)에만 있다. `db:migrate` 뒤에
   반드시 `bun run --cwd apps/api seed:sigungu` 를 한 번 더 돌려야 `offices` 테이블이 찬다
   (2273건 → 약 1913건 upsert, 몇 분 걸림 — 카카오 REST 키로 실제 지오코딩을 호출한다).
2. **지도를 보려면 3000 포트로 띄운다.** 카카오 콘솔에 등록된 도메인이 `localhost:3000`
   뿐이라 기본 포트(3001)로는 지도가 401로 안 뜬다. 3001을 등록하지 않기로 결정했다
   (`docs/decisions.md` #7). 원본 저장소가 3000을 쓰고 있으면 잠시 내리고 쓴다:

   ```bash
   docker stop app-web                          # 원본 FE 잠시 중지
   bun run --cwd apps/web dev -- --port 3000
   docker start app-web                         # 검증 끝나면 복구
   ```

3. **`.env` 의 `KAKAO_REST_API_KEY`** 는 시딩(위 1번)에만 쓰이고 저장소에 없다.
   카카오 콘솔에서 가져와 채워야 시딩이 돈다.

착수 전 항상 `docs/decisions.md` 의 "논의 중" 섹션을 확인한다 — 미해결 결정 사항이 있다.

## 검증 게이트

- 커밋 전 **반드시** `node .harness/gates/run-checks.mjs` 가 통과해야 한다.
  커밋 게이트(`.harness/gates/pre-commit-gate.sh`)가 실패 시 커밋을 거부한다.
- 검증 목록은 `.harness/config.json` 의 `checks` 배열이다. 체크를 추가/제거하려면 이 파일을 수정한다.
- 테스트를 통과시키기 위해 단정문(assertion)을 약화시키지 않는다. 실패하면 코드를 고친다.

## 워크플로

| 커맨드 | 용도 |
|--------|------|
| `/spec <기능>` | 구현 전 명세 작성 (`docs/specs/`) — 수용 기준은 테스트로 번역 가능해야 함 |
| `/impl <slug>` | 명세 기반 구현 — 실패하는 테스트 먼저 (Red → Green → Refactor) |
| `/verify` | checks 순차 실행, 실패 시 수정 루프 |
| `/ship` | 검증 → 커밋 → `docs/task-log.md` 기록 |
| `/ds-init` | Storybook 온디맨드 설치 (최초 UI 작업 전 1회) |
| `/ds-add` | 레이아웃 착수 전 디자인시스템 컴포넌트 + 스토리 선행 추가 |

## 절대 금지

| 금지 | 이유 |
|------|------|
| `any` 타입 | 타입 안전성 포기. `unknown` + 좁히기를 쓴다 |
| `git commit --no-verify` | 게이트 우회 금지 |
| `git push --force` (보호 브랜치) | 이력 파괴. 필요하면 `--force-with-lease` + 사전 협의 |
| `.env*` 파일 커밋 | 시크릿 유출 |
| 라우트(페이지) 컴포넌트에 비즈니스 로직 | hooks/queries 레이어로 내린다 (`.cursor/rules/10-architecture` 참고) |
| CSS 색상 원시값 (`#hex`, `rgb()`) | 디자인 토큰만 사용. stylelint가 error 처리 |
| 테스트 단정문 약화로 통과시키기 | 검증의 의미가 사라진다 |

## 장기 기억 문서

| 파일 | 용도 |
|------|------|
| `docs/architecture.md` | 구조가 바뀔 때 갱신 |
| `docs/decisions.md` | 결정과 **근거** (결론만 적지 않는다) |
| `docs/product-spec.md` | 기능 명세 + TODO 목록 |
| `docs/task-log.md` | `/ship` 시 자동 기록 |
