# 명세: 카카오 Places 지역명 검색

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

`office-search-bar` 명세(구현됨)는 검색창에서 **우리 DB에 있는 사무소**의 이름·주소만
찾는다. "역삼동", "판교역" 같은 지역명·장소명은 애초에 사무소 이름/주소에 그 문자열이
그대로 들어있지 않은 이상 아무 결과도 나오지 않는다 — 사용자가 동네 이름으로 지도를
옮기고 싶을 때 검색창이 무용지물이 된다. `docs/product-spec.md` Phase 13의 마지막
남은 항목이자 `office-search-bar.md` "범위 밖"에서 명시적으로 뗐던 항목을 구현한다:
같은 검색창에서 카카오 Places API로 지역명·장소도 함께 찾아, 선택하면 지도만 그
위치로 이동시킨다(사무소가 아니므로 상세 패널은 열지 않는다).

## 범위 밖

- **지도 중심 기준 결과 편향(`location` 옵션)** — 카카오 Places API는 특정 좌표
  주변으로 결과를 우선 정렬하는 옵션을 지원하지만, 이번엔 전국 키워드 검색 그대로
  쓴다. 지도 화면과 무관하게 "역삼동"을 치면 항상 같은 결과가 나오는 편이 예측
  가능하다고 판단했다.
- **장소 결과 페이지네이션("더보기")** — 최대 3건 고정. 카카오 응답에 더 있어도
  자르기만 하고 추가 로드 UI는 만들지 않는다.
- **카테고리 필터링(음식점/편의점 등 제외)** — 키워드 검색 결과를 그대로 쓴다.
  지역명만 걸러내는 로직은 카카오 API 자체 기능이 아니라 범위 밖.
- **장소 검색 결과 캐싱/최근 검색어 저장** — 신규 기능이라 범위 밖.
- **검색어 매칭 부분 하이라이트(볼드 처리)** — `office-search-bar`와 동일한 이유로
  범위 밖.
- **모바일/좁은 화면 대응** — 기존 `OfficeSearchBar` 레이아웃을 그대로 확장하며,
  반응형 개선은 이 명세의 목적이 아니다.

## 수용 기준

**SDK 로드 (`apps/web/lib/kakaoMapSdk.ts`)**

- [x] AC1: `buildKakaoMapScriptUrl`이 반환하는 URL의 `libraries` 쿼리에
      `clusterer`와 `services`가 모두 포함된다(카카오 Places는 `services`
      라이브러리 없이 호출 시 `kakao.maps.services`가 `undefined`).

**`useKakaoPlacesSearch` 훅 (Vitest — `window.kakao.maps.services.Places` 모킹)**

- [x] AC2: 입력 후 300ms 안에 추가 입력이 없어야 `keywordSearch`를 호출한다
      (디바운스 — `useOfficeSearch`와 동일한 정책).
- [x] AC3: 입력을 지우면(빈 문자열) 호출 없이 결과가 비워진다.
- [x] AC4: 응답 결과가 3건을 넘어도 최대 3건까지만 담는다.
- [x] AC5: 상태가 `ZERO_RESULT`면 에러가 아니라 빈 배열로 처리한다.
- [x] AC6: 상태가 `ERROR`면 예외를 던지지 않고 에러 상태로만 남는다(화면 전체가
      깨지지 않는다).
- [x] AC7: 카카오 응답의 `y`(위도)·`x`(경도) 문자열을 숫자로 변환해 반환한다.

**`OfficeSearchBar` 확장 (Testing Library)**

- [x] AC8: 사무소 결과와 장소 결과가 모두 있으면 "사무소"/"장소" 두 섹션 라벨로
      나뉘어 보인다.
- [x] AC9: 한쪽 결과만 있으면(장소만, 또는 사무소만) 섹션 라벨 없이 기존처럼 단일
      목록으로 보인다(기존 `office-search-bar` AC13 동작 무회귀).
- [x] AC10: 방향키(↓/↑)가 사무소 목록 → 장소 목록을 하나의 연속된 목록으로
      순회한다(섹션 라벨은 하이라이트 대상이 아니고, 맨 끝에서 반대쪽 끝으로
      순환하지 않는다 — 기존 AC15 확장).
- [x] AC11: 장소 항목에서 Enter를 누르거나 클릭하면 그 장소로 `onSelectPlace`가
      호출된다(사무소 `onSelect`와 별개 콜백, 서로 혼동되지 않는다).
