# 아키텍처 — real-estate-review-with-harness

> 구조가 바뀔 때마다 갱신한다. 에이전트는 큰 작업 전에 이 문서를 읽는다.

## 시스템 개요

```
브라우저
  │  카카오 지도 JS SDK (지도 렌더링, 런타임)
  ▼
apps/web  (Next.js 15, :3001 — 지도 검증만 :3000, 근거 docs/decisions.md #7)
  │  fetch — 계약은 packages/types 의 zod 스키마
  ▼
apps/api  (Bun + Hono, :8788)
  │  routes → services → repositories
  ▼
PostgreSQL (Drizzle)

시딩(오프라인):
  경기데이터드림 OpenAPI → 중개업소 목록
  카카오 REST API        → 주소 → 좌표 지오코딩
```

## 레이어

`.cursor/rules/10-architecture` 의 레이어 규칙을 따른다. 이 프로젝트 고유의 보충:

- `apps/web` 과 `apps/api` 는 서로 import하지 않는다. 접점은 `packages/types` 의 계약뿐이다.
- 카카오 **JS 키**는 브라우저 번들에 inline되므로 도메인 제한이 필수다.
  **REST 키**는 시딩 전용이며 서버 밖으로 나가지 않는다.

## 주요 디렉터리

```
apps/
  web/
    app/            App Router 페이지. 조립만 한다
    design-system/  토큰 정본 (tokens.css / tokens.ts) — 하네스 design-system 모듈
  api/
    src/
      routes/       검증 → 서비스 호출 → 응답
      __tests__/    unit(리포지토리 mock, DB 불필요) / integration(real DB)
packages/
  types/            계약(zod) 단일 정본
  env/              환경변수 스키마, fail-fast 검증
  ui/               앱 간 공유 프리미티브
  config/           tsconfig·eslint 베이스 (하네스 규칙을 여기서 spread)
infra/docker/       postgres compose
.harness/           검증 게이트 (config.json 의 checks, 커밋 훅)
```

## 외부 의존성

| 의존성 | 용도 | 도입 이유 |
|--------|------|-----------|
| Next.js 15 / React 19 | web | 원본과 동일 — 스택을 통제변인으로 고정 |
| Bun + Hono | api | 원본과 동일 |
| PostgreSQL + Drizzle | 영속화 | 지리 좌표 범위 질의 + 타입드 스키마 |
| 카카오 지도 JS SDK | 지도 렌더링 | 국내 주소·POI 정확도 |
| 카카오 REST API | 주소 → 좌표 | 공공 데이터에 좌표가 없다 |
| 경기데이터드림 OpenAPI | 중개업소 원천 데이터 | 경기도 공인중개사 공개 목록 |
| Turborepo | 워크스페이스 오케스트레이션 | 원본과 동일 |
