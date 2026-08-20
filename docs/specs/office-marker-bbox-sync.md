# 명세: bbox 기준 오피스 마커 동적 로딩

- 작성일: 2026-08-20
- 상태: 구현됨

## 목표

지도(`KakaoMap`)는 렌더링만 되고 마커가 없다. `GET /api/offices?bbox=`(구현됨)와 지도 렌더링(구현됨)을
연결해, 사용자가 보는 화면 영역(bbox) 안의 중개업소를 마커로 표시한다. 지도를 옮기면 그 화면에 맞는
마커로 갱신된다. 연속 이동(드래그) 중 매 프레임 API를 부르지 않도록 300ms debounce로 묶는다.

## 범위 밖

- **마커 클러스터링** — 다음 명세 (product-spec MVP 다음 항목). 이번엔 마커가 겹쳐도 그대로 둔다.
- **마커 클릭 → 사이드 패널** — 다음 명세. 이번 마커는 클릭 핸들러가 없다.
- **마커 아이콘 커스터마이징·`avgRating` 색상 그라데이션** — product-spec "하지 않기로 한 것".
- **`isTruncated` 시 자동 줌 조정 등 고급 UX** — 안내 문구 표시까지만 하고, 그 이상의 유도 동작은 안 한다.
- **실패한 조회의 재시도(backoff 등)** — 다음 이동에서 자연히 재조회되는 것으로 충분하다고 본다.
- **지도 이동 상태 URL 반영** — kakao-map-render 명세와 동일하게 이번에도 범위 밖.

## 수용 기준

**순수 로직 / 훅** (Vitest 단위 테스트 — `window.kakao` 실제 SDK 없이, 최소 인터페이스로 목업)

- [x] AC1: 카카오 `LatLngBounds`(남서/북동 좌표)를 API 쿼리용 bbox 객체
      (`{minLng, minLat, maxLng, maxLat}`)로 변환한다.
- [x] AC2: bbox로 오피스를 조회해 성공하면 응답의 `offices` 배열과 `isTruncated` 값을 그대로 노출한다.
- [x] AC3: 오피스 조회가 실패(네트워크 오류·비-2xx)하면 예외를 던지지 않고, 직전 오피스 목록을
      그대로 유지한다 (지도가 깨지지 않는다).
- [x] AC4: 지도 이동 이벤트(`bounds_changed`)가 300ms 안에 연속으로 여러 번 발생하면, 마지막 이벤트로부터
      300ms 동안 추가 이벤트가 없을 때 조회 함수가 **1번만** 호출된다.
- [x] AC5: 언마운트 시 대기 중인 debounce 타이머가 취소되고 지도 이벤트 리스너가 해제된다 —
      언마운트 이후 뒤늦게 도착하는 콜백이 상태를 갱신하지 않는다.

**컴포넌트 동작** (실제 카카오 SDK·DOM 필요 — `bun run dev` 브라우저 확인, kakao-map-render 명세와 동일 방식)

- [x] AC6: 지도가 처음 로드되면(사용자가 움직이기 전) 초기 화면 bbox 기준 마커가 이미 표시돼 있다.
- [x] AC7: 지도를 드래그하거나 줌을 바꾸면, 정지 후 약 300ms 뒤 새 bbox의 마커로 갱신되고
      이전 마커는 지도에서 사라진다 (잔류 마커 없음).
- [x] AC8: API 응답이 `isTruncated: true`면 "일부만 표시됨" 안내 문구가 보인다.
- [x] AC9: bbox 조회가 실패해도(API 서버 다운 등) 지도 자체는 깨지지 않고 이전 마커가 그대로 남는다.
- [x] AC10: 마커에 마우스를 올리면 사무소명이 노출된다 (네이티브 title 툴팁, 클릭 동작은 범위 밖).

## 영향 범위

- **만질 파일**
  - `apps/web/lib/kakaoBounds.ts` (신규) — `toBboxQuery`: `LatLngBounds` → bbox 쿼리 객체 (AC1)
  - `apps/web/lib/officesApi.ts` (신규) — `fetchOfficesByBbox(bbox)`: URL 조립 + fetch +
    `@repo/types`의 `officesByBboxResponseSchema`로 파싱
  - `apps/web/lib/kakaoMapEvents.ts`, `apps/web/lib/kakaoMarkers.ts` (신규) — `window.kakao.maps.event`·
    `Marker`를 얇게 감싼 어댑터. 훅 테스트에서 실제 SDK 없이 모킹하기 위한 경계 (설계 메모 참고)
  - `apps/web/hooks/useOfficeMarkers.ts` (신규) — `map` 인스턴스를 받아 `bounds_changed` 구독,
    300ms debounce, `fetchOfficesByBbox` 호출, 마커 생성/제거, `offices`·`isTruncated` 상태 노출
  - `apps/web/components/KakaoMap/KakaoMap.tsx` — 지도 생성 후 `useOfficeMarkers(map)` 호출,
    `isTruncated` 안내 문구 렌더
  - `apps/web/components/KakaoMap/KakaoMap.module.css` — 안내 문구 스타일 (토큰만 사용)
  - `apps/web/types/kakao.d.ts` — `LatLngBounds`, `Marker`, `event.addListener/removeListener`,
    `Map.getBounds()` 타입 추가 (기존엔 지도 렌더링 최소 타입만 있었다 — kakao-map-render 명세의
    "열린 질문 3"에서 이번 명세로 넘긴 대로)
  - `apps/web/__tests__/unit/kakaoBounds.test.ts`, `officesApi.test.ts`,
    `useOfficeMarkers.test.ts` (신규, `renderHook` + fake timers)
  - `apps/api/src/app.ts` — CORS 미들웨어 추가 (브라우저 검증 중 발견, 아래 "실행 결과" 참고)
  - `apps/api/src/__tests__/unit/cors.test.ts` (신규)
