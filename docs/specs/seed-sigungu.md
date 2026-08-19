# 명세: 시군 단위 중개업소 시딩 스크립트

- 작성일: 2026-08-15
- 상태: 확정

## 목표

`offices` 테이블은 스키마만 있고 비어 있다. 경기데이터드림 OpenAPI에서 시군 단위로
공인중개사 목록을 받아, 주소를 카카오 REST API로 지오코딩해 좌표를 붙이고
`offices` 테이블에 upsert하는 CLI 스크립트가 필요하다. 이게 없으면 지도에 찍을 데이터가 없다.

시딩 대상 시군은 `.env` 의 `SEED_TARGET_SIGUNGU` (기본값 성남시)로 정하고,
`bun run --cwd apps/api seed:sigungu -- <시군명>` 인자로 덮어쓸 수 있게 한다.

## 범위 밖

- **다른 시도(경기도 외) 지원** — 원본 Phase 4 항목. 이번엔 경기데이터드림 하나만.
- **재시도 정책 고도화** (지수 백오프 등) — 1회 재시도만. 실패 유형별 전략은 실사용 후 조정.
- **좌표 신뢰도(`match_confidence`)** — 스키마에 컬럼이 없다. 지오코딩을 실제로 돌려보기 전엔
  신뢰도 기준을 정할 수 없다는 판단은 이전 명세(offices-schema-and-bbox-query)에서 이미 확정.
- **스케줄러(cron 재시딩)** — 원본 Phase 5. 지금은 수동 실행만.
- **Slack/디스코드 알림** — 원본 Phase 5. 콘솔 요약 출력으로 대체.

## 수용 기준

> **개정 (2026-08-15)**: 실제 API로 확인한 결과 `Rlestatebrkragofc` 응답에 사무소별 상세
> 주소 필드가 없다 (`LEGALDONG_NM` 구 단위만 존재). 원본이 실제로 어떻게 처리했는지
> DB를 직접 조회해 확인했다 — `address` 컬럼에 `LEGALDONG_NM`을 그대로 저장하고,
> 지오코딩은 **"사무소명 + 법정동명" 키워드 검색**으로 했다(주소 검색 아님).
> 결과: 2273건 중 1346건(59%)이 서로 다른 좌표. 이 방식을 그대로 따른다 — 사용자 결정
> "기존 프로젝트처럼 진행". `match_confidence`는 원본에도 실제로는 구현되지 않은
> 계획 항목이었음을 확인 — 계속 범위 밖.

**변환 로직** (외부 API를 인터페이스로 주입받는 단위 테스트, 네트워크 불필요)

- [ ] AC1: 경기데이터드림 원천 레코드 1건(법정동명 포함) + 키워드 지오코딩 성공 좌표 →
      `TOfficeInsert` 1건으로 변환된다. `address` 컬럼에는 `LEGALDONG_NM`이 들어간다.
- [ ] AC2: 지오코딩이 실패한(키워드 검색 결과가 법정동명과 매칭되지 않는) 레코드는
      **건너뛰고** 나머지는 계속 처리한다 — 하나의 실패로 전체 시딩이 죽지 않는다.
- [ ] AC3: 원천 레코드에 대표자명이 없으면(빈 문자열) `ownerName: null` 로 매핑한다.
- [ ] AC4: 같은 등록번호가 원천 목록에 중복으로 오면(페이지네이션 겹침 등) 1건으로 합쳐진다.

**실행 요약** (서비스 단위 테스트)

- [ ] AC5: 실행이 끝나면 `{ fetched, upserted, skipped }` 요약을 반환한다.
- [ ] AC6: 경기데이터드림 API가 재시도 후에도 실패하면(4xx/5xx) 에러를 던지고 종료한다 —
      부분 데이터로 조용히 끝나지 않는다.

**CLI**

- [ ] AC7: `bun run --cwd apps/api seed:sigungu -- 수원시` 실행 시 인자로 받은 시군을
      `SEED_TARGET_SIGUNGU` 기본값보다 우선한다.
- [ ] AC8: 실행 종료 시 콘솔에 `fetched/upserted/skipped` 요약을 출력한다.

## 영향 범위

- **만질 파일**
  - `apps/api/src/services/seedService.ts` (신규) — 변환·집계 순수 로직
  - `apps/api/src/lib/gyeonggiClient.ts` (신규) — 경기데이터드림 API 클라이언트
  - `apps/api/src/lib/kakaoGeocoder.ts` (신규) — 카카오 REST 지오코딩 클라이언트
  - `apps/api/src/scripts/seed-sigungu.ts` (신규) — CLI 진입점. 조립만 한다 (10-architecture)
  - `apps/api/package.json` — `seed:sigungu` 스크립트 추가
  - `apps/api/src/__tests__/unit/seedService.test.ts` (신규)
- **새 의존성**: 없음 (fetch 내장 사용)
- **기존 기능 영향**: 없음. `offices` 테이블 데이터가 채워질 뿐 스키마·API 계약 불변.

## 설계 메모

