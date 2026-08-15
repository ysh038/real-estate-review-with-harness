# 명세: offices 스키마 + bbox 조회 API

- 작성일: 2026-08-15
- 상태: 구현됨

## 목표

지도에 마커를 찍으려면 "지금 화면에 보이는 영역 안의 중개업소"를 물어볼 수 있어야 한다.
현재는 사무소를 담을 테이블도, 좌표로 조회할 경로도 없다. 이 명세는 **사무소 영속화 스키마**와
**bbox(지도 화면 영역) 기준 조회 API** 까지를 정의한다. 지도 렌더링과 데이터 시딩은 뒤따르는
별도 작업이다.

시딩을 이 명세에서 뺀 이유: 주소 → 좌표 변환에 카카오 REST 키가 필요한데 아직 없다.
키 없이도 끝까지 검증 가능한 구간만 잘랐다.

## 범위 밖

- **시딩 스크립트** (경기데이터드림 API 호출, 카카오 지오코딩) — 별도 명세. 키 필요.
- **지도 렌더링·마커·클러스터링** — 별도 명세. 카카오 JS 키 필요.
- **리뷰 집계**(`avgRating`, `reviewCount`) — reviews 테이블이 아직 없다. Phase 1에서 추가.
- **좌표 신뢰도**(`match_confidence`) — 원본에서도 Phase 4 항목.
- **텍스트 검색** — 원본 Phase 13.
- **페이지네이션** — bbox 응답은 상한(`MAX_OFFICES_PER_BBOX`)으로 자른다. 커서는 리뷰 목록에서만.

## 수용 기준

**스키마 · repository** (실제 DB 필요 — `__tests__/integration/`, DB 없으면 skip)

- [x] AC1: `offices` 테이블이 마이그레이션으로 생성되고, `bun run db:migrate` 를 두 번 실행해도 실패하지 않는다.
- [x] AC2: 같은 사무소를 두 번 upsert하면 행이 1개이고 최신 값으로 갱신된다 (재시딩 멱등성).
- [x] AC3: bbox 안에 있는 사무소만 반환한다. 경계선 위의 좌표는 **포함**한다.

> AC3은 처음에 "서비스 단위 테스트"로 잡았다가 옮겼다. bbox 필터링은 repository의 SQL이
> 하는 일이라, repository를 mock한 상태에서는 **mock이 시킨 대로 답하는지**만 확인하게 된다.
> 그건 아무것도 검증하지 않는 테스트다 (`40-testing`).

**bbox 조회 서비스** (repository를 mock한 단위 테스트, DB 불필요)

- [x] AC4: 결과가 없으면 빈 배열을 반환한다 (null·예외 아님).
- [x] AC5: 결과가 `MAX_OFFICES_PER_BBOX` 를 넘으면 그 개수로 자르고 `isTruncated: true` 를 함께 반환한다.

**API 계약**

- [x] AC6: `GET /api/offices?bbox=<minLng>,<minLat>,<maxLng>,<maxLat>` 가 200과 계약 스키마에 맞는 본문을 반환한다.
- [x] AC7: `bbox` 누락 시 400을 반환한다.
- [x] AC8: `bbox` 값이 4개가 아니거나 숫자가 아니면 400을 반환한다.
- [x] AC9: `minLng > maxLng` 처럼 뒤집힌 bbox면 400을 반환한다.
- [x] AC10: 위경도가 유효 범위(위도 -90~90, 경도 -180~180)를 벗어나면 400을 반환한다.
- [x] AC11: 응답 타입은 `packages/types` 의 zod 스키마에서만 파생된다 (앱 안에 직접 정의 없음).

## 영향 범위

