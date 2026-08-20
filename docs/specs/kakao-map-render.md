# 명세: 카카오 지도 SDK 로드 + 렌더링

- 작성일: 2026-08-19
- 상태: 구현됨 (레벨·도메인 후속 결정 대기 — docs/decisions.md)

## 목표

`/`(홈) 화면에 아직 지도가 없다 — "지도 화면은 아직 구현 전입니다" 플레이스홀더뿐이다.
카카오 지도 JS SDK를 로드하고 기본 지도를 렌더링해, 이후 작업(bbox 마커 로딩·클러스터링·
사이드 패널)이 올라갈 화면을 만든다. 이 명세는 **SDK 로드 + 빈 지도 렌더링까지만** —
마커·bbox API 연동은 다음 명세.

## 범위 밖

- **마커 표시·bbox 기준 동적 로딩** — 다음 명세 (product-spec MVP 다음 항목)
- **마커 클러스터링·사이드 패널·검색** — 이후 명세
- **지도 이동/줌 상태를 URL에 반영** — 이번엔 컴포넌트 로컬 상태로 충분
- **모바일 터치 제스처 커스터마이징** — 카카오 SDK 기본 동작 그대로 사용

## 수용 기준

**순수 로직** (Vitest 단위 테스트, DOM 불필요)

- [x] AC1: 주어진 앱키로 카카오 SDK 스크립트 URL을 만들면 `appkey=<키>`와 `autoload=false`
      쿼리가 포함된다. (`autoload=false`인 이유: 스크립트 로드 완료 후 우리가 직접
      `kakao.maps.load()`를 불러 초기화 타이밍을 제어하기 위해)
- [x] AC2: 앱키가 빈 문자열이면 스크립트 URL을 만들지 않고 에러를 던진다 — 빈 키로
      카카오 서버에 요청을 보내는 것 자체가 낭비이자 잘못된 상태다.

**컴포넌트 동작** (브라우저 실행으로 확인 — 아래 "검증 방법" 참고)

- [x] AC3: 페이지 첫 진입 시 지도 대신 로딩 상태 문구가 보인다.
- [x] AC4: SDK 로드와 지도 초기화가 끝나면 로딩 문구가 사라지고 지도 캔버스가 보인다.
- [x] AC5: 지도는 성남시청(37.4201, 127.1265) 중심, 레벨 8로 렌더링된다. **단**, 레벨 8이
      "시 전체" 라는 원래 의도보다 훨씬 넓게(성남·용인·이천 아우름) 나온다는 걸 실제로
      확인했다 — 레벨 값 자체는 후속 결정 사항(`docs/decisions.md`).
- [x] AC6: SDK 스크립트 로드 자체가 실패하면(네트워크 차단 등) 에러 문구가 보이고
      빈 화면으로 멈추지 않는다.
- [x] AC7: 같은 페이지 안에서 컴포넌트가 리마운트돼도 스크립트 태그가 중복 삽입되지 않는다
      (Next.js `<Script strategy="afterInteractive">` 의 기본 동작으로 충족 — 별도 구현 불필요,
      리마운트 후에도 지도가 정상 렌더링되는지만 확인).

## 검증 방법

AC1·AC2는 Vitest로 자동화한다. AC3~AC7은 외부 SDK·실제 DOM·네트워크가 얽혀 있어
자동 테스트 대신 **`bun run dev` 로 브라우저에서 직접 확인**한다 (콘솔 에러 없음 포함) —
이 프로젝트가 DB 통합 테스트·시딩 CLI를 실행 검증으로 확인해온 것과 같은 방식.

## 실행 결과 (브라우저 검증, 2026-08-19)

- **AC1·AC2**: Vitest 3개 통과.
- **AC3~AC6**: 브라우저에서 실제 확인. 확인 과정에서 이 명세 범위를 벗어난 이슈 2개를 만났다:
  - **도메인 미등록(401)** — `.env` 앱키가 `localhost:3001`(이 저장소 기본 포트)에 대해
    카카오 콘솔에 등록돼 있지 않아 처음엔 AC6(에러 상태)만 확인됐다. 원본 FE를 끄고
    `localhost:3000`으로 임시 실행해 AC3~AC5까지 마저 확인했다. **저장소 기본값은 안 바꿨다**
    — 다음 사람이 `bun run dev`(3001)로 켜면 다시 401이 난다. 후속 결정: `docs/decisions.md`.
  - **CSS 로딩 레이스(실제 버그, 수정 완료)** — 지도가 컨테이너 왼쪽 위 구석에만 렌더링되고
    나머지는 빈 타일이었다. CSS 모듈 청크가 스크립트와 별도로 비동기 로드되는데, 카카오
    SDK가 지도를 만드는 시점에 컨테이너가 아직 최종 크기가 아니었을 수 있고, 카카오는
    컨테이너 크기 변화를 스스로 감지하지 못한다(`relayout()`을 직접 불러야 함).
    `ResizeObserver` 로 고쳤다 — `KakaoMap.tsx`, `types/kakao.d.ts` 에 `relayout()` 추가.
