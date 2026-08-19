# real-estate-review-with-harness

경기도 공인중개사 사무소를 카카오 지도에서 탐색하고 리뷰를 남기는 소비자 웹 서비스.
Turborepo 모노레포 — Next.js 15(web) + Bun/Hono(api) + PostgreSQL/Drizzle.

> **이 저장소는 실험이다.** 이미 만들어 본 [real-estate-agent-review](https://github.com/ysh038/real-estate-agent-review)를
> [create-harness](https://github.com/ysh038/create-harness) 하네스를 얹은 상태로 다시 만들어,
> 결과물이 얼마나 달라지는지 측정한다. 스택·범위는 통제변인이고 **조작변인은 "규칙을 문서로 두는가,
> 게이트로 강제하는가" 하나다.**
>
> 설계·지표·베이스라인·하네스 갭 로그 → **[docs/experiment.md](docs/experiment.md)**

## 빠른 시작

```bash
bun install
cp .env.example .env    # 카카오 JS 키 / REST 키 / 경기데이터드림 키 입력
docker compose -f infra/docker/docker-compose.yml up -d postgres   # :5433
bun run db:migrate
bun run dev             # web :3001, api :8788
```

> 포트가 원본 저장소(`real-estate-agent-review`)와 겹치지 않게 어긋나 있다 —
> postgres 5433 / api 8788 / web 3001. 이유는 [decisions.md](docs/decisions.md) #6.

## 검증

커밋 전 아래가 통과해야 한다. 커밋 게이트(`.harness/gates/`)가 실패 시 커밋을 거부한다.

```bash
node .harness/gates/run-checks.mjs
```

`typecheck → lint → stylelint → test → build` 5종을 순차 실행한다.
목록은 `.harness/config.json` 에 있다.

## 구조

```
apps/web       Next.js App Router (UI/SSR/SEO)
apps/api       Bun + Hono (routes → services → repositories)
packages/types 계약(zod 스키마) 단일 정본
packages/env   환경변수 스키마 — fail-fast 검증
packages/ui    앱 간 공유 프리미티브
packages/config tsconfig·eslint 베이스 (하네스 규칙을 여기서 spread)
infra/docker   postgres compose
.harness/      검증 게이트
```

## 문서

| 문서 | 용도 |
|---|---|
| [AGENTS.md](AGENTS.md) | 에이전트가 항상 읽는 정본 |
| [docs/experiment.md](docs/experiment.md) | 실험 설계·지표·하네스 갭 로그 |
| [docs/product-spec.md](docs/product-spec.md) | 기능 명세 + TODO |
| [docs/architecture.md](docs/architecture.md) | 구조 |
| [docs/decisions.md](docs/decisions.md) | 결정과 근거 |
| [docs/task-log.md](docs/task-log.md) | `/ship` 작업 이력 |