- **만질 파일**
  - `packages/types/src/office.ts` (신규) — `officeSummarySchema`, `officesByBboxResponseSchema`, `bboxQuerySchema`
  - `packages/types/src/index.ts` — 재export
  - `apps/api/src/db/schema.ts` (신규) — Drizzle `offices` 테이블
  - `apps/api/src/db/client.ts` (신규) — postgres 커넥션
  - `apps/api/src/repositories/officeRepository.ts` (신규)
  - `apps/api/src/services/officeService.ts` (신규) — bbox 정규화·상한 처리
  - `apps/api/src/routes/offices.ts` (신규) — 검증 → 서비스 호출 → 응답
  - `apps/api/src/app.ts` — 라우트 등록
  - `apps/api/drizzle.config.ts` (신규), `apps/api/drizzle/` (마이그레이션 산출물)
  - `apps/api/package.json` — `db:generate`·`db:migrate` 스크립트
  - `apps/api/src/__tests__/unit/officeService.test.ts` (신규)
  - `.env.example` / `packages/env` — 이미 `DATABASE_URL` 있음. 추가 없음
- **새 의존성**: `drizzle-orm`, `postgres` (런타임) / `drizzle-kit` (개발)
- **기존 기능 영향**: 없음. `/health` 는 그대로.

## 설계 메모

- **좌표 저장**: PostGIS 없이 `double precision` 두 컬럼(`lat`, `lng`) + `(lat, lng)` 복합 인덱스.
  bbox는 단순 범위 질의라 PostGIS의 공간 인덱스가 필요할 만큼 복잡하지 않고,
  확장 설치가 Docker 이미지·배포 환경에 제약을 더한다. 반경 검색이 생기면 그때 재검토한다.
- **레이어**: `routes → services → repositories`. SQL은 repository에만. 서비스는 repository
  인터페이스(`IOfficeRepository`)에만 의존해 DB 없이 단위 테스트한다 (`10-architecture`).
- **테스트 분리**: AC1·AC2는 실제 DB가 필요하다 → `__tests__/integration/`. `DATABASE_URL` 로
  접속할 수 없으면 **skip** 한다. `.harness/config.json` 의 `test` 체크는 DB 없이도 돌아야
  하기 때문이다(게이트가 로컬 환경에 인질로 잡히면 우회당한다). AC3~AC11은 DB 없이 돈다.
- **상한**: `MAX_OFFICES_PER_BBOX = 500`. 줌 아웃 시 수만 건이 한 번에 나가는 것을 막는다.
  잘렸다는 사실을 응답으로 알려 UI가 "확대해서 보세요"를 띄울 수 있게 한다.

## 열린 질문 (해소됨 — 2026-08-15)

1. **`offices.id`** → 공공데이터 등록번호를 `text` PK. 재시딩 upsert 멱등성이 공짜로 따라온다.
   외부 키 체계 변경 위험은 감수한다 (전국 API 전환은 이번 범위 밖).
2. **bbox 형식** → `bbox=minLng,minLat,maxLng,maxLat` (GeoJSON/OGC 관례). 파라미터 1개.
   카카오 `LatLngBounds` → 이 형식 변환은 web 쪽 어댑터가 맡는다.
3. **컬럼** → `sigungu`·`phone`·`ownerName` 포함. `match_confidence` 는 제외
   (지오코딩을 실제로 돌려보기 전엔 신뢰도 기준을 정할 수 없다).

## 스키마 (확정)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `text` PK | 공공데이터 등록번호 |
| `name` | `text NOT NULL` | 사무소명 |
| `owner_name` | `text` | 대표자명 (원천 데이터에 빠진 건이 있다) |
| `address` | `text NOT NULL` | 소재지 |
| `phone` | `text` | 전화번호 |
| `sigungu` | `text NOT NULL` | 시군. 시딩 단위이자 지역 필터 키 |
| `lat` | `double precision NOT NULL` | 위도 |
| `lng` | `double precision NOT NULL` | 경도 |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | upsert 시 갱신 |

인덱스: `(lat, lng)` 복합 — bbox 범위 질의용. `(sigungu)` — 재시딩 범위 조회용.
