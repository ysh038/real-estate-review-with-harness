# 명세: 사무소 검색바

- 작성일: 2026-08-26
- 상태: 구현됨

## 목표

지도에서 사무소를 찾으려면 지금은 직접 지도를 움직여 마커를 찾는 방법뿐이다. 특정
사무소 이름이나 주소를 알고 있어도 검색할 방법이 없다. `docs/product-spec.md`
Phase 13의 핵심 항목 — 이름/주소로 사무소를 검색하고, 선택하면 지도가 그 위치로
이동하며 상세 패널이 열리는 검색바를 추가한다.

## 범위 밖

- **카카오 Places 키워드 검색(주소·지역명 병렬 섹션)** — 원본은 사무소 검색과 별도로
  카카오 Places API로 "역삼동" 같은 지역명도 함께 보여준다. 이건 완전히 다른 데이터
  소스(카카오 API 직접 호출) + 별도 UI 섹션이 필요한 독립 기능이라 범위가 커진다.
  이번엔 **우리 DB의 사무소 이름·주소 검색**까지만 하고, 지역명 검색은 별도 명세로
  뗀다. 인터페이스만 참고하고 구현 코드는 가져오지 않는다는 원칙은 그때도 유지한다
  (`docs/decisions.md` #9 통제변인).
- **검색어 매칭 부분 하이라이트(볼드 처리)** — 원본에도 명시되지 않았고 지금 범위가
  아니다.
- **최근 검색어 저장·자동완성 히스토리** — 신규 기능이라 범위 밖.
- **태그 집계(`tagCounts`)를 검색 결과에 포함** — 검색 결과 드롭다운은 이름·주소만
  보여주고, 선택 후 열리는 상세 패널도 태그는 `ReviewSection`이 별도로 다시 조회해
  보여준다(`OfficeDetailPanel`은애초에 `tagCounts`를 렌더링하지 않는다). 검색
  응답에서까지 태그 집계 쿼리를 추가로 돌릴 이유가 없어 항상 빈 배열로 둔다.

## 수용 기준

**계약 (`packages/types/src/office.ts`)**

- [x] AC1: `officeSearchQuerySchema`는 `q`가 빈 문자열이면 거부한다.
- [x] AC2: `officeSearchResponseSchema`는 `officeSummarySchema` 배열이다.

**API (`GET /api/offices/search`)**

- [x] AC3: `q` 파라미터가 없거나 빈 문자열이면 400.
- [x] AC4: 사무소 이름에 `q`가 포함되면(대소문자 무시) 결과에 포함된다.
- [x] AC5: 주소에 `q`가 포함되면 결과에 포함된다.
- [x] AC6: 결과는 리뷰 수(숨김 제외) 내림차순으로 정렬된다.
- [x] AC7: 매칭이 8건을 넘어도 최대 8건까지만 반환한다.
- [x] AC8: 매칭되는 사무소가 없으면 빈 배열을 반환한다(에러 아님).
- [x] AC9: 검색어에 `%`·`_` 같은 SQL 와일드카드 문자가 있어도 리터럴로 취급된다
      (와일드카드로 해석돼 엉뚱하게 결과가 늘어나지 않는다).

**`useOfficeSearch` 훅 (Vitest — `officesApi` 모킹)**

- [x] AC10: 입력 후 300ms 안에 추가 입력이 없어야 검색을 요청한다(디바운스).
- [x] AC11: 입력을 지우면(빈 문자열) 요청 없이 결과가 비워진다.
- [x] AC12: 조회가 실패해도 예외를 던지지 않고 에러 상태로만 남는다.

**`OfficeSearchBar` 컴포넌트 (Testing Library)**

- [x] AC13: 결과가 있으면 목록이 드롭다운으로 보인다.
- [x] AC14: 결과가 없고 검색어가 있으면 "검색 결과가 없습니다" 문구가 보인다.
- [x] AC15: 방향키(↓/↑)로 항목 간 하이라이트가 이동한다(맨 끝에서 반대쪽 끝으로
      순환하지 않는다).
- [x] AC16: Enter를 누르면 하이라이트된 항목으로 `onSelect`가 호출된다.
- [x] AC17: Escape를 누르면 드롭다운이 닫힌다.
- [x] AC18: `role="combobox"` + `aria-expanded`+ `aria-controls`+
      `aria-activedescendant`가 상태에 맞게 붙는다.
- [x] AC19: 목록 항목을 클릭하면 그 사무소로 `onSelect`가 호출된다.

**지도 연동 (`KakaoMap`·`useOfficeMarkers`, 브라우저 검증)**

- [x] AC20: 검색 결과를 선택하면 지도 중심이 그 사무소 좌표로 이동하고 레벨 3으로
      확대된다.
- [x] AC21: 선택 즉시 해당 사무소의 상세 패널이 열린다(마커 클릭 없이).

## 영향 범위

- **만질/새로 만들 파일**
  - `packages/types/src/office.ts` — `officeSearchQuerySchema`·
    `officeSearchResponseSchema` 추가
  - `apps/api/src/repositories/officeRepository.ts` — `searchByQuery(query, limit)`:
    `ilike(name) OR ilike(address)`, 비숨김 리뷰 수로 LEFT JOIN + `GROUP BY` +
    `ORDER BY count DESC`. `%`·`_`·`\` 이스케이프 헬퍼 추가
  - `apps/api/src/services/officeService.ts` — `IOfficeSearchRepository`,
    `search(query)`, `MAX_SEARCH_RESULTS = 8`
  - `apps/api/src/routes/offices.ts` — `GET /search` 라우트. **`/:id`보다 먼저
    등록해야 한다** — 안 그러면 Hono가 `/search`를 `id="search"`로 매칭해버린다
  - `apps/web/lib/officesApi.ts` — `searchOffices(query, baseUrl)`
  - `apps/web/hooks/useOfficeSearch.ts`(신규) — 디바운스 + 조회 상태
  - `apps/web/components/OfficeSearchBar/`(신규) — combobox UI, 키보드 탐색
  - `apps/web/hooks/useOfficeMarkers.ts` — `selectOffice(office)` 추가(토글 없이
    바로 선택 — 검색으로 고른 사무소는 항상 열려야 한다, 마커 클릭의 토글 동작과는
    다른 요구)
  - `apps/web/components/KakaoMap/KakaoMap.tsx` — `OfficeSearchBar` 렌더,
    `onSelect`에서 `map.setCenter` + `map.setLevel(3)` + `selectOffice` 호출
    (처음엔 `panTo`로 짰다가 브라우저 검증에서 경합을 발견해 `setCenter`로 교체 —
    아래 설계 메모)
  - 각 변경에 대응하는 테스트 다수

- **새 의존성**: 없음.

- **기존 기능 영향**
  - `useOfficeMarkers`의 기존 `handleMarkerClick`(토글) 동작은 무변경 — `selectOffice`는
    별도의 새 함수다.
  - bbox 마커 렌더링·클러스터링·딥링크(`initialOffice`)는 이 명세와 독립적으로 계속
    동작한다.

## 설계 메모

- **검색 선택 시 `offices` 목록이 아직 그 사무소를 안 담고 있어도 패널이 열려야
  한다**: 딥링크(office-detail-route-and-deeplink)와 같은 문제라 같은 해법을
  쓴다 — `useOfficeMarkers`의 AC5 "화면 밖이면 정리" 이펙트는 `offices` 값이
  바뀔 때만 실행되므로, `selectOffice` 호출 자체는 그 이펙트를 건드리지 않는다.
  지도가 `panTo`로 이동하면 `bounds_changed` → 300ms 뒤 새 bbox 조회가 오고,
  그 안에 방금 선택한 사무소가 포함돼 있을 것이므로 자연히 유지된다.
  경계에 걸리는 극단적 경우(레벨 3의 좁은 화면 밖으로 밀려나는 경우)는
  office-detail-route-and-deeplink와 동일하게 이번에도 별도 보정 없이 둔다.
- **`tagCounts: []` 고정**: `OfficeSummary` 타입이 이 필드를 요구하지만
  `OfficeDetailPanel`은 이를 렌더링하지 않는다(리뷰 태그는 `ReviewSection`이 상세
  조회로 따로 얻는다) — 검색 결과에서 값을 채워 넣을 실익이 없어 빈 배열로 고정한다.
- **라우트 등록 순서**: Hono는 등록 순서대로 매칭을 시도한다. `/:id`를 먼저 등록하면
  `/search` 요청이 `id="search"`로 잘못 해석돼 404(사무소 없음)로 응답한다 — 반드시
  `/search`를 `/:id`보다 먼저 등록한다.
- **`panTo` 대신 `setCenter`를 쓰는 이유(브라우저 검증에서 발견)**: 처음엔
  `map.panTo(latlng)`(애니메이션) 다음 줄에 `map.setLevel(3)`을 바로 불렀는데,
  실제 브라우저에서 확인하니 지도 중심이 검색한 사무소가 아니라 이전 위치 근처에
  그대로 남았다. `panTo`는 비동기 애니메이션인데 `setLevel`이 동기적으로 즉시
  실행돼 애니메이션이 시작하자마자 잘려버린 것 — 애니메이션이 몇 프레임밖에 못
  간 상태에서 확대만 적용된 셈이다. `setCenter`(즉시 이동)로 바꿔 두 호출 다
  동기적으로 끝나게 해 경합을 없앴다.

## 열린 질문

없음 — "범위 밖"에서 원본과 다르게 간 지점(카카오 Places 지역명 검색 제외,
tagCounts 항상 빈 배열)에 이견이 없으면 `/impl`로 진행한다.

## 실행 결과 (2026-08-26)

- **AC1~AC19**: Vitest 신규 20건 전부 통과(officesApi 2 + useOfficeSearch 4 +
  OfficeSearchBar 7 + useOfficeMarkers 1 + officeSearchRoute 6), 기존 회귀 없음.
  AC4~AC9는 새로 만든 `app_test` 통합 테스트 DB로 실제 Postgres ILIKE·정렬·
  와일드카드 이스케이프까지 확인(9/9 통과) — 이 과정에서 실제 버그 1건을 잡았다:
  `ORDER BY`가 `.select()`에 없는 별칭(`review_count`)을 참조해
  `column "review_count" does not exist`로 매 요청이 실패하고 있었다. 별칭 대신
  집계식(`desc(count(reviews.id))`)을 직접 반복하는 방식(기존 `findTopTagCounts...`
  와 같은 패턴)으로 고쳤다.
- **AC20·AC21(브라우저)**: `bun run dev --port 3000`으로 실제 시딩 데이터
  "산성부동산중개인"을 검색·선택해 확인. **여기서 두 번째 실제 버그를 발견했다**:
  `panTo` + 곧바로 `setLevel` 호출 조합이 팬 애니메이션을 끊어버려 지도가
  검색한 사무소가 아니라 원래 위치(성남시청) 근처에 머무는 문제 — 네트워크 요청의
  bbox 중심 좌표를 실제로 비교해 확인했다. `setCenter`로 교체 후 재검증: bbox
  중심이 검색한 사무소 좌표(37.4482, 127.1578)와 정확히 일치했고, 상세 패널도
  마커 클릭 없이 정상적으로 열렸다.
- **버그 2건 모두 브라우저 검증 단계에서 발견·수정**: 두 버그 다 Vitest 유닛
  테스트로는 잡을 수 없었다(첫 번째는 실DB SQL 오류, 두 번째는 실제 SDK의 비동기
  애니메이션 타이밍) — 이번 스펙에서 "브라우저 검증"을 별도 AC로 명시해 둔 게
  실제로 값을 했다.