- **레이어**: `gyeonggiClient`·`kakaoGeocoder` 는 fetch 결과를 원시 타입으로 반환하는 얇은
  어댑터. `seedService` 가 이 둘을 인터페이스로 주입받아 변환·집계한다 — 실제 네트워크
  호출 없이 서비스 로직을 테스트하기 위해 (`officeService` 에서 쓴 것과 같은 패턴).
- **지오코딩 전략 (개정)**: 주소 검색 대신 카카오 keyword 검색을 `${법정동명} ${사무소명}`
  쿼리로 호출한다. 결과 후보 중 주소가 법정동명으로 시작하는(prefix 일치) 첫 건을 채택,
  없으면 null(AC2 skip). 카카오 API가 "경기도"를 "경기"로 축약해 돌려주는 문제만
  최소한으로 정규화한다 (원본의 17개 시도 정규화 표는 가져오지 않는다 — 이 명세는
  경기도만 다루므로 나머지는 YAGNI).
- **CLI 스크립트**(`seed-sigungu.ts`)는 env 로드 → 의존성 조립 → `seedService` 호출 →
  콘솔 출력만 한다. 비즈니스 로직을 스크립트에 직접 쓰지 않는다.
- **재시도**: 네트워크 실패(5xx, 타임아웃)만 1회 재시도. 4xx(요청 자체가 잘못됨)는 즉시 실패.
- **경기데이터드림 필드 후보** (데이터셋마다 필드명이 흔들려 순서대로 탐색):

  | 대상 | 후보 필드 (우선순위 순) |
  |---|---|
  | 사무소명 | `BIZMAN_CMPNM_INFO` |
  | 주소(=법정동명) | `LEGALDONG_NM` — 이 데이터셋엔 상세주소가 없다 |
  | 전화번호 | `TELNO_INFO` |
  | 대표자명 | `BRKR_NM` |
  | 시군명 | `SIGUN_NM` |
  | 등록번호(PK) | `COPRTN_REG_NO` — 없으면 `name-address` 조합으로 대체 (AC1) |

  응답 파싱: `{ [데이터셋명]: [{ head: [...] }, { row: [...] }] }` 에서 `row` 배열을 찾는다.
  `RESULT.CODE` 가 `INFO-000` 이 아니면 에러(AC6). WAF가 기본 UA를 차단하므로
  `User-Agent` 헤더를 명시한다. 페이지네이션은 `pIndex`/`pSize`(1000), 응답 행 수가
  `pSize` 미만이면 마지막 페이지로 판단한다. **주소 필드는 응답에 없다** — `LEGALDONG_NM`
  (예: "경기도 성남시 분당구")이 유일한 위치 정보다.
- **카카오 지오코딩 (개정)**: `/v2/local/search/keyword.json?query=<법정동명> <사무소명>`.
  후보 중 `road_address_name`/`address_name` 이 법정동명으로 시작하는 첫 건 채택.
  일치하는 후보가 없으면 `null`(AC2 스킵). 반경 제약(원본의 `center`+`radius`)은
  법정동명 prefix 필터만으로 충분한 정밀도가 나온다고 판단해 가져오지 않는다.

## 열린 질문 (해소됨 — 2026-08-15)

API 스펙은 원본 저장소(`real-estate-agent-review`)의 시딩 코드를 참고해 확정했다.
**예외 처리**: 이 실험은 소스 코드를 복사하지 않는 것이 통제변인인데, 이번 건은 사용자가
명시적으로 "API 호출 방식·필드명 참고는 허용"이라고 승인했다. 변환·검증·재시도 로직은
새로 짜고 그대로 옮기지 않는다 (근거: `docs/experiment.md` 예외 로그).

1. **서비스명·엔드포인트** → `GYEONGGI_API_BASE_URL` 아래 경로는 `Rlestatebrkragofc`
   (공인중개사무소 등록현황). 파라미터: `KEY`·`Type=json`·`pIndex`·`pSize`·`SIGUN_NM`.
   응답은 `{ [datasetName]: [{ head: [{list_total_count}, {RESULT:{CODE,MESSAGE}}] }, {row:[...]}]}`
   형태. 정상 코드는 `INFO-000`, 그 외는 에러로 취급한다. WAF가 기본 UA를 막으므로
   `User-Agent` 헤더를 명시해야 한다.
2. **필드명** → 사무소명 `BIZMAN_CMPNM_INFO`, 주소 `REFINE_LOTNO_ADDR`, 전화 `TELNO_INFO`,
   대표자명 `BRKR_NM`, 시군명 `SIGUN_NM`, 등록번호 `COPRTN_REG_NO`. 데이터셋마다 필드명이
   흔들려서 후보 배열로 순서대로 찾는다 (스키마 명세 표에 후보 전체 나열).
3. **지오코딩** → ~~`/v2/local/search/address.json` 단순 매칭만~~ **번복.** 실제 API 응답에
   주소 필드가 없어 이 전제가 깨졌다(위 "개정" 박스 참고). `/v2/local/search/keyword.json`
   으로 "법정동명 + 사무소명" 검색 + prefix 필터로 변경. 5단계 fallback·confidence
   스코어링은 계속 범위 밖 — 원본도 실제로는 `match_confidence` 컬럼을 구현하지 않았다.
4. **스킵 기록** → 콘솔 로그만 (결정대로). 별도 테이블 없음.