- [x] AC12: 사무소 결과, 장소 결과가 모두 없고 검색어가 있으면 기존처럼
      "검색 결과가 없습니다"가 보인다(둘 다 비어야 이 문구가 뜬다).
- [x] AC13: 사무소 검색이 에러여도(`useOfficeSearch`의 error) 기존처럼
      `ErrorState`가 보인다 — 장소 검색은 별도 네트워크 경로라 실패해도 이
      에러 표시에 영향을 주지 않는다(장소 섹션만 조용히 비게 된다).

**지도 연동 (`KakaoMap`, 브라우저 검증)**

- [x] AC14: 장소 결과를 선택하면 지도 중심이 그 좌표로 이동하고 레벨 3으로
      확대된다(`office-search-bar`의 `FOCUS_LEVEL` 재사용).
- [x] AC15: 장소 선택 시 사무소 상세 패널은 열리지 않는다.
- [x] AC16: 사무소 상세 패널이 열려 있는 상태에서 장소를 선택하면 그 패널이
      닫힌다(장소는 사무소가 아니므로 이전 사무소 패널이 남아있으면 혼란스럽다).

## 영향 범위

- **만질/새로 만들 파일**
  - `apps/web/lib/kakaoMapSdk.ts` — `libraries` 값을 `"clusterer,services"`로 변경
  - `apps/web/types/kakao.d.ts` — `kakao.maps.services` 네임스페이스 추가:
    `Places` 클래스(`keywordSearch(keyword, callback)`), `Status` enum
    (`OK`/`ZERO_RESULT`/`ERROR`), 결과 아이템 타입(`place_name`, `address_name`,
    `road_address_name`, `x`, `y`). `IKakaoNamespace.maps`에도 `services` 추가
  - `apps/web/hooks/useKakaoPlacesSearch.ts`(신규) — `useOfficeSearch`와 같은
    디바운스 패턴, 데이터 소스만 REST API 대신 `kakao.maps.services.Places`
  - `apps/web/components/OfficeSearchBar/OfficeSearchBar.tsx` — 사무소/장소 결과를
    하나의 `entries` 배열로 합쳐 `highlightedIndex`가 전체를 순회하도록 변경,
    섹션 라벨 렌더링, `onSelectPlace` prop 추가
  - `apps/web/components/KakaoMap/KakaoMap.tsx` — `handleSearchSelectPlace`
    핸들러 추가(`map.setCenter` + `setLevel(FOCUS_LEVEL)` + `clearSelection()`),
    `OfficeSearchBar`에 `onSelectPlace` 전달
  - 각 변경에 대응하는 테스트 다수(`kakaoMapSdk.test.ts` 갱신,
    `useKakaoPlacesSearch.test.ts` 신규, `OfficeSearchBar.test.tsx` 확장)

- **새 의존성**: 없음(카카오 SDK의 `services` 라이브러리는 이미 로드하는 SDK의
  일부 — 쿼리 파라미터만 추가하면 됨).

- **기존 기능 영향**
  - `useOfficeSearch`·`GET /api/offices/search`는 무변경 — 백엔드를 타지 않는
    완전히 별개의 클라이언트 사이드 데이터 소스가 추가되는 것뿐이다.
  - 기존 `onSelect`(사무소 선택) 동작·시그니처는 무변경.
  - `office-search-bar.md`의 AC13~AC19(단일 사무소 목록일 때의 동작)는 AC9로
    무회귀를 보장한다.

## 설계 메모

- **카카오 Places는 서버를 거치지 않는다**: `kakao.maps.services.Places`는
  브라우저에서 카카오 서버로 직접 요청하는 클라이언트 SDK 기능이다. 이미 로드된
  `NEXT_PUBLIC_KAKAO_JS_KEY` 하나로 동작하므로, 백엔드 라우트·계약(zod 스키마)
  추가가 필요 없다 — `office-search-bar`가 API+훅+컴포넌트 3계층이었던 것과
  달리 이번엔 훅+컴포넌트 2계층으로 끝난다.
- **`services` 라이브러리 로드 시점**: `KakaoMap.tsx`는 `kakao.maps.load(callback)`
  콜백 안에서 `status`를 `"loaded"`로 바꾸고, `OfficeSearchBar`는 `status ===
  "loaded"`일 때만 마운트된다. `kakao.maps.load`의 콜백은 SDK URL에 요청한 모든
  라이브러리(이번엔 `clusterer`+`services`)가 준비된 뒤에 실행되므로, 검색바가
  마운트되는 시점엔 이미 `window.kakao.maps.services`가 존재한다고 가정해도 된다.
