# 명세: 지오코딩 매칭 신뢰도 + 낮은 신뢰도 배지

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

원본 캐치업 Phase 4(`docs/product-spec.md`, `docs/decisions.md` #10)의 세 항목 중 실제로
새로 만들 것과 이미 끝난 것, 이번엔 범위 밖으로 미룰 것을 나눈다.

1. **시드 스크립트 시군 파라미터화** — 이미 완료돼 있다. `seed-sigungu.ts`가
   `bun run seed:sigungu -- <시군명>` 인자를 받아 `SEED_TARGET_SIGUNGU`를 덮어쓰는
   동작은 `docs/specs/seed-sigungu.md` AC7·AC8로 이미 구현·검증됐다(직접 코드·테스트
   확인). 이번 명세에서는 회귀 테스트만 재확인하고 새 작업은 하지 않는다.
2. **지오코딩 매칭 신뢰도 컬럼 + 낮은 신뢰도 배지** — 이번 명세의 실제 작업.
3. **경기도 외 지역 데이터 소스** — "검토"이지 "구현"이 아니다. 원본(`molit-realestate.
   service.ts`·`seed-national.ts`)을 인터페이스만 확인한 결과, 국토교통부 데이터셋
   (data.go.kr, `tn_pubr_public_med_office_api`)을 쓰고 있고 별도 서비스키
   (`MOLIT_API_KEY`)가 필요하다. 이 저장소엔 아직 그 키가 없고, 전국 규모는 성남시
   2273건과 비교가 안 되는 실행 시간·API 쿼터 문제가 따른다 — 아래 "범위 밖"에서
   조사 결과만 기록하고, 실제 착수는 키 발급 후 별도 명세로 미룬다.

원본(`apps/api/src/db/schema.ts`)이 `matchConfidence: doublePrecision("match_confidence")`
(nullable, CHECK 제약 없음)를 두고 있음을 확인했다(통제변인 — 컬럼명·타입만 인터페이스로
채택, 신뢰도 계산 로직은 원본을 복사하지 않고 독자 설계). 원본은 여러 지오코딩 전략
(주소 검색 → 키워드 검색 → 완화된 키워드 검색)의 성공 단계에 따라 신뢰도를 등급별로
매기는데(`docs/decisions.md` #9 통제변인 원칙상 정확한 값·전략 구조는 참조하지 않음),
이 저장소의 지오코딩은 "법정동명+사무소명 키워드 검색 1회, 최대 5개 후보 중 법정동
접두어가 맞는 첫 건 채택"이라는 단일 전략이라 원본과 같은 다단계 신뢰도 체계를 그대로
가져올 수 없다. 대신 **채택된 후보가 Kakao 검색 결과에서 몇 번째였는가**를 신뢰도로
쓴다 — 0번째(가장 관련성 높다고 Kakao가 판단한 결과)가 우리 조건도 만족하면 신뢰도가
가장 높고, 뒤로 갈수록 낮아진다.

## 범위 밖

- **전국 데이터 소스(국토교통부 data.go.kr) 연동** — 위 목표 3번 참고. `MOLIT_API_KEY`
  발급과 전국 규모 실행 계획(예상 소요 시간·쿼터)이 먼저 필요하다.
- **기존에 이미 시딩된 1913건의 소급 재계산** — 이번 마이그레이션은 컬럼만 추가
  (`NULL` 기본값)한다. 기존 데이터는 재시딩(`bun run seed:sigungu`)해야 신뢰도가
  채워진다 — 원본도 마이그레이션이 과거 데이터를 소급 계산하지 않는다.
- **신뢰도 값 자체를 사용자에게 노출** — 배지는 "낮음/보통" 이분법만 보여준다. 수치
  자체(예: "0.33")는 사용자에게 의미가 없어 노출하지 않는다.
- **관리자가 낮은 신뢰도 사무소를 수동으로 재지오코딩하는 UI** — API/스크립트
  재실행으로 충분하다.
- **지도 마커에 배지 표시** — 마커는 이미 클러스터링·아이콘으로 밀도가 높다. 배지는
  사무소 상세 정보(`OfficeInfoFields`, 패널+상세페이지 공유)에만 둔다.

## 수용 기준

**시드 스크립트 시군 파라미터화 (회귀 확인)**

- [x] AC1: `docs/specs/seed-sigungu.md` AC7·AC8이 여전히 통과한다(`seedService.test.ts`
      재실행, 코드 변경 없음 — 순수 회귀 확인).

**지오코딩 매칭 신뢰도**

- [x] AC2: `kakaoGeocoder.geocodeOffice`가 채택한 후보의 Kakao 검색 결과 내 순번
      (0-based)을 `rank`로, `matchConfidence = 1 / (rank + 1)`을 계산해 반환값에
      포함한다(1위 채택 시 1.0, 2위 채택 시 0.5, 3위 채택 시 0.333...).
- [x] AC3: 매칭되는 후보가 없으면(기존과 동일) `null`을 반환한다 — 신뢰도 자체가
      없는 상태와 "낮은 신뢰도"는 다르다.
- [x] AC4: `offices` 테이블에 `match_confidence`(nullable double precision) 컬럼이
      추가된다.
- [x] AC5: 시딩 시 지오코딩된 신뢰도가 `offices.match_confidence`에 저장된다.
- [x] AC6: 같은 사무소를 재시딩(upsert)하면 `match_confidence`도 최신값으로
      갱신된다.
- [x] AC7: `officeSummarySchema`(bbox 목록·검색 결과·상세 응답이 공유)에
      `matchConfidence: number().min(0).max(1).nullable()`이 추가된다.

**낮은 신뢰도 배지**

- [x] AC8: `matchConfidence`가 `LOW_MATCH_CONFIDENCE_THRESHOLD`(0.5) 미만이면
      `OfficeInfoFields`에 "위치 정보 정확도가 낮을 수 있어요" 배지가 보인다.
- [x] AC9: `matchConfidence`가 0.5 이상이거나 `null`이면 배지가 보이지 않는다(신뢰도를
      모르는 기존 데이터를 "낮음"으로 오분류하지 않는다).

## 영향 범위

- **만질 파일**
  - `apps/api/src/lib/kakaoGeocoder.ts` — `IGeocodedPoint`에 `matchConfidence: number`
    추가, `.find()` → `.findIndex()`로 바꿔 rank 계산.
  - `apps/api/src/services/seedService.ts` — 지오코딩 결과의 `matchConfidence`를
    `TOfficeInsert`에 포함.
  - `apps/api/src/db/schema.ts` — `offices.matchConfidence`(신규 컬럼).
  - `apps/api/drizzle/` — 신규 마이그레이션.
  - `apps/api/src/repositories/officeRepository.ts` — `findByBbox`·`findById`·
    `searchByQuery`의 select에 `matchConfidence` 추가, `upsertMany`의
    `onConflictDoUpdate.set`에 `matchConfidence: sql\`excluded.match_confidence\`` 추가.
  - `packages/types/src/office.ts` — `officeSummarySchema.matchConfidence`,
    `LOW_MATCH_CONFIDENCE_THRESHOLD` 상수.
  - `apps/web/components/OfficeInfoFields/OfficeInfoFields.tsx` — 배지 렌더링.
  - 신규 테스트: `apps/api/src/__tests__/unit/kakaoGeocoder.test.ts`(신규 — 지금까지
    이 파일은 단위 테스트가 없었다, `seedService.test.ts`의 fake를 통해서만 간접
    검증돼 왔음). 기존 `seedService.test.ts`·`officeRepository.test.ts`(통합)·
    `OfficeInfoFields.test.tsx`에 케이스 추가.
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존 오피스 응답에 `matchConfidence: number | null`이 추가되는
  것 외 변경 없음(하위 호환). 재시딩 전까지 기존 데이터는 전부 `null` → 배지 없음.

## 설계 메모

- **rank 기반 신뢰도를 쓰는 이유**: 이 저장소의 지오코딩은 원본처럼 여러 전략을
  단계적으로 시도하지 않는다(설계상 단일 키워드 검색, `kakaoGeocoder.ts` 설계 메모 —
  "오매칭보다 스킵이 낫다"). 여러 단계가 없으니 "몇 번째 전략에서 성공했는가"를 쓸 수
  없고, 대신 이미 호출하고 있는 단일 검색의 응답 안에서 "몇 번째 후보가 조건을
  만족했는가"라는, 추가 API 호출 없이 얻을 수 있는 신호를 쓴다.
- **임계값 0.5(=3순위 이하부터 낮음)를 고른 이유**: 1순위(1.0)·2순위(0.5)는 Kakao
  자신의 관련도 랭킹에서도 상위권이라 위양성(멀쩡한 매칭을 "낮음"으로 오표시)
  가능성이 낮다고 판단했다. 3순위 이상(0.333 이하)부터는 우리 조건(법정동 접두어)에
  걸린 후보를 찾으려고 관련도 랭킹을 여러 건 건너뛰었다는 뜻이라 실제 오매칭
  가능성이 커진다. 임계값을 1.0 미만(1순위가 아니면 전부)으로 잡으면 배지가 너무
  흔해져 신호로서 의미가 없어진다.
- **`matchConfidence: null`과 "낮음"을 구분하는 이유(AC9)**: 마이그레이션 이전에
  시딩된 사무소, 또는 수동으로 DB에 넣은 사무소는 신뢰도 자체가 계산된 적이 없다.
  "모른다"를 "낮다"로 취급하면 대다수의 기존 데이터가 근거 없이 낮은 신뢰도로
  표시된다 — 재시딩해야만 실제 신뢰도가 채워지는 게 맞다.
- **전국 데이터 소스는 조사만 하고 멈추는 이유**: `MOLIT_API_KEY`라는 새 자격증명이
  필요한데 지금 이 저장소엔 없고, 발급 없이는 실제 시딩을 검증할 수 없다(이 세션의
  다른 모든 기능은 실행까지 확인하는 것을 원칙으로 삼아왔다 — 검증 못 할 코드를
  먼저 쓰지 않는다). 또한 전국 규모는 성남시 하나(2273건, 시딩에 몇 분 소요)와
  자릿수가 다른 실행 시간·API 쿼터 문제라 별도로 계획해야 한다.

## 열린 질문

없음 — rank 기반 신뢰도 계산·임계값 0.5·null과 낮음의 구분·전국 데이터 소스 범위
제외 전부 위 설계 메모에서 확정했다.

## 실행 결과 (2026-08-27)

- **AC1~9 전부 확인.** `kakaoGeocoder.ts`(rank 계산) → `seedService.ts`(threading) →
  스키마·마이그레이션 → `officeRepository.ts`(3개 select + upsert conflict-update) →
  계약(`officeSummarySchema`) → `OfficeInfoFields`(배지) 순으로 구현.
- **Red 확인**: `kakaoGeocoder.test.ts`(신규 — 이 파일 자체가 이번에 처음 생겼다,
  지금까지 `createKakaoGeocoder`의 실제 fetch 로직은 단위 테스트가 없었고
  `seedService.test.ts`의 fake를 통해서만 간접 검증돼 왔다), `seedService.test.ts`의
  AC5 신규 케이스, `officeRepository.test.ts`(통합)의 AC4·AC6 신규 케이스,
  `OfficeInfoFields.test.tsx`의 AC8·AC9 신규 케이스 — 전부 구현 전에 테스트를 먼저
  돌려 실패를 확인했다. `officeRepository.ts`의 `upsertMany` conflict-update에서
  `matchConfidence` 매핑을 일부러 지워 AC4·AC6 테스트가 실제로 잡는지도 확인 후
  원복했다(사후 Red 검증).
- **AC1(시드 스크립트 시군 파라미터화) 회귀 확인**: 코드 변경 없이 `seedService.test.ts`
  재실행 — 기존 AC7·AC8 케이스 그대로 통과. 이미 완료된 기능임을 재확인만 했다.
- **실DB 통합 테스트**: `TEST_DATABASE_URL`(`app_test`)로 마이그레이션 적용 후
  `officeRepository.test.ts` 11개(기존 9 + 신규 2) 전부 통과 — 실제 upsert
  conflict-update가 `match_confidence`를 갱신하는 것과, 값을 안 주면 `null`로
  저장되는 것을 실 Postgres로 확인했다.
- **개발 서버 + 실 브라우저 스모크 테스트**: `bun run db:migrate`로 개발 DB에도
  마이그레이션 적용 후, 기존에 실시딩된 사무소 2건에 각각 `match_confidence = 0.333`·
  `1.0`을 직접 심어 재시딩 결과를 흉내낸 뒤 — API(`GET /api/offices/:id`,
  `GET /api/offices?bbox=`)가 두 값을 정확히 반환하는 것을 curl로 확인했고, 이 API는
  인증이 필요 없는 공개 조회라 카카오 로그인 장벽 없이 **실제 브라우저**로 두
  사무소의 상세 페이지를 열어 확인했다: 0.333(낮은 신뢰도)에는 "위치 정보 정확도가
  낮을 수 있어요" 배지가 보이고, 1.0에는 배지가 안 보였다. AGENTS.md 절차대로
  `docker stop app-web` → 이 저장소 web을 3000번 포트로 기동 → 검증 후
  `docker start app-web`으로 원복했고, 심어둔 테스트용 `match_confidence` 값도
  전부 `NULL`로 되돌렸다.
- **하네스 게이트**: `node .harness/gates/run-checks.mjs` 전체 통과
  (typecheck → lint → stylelint → test → build).
- **기존 테스트 마이그레이션**: `officeSummarySchema`에 필수 필드 `matchConfidence`가
  추가되면서 API 6개 파일 + 웹 10개 파일의 기존 오피스 픽스처에 `matchConfidence: null`을
  추가해야 했다(기계적 변경, 로직 변경 없음) — `photos: []` 때와 같은 종류의
  스키마 확장 비용.