- **AC7**: HMR로 실제 리마운트를 유발해 `dapi.kakao.com/v2/maps/sdk.js` 태그가 여전히
  1개인 것과 리마운트 후에도 지도가 정상 렌더링되는 것을 확인.

### 구현 중 발견한 하네스 갭 2개 (docs/experiment.md 에도 기록)

- `apps/web` lint를 `eslint app` → `eslint .` 로 넓히자(새 폴더 lib/components/tests가
  빠지는 문제 방지) Next.js가 만드는 `.next/types/**` 코드생성 파일까지 명명 규칙에 걸림 →
  전역 ignore 블록 추가.
- `types/kakao.d.ts` 의 `declare global { interface Window }` 는 DOM 전역과 이름이 정확히
  같아야 병합되는데 명명 규칙이 `IWindow` 를 요구해 충돌 → `.d.ts` 파일 예외 추가.
- `apps/web` typecheck가 `next.config.ts` 의 `typedRoutes` 가 만드는 `.next/types/**` 를
  참조하는데 `turbo.json` 에 그 의존관계가 없어, `typecheck`+`build` 를 같이 돌리면
  레이스로 실패 → `turbo.json` 의 `web#typecheck` 에 `dependsOn: ["build"]` 추가.

## 영향 범위

- **만질 파일**
  - `apps/web/lib/kakaoMapSdk.ts` (신규) — 스크립트 URL 빌더 (순수 함수, AC1/AC2)
  - `apps/web/components/KakaoMap/KakaoMap.tsx` (신규) — SDK 로드 + 지도 렌더링
  - `apps/web/components/KakaoMap/KakaoMap.module.css` (신규) — 지도 컨테이너 스타일
  - `apps/web/components/KakaoMap/index.ts` (신규) — 공개 API
  - `apps/web/app/page.tsx` — 플레이스홀더를 `<KakaoMap />` 으로 교체
  - `apps/web/types/kakao.d.ts` (신규) — `window.kakao` 최소 타입 선언
  - `apps/web/vitest.config.ts`, `apps/web/package.json` — vitest 추가 (web 최초)
- **새 의존성**: `vitest` (devDependency, web 워크스페이스 최초 도입). 카카오 SDK는
  npm 패키지가 아니라 스크립트 태그로 로드 — 런타임 의존성 추가 없음.
- **기존 기능 영향**: 없음. `/health`·`/api/offices` 계약 불변.

## 설계 메모

- **SDK 로드 방식**: `next/script`의 `<Script strategy="afterInteractive" onLoad={...} onError={...}>`.
  Next.js가 스크립트 중복 삽입을 자체 관리해준다(AC7). 커뮤니티 래퍼 라이브러리
  (`react-kakao-maps-sdk` 등)는 쓰지 않는다 — 이번 화면에 필요한 건 로드+렌더링뿐이라
  직접 제어가 더 간단하고, 마커·클러스터링에서 카카오 네이티브 API를 어차피 직접 써야 한다.
- **레이어**: `lib/kakaoMapSdk.ts` 는 순수 함수(URL 빌더)만. DOM·React 의존 없음 → 단위 테스트.
  `components/KakaoMap/`은 `use client` 컴포넌트, `next/script` + `window.kakao` 사용.
- **디자인시스템**: 로딩·에러 문구는 이번엔 `apps/web/design-system/tokens.css` 색상 토큰만
  써서 인라인으로 처리한다(Storybook 미설치 상태 — `/ds-init`은 재사용 가능한 컴포넌트가
  실제로 여러 화면에 필요해지는 시점으로 미룬다. 지금은 지도 화면 하나뿐).
- **web 워크스페이스 최초 테스트 도입**: `vitest.config.ts` 를 `environment: "node"` 로 둔다
  (React Testing Library·jsdom은 이번 범위(순수 함수만 테스트)에 불필요 — 필요해지면
  그때 추가한다, YAGNI).

## 열린 질문 (해소됨 — 2026-08-19)

1. **중심좌표·레벨** → 성남시청(37.4201, 127.1265), 레벨 8(시 전체가 보이는 정도).
2. **컴포넌트화 여부** → 이번은 인라인. Storybook(`/ds-init`)은 재사용 컴포넌트가
   실제로 여러 화면에 필요해지는 시점으로 미룬다.
3. **`window.kakao` 타입 범위** → 이번 화면에 필요한 최소 타입만(`Map`, `LatLng`).
   마커·클러스터링에서 쓸 타입은 그 명세에서 늘린다 (YAGNI).