- **섹션 라벨은 "둘 다 있을 때만"**: 검색어 대부분은 사무소 DB에서 결과가
  잡히는 기존 케이스일 것이므로, 매번 "사무소" 라벨을 새로 붙이면 기존 화면에
  불필요한 시각적 변화가 생긴다. 두 종류가 동시에 보일 때만 구분이 실제로
  필요하다고 보고, 그때만 라벨을 렌더링한다(AC8·AC9).
- **에러 처리는 비대칭이다**: 사무소 검색 실패는 기존처럼 화면 전체에 에러를
  보여준다(사무소 검색이 이 컴포넌트의 원래 목적이었으므로). 장소 검색 실패는
  부가 기능 실패로 취급해 장소 섹션만 조용히 빈 채로 둔다 — 카카오 SDK 요청
  실패로 전체 검색 UX가 막히는 것을 피한다(AC13).
- **`FOCUS_LEVEL` 재사용**: 사무소 선택 때와 동일하게 레벨 3을 쓴다. 장소도
  "그 지점을 확대해서 본다"는 목적이 같아 별도 상수를 만들 이유가 없다.

## 열린 질문

없음 — "범위 밖"에서 결정한 지점(위치 편향 없음, 페이지네이션 없음, 카테고리
필터 없음, 라벨은 두 섹션이 공존할 때만)에 이견이 없으면 `/impl`로 진행한다.

## 실행 결과 (2026-08-27)

- **AC1~AC13**: Vitest 신규 23건(kakaoMapSdk 1 + useKakaoPlacesSearch 6 +
  OfficeSearchBar 7, 기존 10건 포함 총 17건) 전부 통과, 기존 회귀 없음. 타입체크
  통과(`kakao.maps.services.Places`/`Status` 선언 포함).
- **AC14~AC16(브라우저)**: `bun run dev --port 3000`에서 "판교역"을 검색해
  검증. "사무소" 8건 + "장소" 3건("판교역 신분당선"·"판교역(경기)"·"판교역
  경강선")이 두 섹션으로 정확히 나뉘어 보였다. 사무소 패널을 먼저 연 뒤 장소를
  선택하니 패널이 닫히고 지도가 그 좌표(37.39~37.40, 127.10~127.12 부근, 판교역
  실좌표와 일치)로 이동·확대됐다(AC14·AC16 확인). 장소 선택 시 사무소 패널이
  새로 열리지 않는 것도 확인(AC15).
- **브라우저 검증에서 심각한 실버그 1건 발견·수정**: 유닛 테스트는 전부
  통과했지만 실제 브라우저에서 지도가 "지도를 불러오는 중입니다…"에 영원히
  멈춰 있었다. 원인 추적 결과 — `buildKakaoMapScriptUrl`이
  `URLSearchParams.set("libraries", "clusterer,services")`로 URL을 만들면
  콤마가 `%2C`로 인코딩되는데, 카카오 SDK의 부트스트랩 코드는 자기
  `<script src>`의 쿼리스트링을 `decodeURIComponent` 없이 정규식으로 직접
  파싱해 콤마로 `split`한다. `%2C`는 리터럴 콤마가 아니므로 split이 안 돼
  `"clusterer%2Cservices"`라는 존재하지 않는 라이브러리 키 하나로 취급되고,
  내부적으로 `src=""`인 빈 스크립트 태그를 만들어 그 `onload`를 영원히 기다리게
  된다 — `kakao.maps.load()`의 콜백이 다시는 안 불려 지도 생성 자체가 멈춘다.
  **유닛 테스트로는 못 잡는 버그였다**: `new URL(rawUrl).searchParams.get(...)`로
  검증하면 `URL` 객체가 다시 디코딩해줘서 `%2C`든 리터럴 콤마든 똑같이
  `"clusterer,services"`로 보였기 때문. `buildKakaoMapScriptUrl`을
  `URLSearchParams` 대신 `libraries` 파라미터만 리터럴 콤마로 직접 문자열
  결합하도록 고치고, 원본 문자열에 `%2C`가 없는지 직접 검사하는 테스트를
  추가해 재발을 막았다. 마커 클러스터링(Phase 13 이전)이 라이브러리를 1개만
  요청했을 때는 콤마 자체가 없어 이 버그가 드러나지 않았던 것 — 2개 이상의
  라이브러리를 요청하는 이번이 처음이라 지금 발견됐다.