- **새 의존성**: `@testing-library/react`, `jsdom` (devDependency, web 워크스페이스 최초 도입 —
  훅 테스트에 `renderHook`이 필요해 `vitest.config.ts`의 `environment`를 `node`→`jsdom`으로 변경).
  런타임 의존성은 없음 (fetch 내장, `@repo/types`는 이미 workspace 의존, `hono/cors`는 `hono` 서브모듈)
- **기존 기능 영향**: `KakaoMap`이 내부적으로 마커 훅을 호출하도록 확장된다.
  kakao-map-render 명세의 AC1~AC7(SDK 로드·렌더링)은 그대로 유지, 회귀 없음(아래 실행 결과).
  `apps/api`의 모든 라우트가 CORS 응답 헤더를 갖게 된다(공개 조회 API라 origin 전체 허용).

## 설계 메모

- **레이어**: `lib/officesApi.ts`(순수 fetch) → `hooks/useOfficeMarkers.ts`(오케스트레이션) →
  `components/KakaoMap`(프레젠테이션+훅 호출). `10-architecture`의 web 레이어 순서를 따른다.
- **디바운스 트리거**: `dragend`나 `idle`이 아니라 `bounds_changed`를 쓰고 훅에서 직접 300ms
  디바운스한다 — product-spec이 명시적으로 "300ms debounce"를 요구하므로, SDK의 `idle` 이벤트에
  기대는 대신 우리가 직접 타이밍을 제어한다.
- **마커 갱신 전략**: 매 조회 성공 시 기존 마커를 전부 지도에서 제거하고 새 목록으로 다시 그린다
  (diff 갱신 아님). 이번 규모(bbox당 상한 500건)에서 diff 최적화는 과설계라고 판단 — 느려지면
  그때 재검토.
- **테스트 이중화**: `useOfficeMarkers`는 `kakao.maps.Map` 전체가 아니라 이 훅이 실제로 쓰는
  최소 동작(`addListener`/`removeListener`/`getBounds`)만 있는 값을 받는다고 가정하고 테스트에서는
  그 모양의 목업 객체를 넘긴다. TS 구조적 타이핑으로 실제 `kakao.maps.Map`도 그대로 만족한다.

## 실행 결과 (브라우저 검증, 2026-08-20)

- **AC1~AC5**: Vitest 12개 통과 (`kakaoBounds` 1, `officesApi` 3, `useOfficeMarkers` 5,
  기존 `kakaoMapSdk` 3).
- **AC6~AC10**: 로컬 Postgres에 검증용 오피스 515건(성남 인근 명명 5건 + 트렁케이션 재현용
  더미 510건)을 임시로 넣고 `bun run dev` 브라우저로 확인. 확인 과정에서 이 명세 범위를
  벗어난 이슈 2개를 만나 함께 고쳤다(둘 다 커밋에 포함):
  - **CORS 미설정(실제 버그, 수정 완료)** — `apps/web`(3000/3001)에서 `apps/api`(8788)로 직접
    fetch하는 게 이 저장소 최초라 지금까지 드러나지 않았다. 브라우저가 전부 차단했고, 콘솔에
    `blocked by CORS policy`만 찍혔다. `apps/api/src/app.ts`에 `hono/cors` 추가로 해결 —
    지금은 인증 쿠키가 없는 공개 API라 origin을 넓게 허용했다(Phase 1 OAuth에서 재검토).
    **이 실패가 AC3/AC9(조회 실패 시 우아한 처리)를 의도치 않게 실증했다** — CORS로 막힌 동안
    지도는 깨지지 않고 에러만 로깅됐다.
  - **안내 문구가 지도 레이어에 가려짐(실제 버그, 수정 완료)** — AC8 문구가 DOM에는 렌더링됐지만
    (`getBoundingClientRect`로 확인) 화면엔 안 보였다. `document.elementFromPoint`로 확인하니
    카카오 SDK 내부 타일 레이어가 위를 덮고 있었다 — `z-index: 1`이 카카오 내부 레이어보다
    낮았다. `z-index: 10`으로 올려 해결.
  - kakao-map-render 명세의 AC1~AC7(SDK 로드·렌더링)은 회귀 없이 그대로 동작했다.
- **카카오 도메인 등록 갭(`docs/decisions.md` 미해결 항목)이 검증을 한 번 더 막았다** — 이
  저장소 기본 포트(3001)가 여전히 미등록이라, 원본 저장소의 `app-web` 컨테이너(포트 3000,
  이미 실행 중이었다)를 사용자 승인 하에 `docker stop app-web`으로 잠시 내리고 그 포트에서
  검증한 뒤 `docker start app-web`으로 복구했다. 근본 해결(콘솔에 3001 등록)은 여전히
  미해결 — 다음에 이 포트로 검증하려는 사람은 같은 절차를 반복하게 된다.

## 열린 질문 (해소됨 — 2026-08-20)

1. **`isTruncated` 안내 문구 포함 여부(AC8)** → 포함한다. API가 이미 내려주는 필드를 묵히면
   사용자가 마커 누락 사실을 알 방법이 없다.
2. **로컬 `.env`의 포트가 원본 저장소 값으로 돼 있던 문제** → `.env.example`(`8788`/`5433`)에
   맞춰 수정 완료. 부수적으로 파일이 `GYEONGGI_API_BASE_URL` 중간에서 잘려 있어(`시딩` 관련
   변수 3개 유실) 함께 복구했다 — 단 `KAKAO_REST_API_KEY`는 실제 값을 알 수 없어 빈 값으로
   남김(이번 기능엔 불필요, 시딩 재실행 시에만 필요).
