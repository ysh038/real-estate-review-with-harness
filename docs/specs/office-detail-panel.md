# 명세: 마커 클릭 → 사무소 상세 패널

- 작성일: 2026-08-20
- 상태: 구현됨

## 목표

지도에 마커는 뜨지만 누를 수가 없다. 마커에 마우스를 올리면 사무소명 툴팁이 나오는 게 전부라
(`office-marker-bbox-sync` AC10) 대표자명·주소·전화번호를 확인할 방법이 없다. 마커를 클릭하면
사이드 패널에 그 사무소 정보를 띄우고, ESC·지도 빈 곳 클릭·동일 마커 재클릭으로 닫는다.
product-spec MVP의 남은 두 항목("마커 클릭 → 사이드 패널", "패널 닫기")을 한 기능으로 묶는다.

## 범위 밖

- **리뷰 목록·평점 표시** — `reviews` 테이블이 아직 없다. Phase 1에서 이 패널을 확장한다.
- **`GET /api/offices/:id` 상세 조회** — 패널이 쓰는 필드(대표자명·주소·전화번호)는 이미 bbox
  응답의 `officeSummarySchema`에 전부 있다. 단건 조회 API는 리뷰 집계가 필요해지는 Phase 1 항목.
- **완전한 포커스 트랩(Tab 순환 가둠)** — 이 패널은 지도를 계속 조작할 수 있어야 하는 **비모달**
  패널이다(아래 설계 메모). `aria-modal="true"`는 쓰지 않는다.
- **패널 열림 상태 URL 반영·딥링크** — 이전 지도 명세들과 동일하게 이번에도 범위 밖.
- **패널 애니메이션(슬라이드 인/아웃)** — 열고 닫히는 것만. 전환 효과는 뒤로 미룬다.
- **전화번호 `tel:` 링크·주소 복사 버튼** — 정보 표시까지만.
- **모바일 반응형 레이아웃(하단 시트 등)** — 데스크톱 사이드 패널 하나로 시작한다.

## 수용 기준

**선택 상태 로직** (`useOfficeMarkers` 훅 — Vitest + `renderHook`, 실제 SDK 없이 어댑터 모킹)

- [x] AC1: 마커 클릭 핸들러가 호출되면 그 사무소가 `selectedOffice`로 노출된다.
- [x] AC2: 다른 마커를 클릭하면 `selectedOffice`가 그 사무소로 교체된다.
- [x] AC3: 이미 선택된 사무소의 마커를 다시 클릭하면 `selectedOffice`가 `null`이 된다 (토글).
- [x] AC4: `clearSelection()`을 호출하면 `selectedOffice`가 `null`이 된다.
- [x] AC5: 지도를 옮겨 오피스 목록이 갱신되고 **선택된 사무소가 새 목록에 없으면** 선택이
      해제된다 (화면 밖 사무소의 패널이 남아 있지 않는다).

**패널 컴포넌트** (`OfficeDetailPanel` — Vitest + `@testing-library/react`, 사용자 관점 쿼리)

- [x] AC6: 사무소가 주어지면 사무소명·대표자명·주소·전화번호가 화면에 보인다.
- [x] AC7: `ownerName`·`phone`이 `null`인 사무소면 그 항목 자리에 "정보 없음"이 보인다
      (빈 칸이나 `null` 문자열이 아니다 — 원천 데이터에 누락 건이 실제로 있다).
- [x] AC8: 패널에는 `role="dialog"`와 사무소명을 가리키는 접근 가능한 이름이 있다.
- [x] AC9: 패널이 열리면 포커스가 패널 안(닫기 버튼)으로 이동한다.
- [x] AC10: 닫기 버튼을 클릭하면 `onClose`가 호출된다.
- [x] AC11: ESC 키를 누르면 `onClose`가 호출된다.
- [x] AC12: 패널이 닫힌 뒤에는 ESC를 눌러도 `onClose`가 다시 호출되지 않는다 (리스너 해제).

**브라우저 확인** (실제 카카오 SDK 필요 — `bun run dev`, 3000 포트)

- [x] AC13: 마커를 클릭하면 패널이 열리고 해당 사무소 정보가 보인다.
- [x] AC14: 패널이 열린 상태에서도 지도를 드래그·확대할 수 있고 다른 마커를 클릭할 수 있다.
- [x] AC15: 지도 빈 곳을 클릭하면 패널이 닫힌다.
- [x] AC16: 클러스터를 클릭하면 패널이 열리지 않고 기존 확대 동작만 한다 (회귀 확인).

## 영향 범위

- **만질 파일**
  - `apps/web/components/OfficeDetailPanel/OfficeDetailPanel.tsx` (신규) — 프레젠테이션.
    `office`·`onClose` prop만 받는다 (fetch·선택 로직 없음)
  - `apps/web/components/OfficeDetailPanel/OfficeDetailPanel.module.css` (신규) — 토큰만 사용
  - `apps/web/components/OfficeDetailPanel/index.ts` (신규) — 공개 API
  - `apps/web/lib/kakaoMarkers.ts` — `createOfficeMarker(office, onClick)` 로 클릭 핸들러 인자 추가
  - `apps/web/hooks/useOfficeMarkers.ts` — `selectedOffice` 상태 + 마커 클릭 배선 +
    `clearSelection` 반환, 목록 갱신 시 선택 정리(AC5)
  - `apps/web/components/KakaoMap/KakaoMap.tsx` — 지도 클릭 시 선택 해제(AC15) 배선,
    `<OfficeDetailPanel>` 렌더
  - `apps/web/__tests__/unit/OfficeDetailPanel.test.tsx` (신규)
  - `apps/web/__tests__/unit/useOfficeMarkers.test.ts` — AC1~AC5 추가
  - `apps/web/vitest.config.ts` — `include`가 `*.test.ts` 만이라 `.tsx` 테스트가 잡히지 않는다.
    `*.test.{ts,tsx}` 로 넓힌다
  - `apps/web/package.json` — `@testing-library/user-event`, `@testing-library/jest-dom` 추가
- **새 의존성**: `@testing-library/user-event`(키보드·클릭 상호작용), `@testing-library/jest-dom`
  (`toBeInTheDocument` 등 단정문). 둘 다 devDependency. 런타임 의존성 없음
- **기존 기능 영향**: `createOfficeMarker` 시그니처가 바뀌어 `marker-clustering`의
  `useOfficeMarkers.test.ts` 목업도 함께 갱신된다. 클러스터링·bbox 조회·debounce 동작은 무변경
  (AC16으로 회귀 확인)

## 설계 메모

- **왜 비모달인가**: product-spec의 "백드롭 클릭"을 글자 그대로 지도 전체를 덮는 오버레이로
  구현하면 **패널이 열린 동안 마커를 클릭할 수 없어져 "동일 마커 재클릭으로 닫기" 자체가
  불가능해진다.** 두 요구가 충돌한다. 그래서 클릭을 가로채는 백드롭을 두지 않고, 지도 클릭
  이벤트(`click`)로 선택을 해제한다 — "지도 빈 곳을 누르면 닫힌다"는 체감은 같으면서 마커·
  드래그·줌이 계속 살아 있다. 이에 맞춰 `aria-modal`도 쓰지 않는다(포커스 트랩 없는
  `aria-modal="true"`는 보조기기에 거짓말이 된다).
- **레이어**: 선택 상태를 `useOfficeMarkers`에 두는 이유는 클릭 이벤트의 출처가 마커이기 때문이다
  — 마커 생성과 클릭 배선이 한 곳에 있어야 리스너 누수를 관리할 수 있다. 패널은 상태를 모르는
  순수 프레젠테이션(`office` + `onClose`)이라 Testing Library로 단독 검증된다.
- **Storybook은 계속 보류**: 화면이 여전히 지도 하나뿐이라 `kakao-map-render`에서 세운 보류
  근거가 유효하다. ESC·포커스처럼 스토리 play 함수가 겨냥하는 항목은 이미 깔려 있는
  jsdom + Testing Library로 AC9·AC11·AC12에서 동등하게 검증한다 (사용자 결정, 2026-08-20).
- **`null` 필드 표기**: `ownerName`·`phone`은 스키마상 nullable이고 실제 시딩 데이터에도 누락이
  있다(`offices-schema-and-bbox-query` 스키마 표). "정보 없음"을 AC7로 못박아 빈 칸이 렌더링
  버그처럼 보이는 것을 막는다.

## 실행 결과 (브라우저 검증, 2026-08-20)

- **AC1~AC12**: Vitest 29개 통과 (신규 13건 + 기존 16건 회귀 없음).
- **AC13~AC16**: 로컬 Postgres에 검증용 28건(개별 3건 + 클러스터용 25건)을 임시로 넣고
  `bun run dev` 브라우저로 확인. **이번엔 새로 발견된 버그가 없었다** — 앞선 두 명세와 달리
  브라우저 단계에서 수정이 필요하지 않았다.
  - AC13: 마커 클릭 → 패널이 열리고 사무소 정보 표시. `ownerName`·`phone`이 `null`인 건에서
    "정보 없음"이 실제로 보이는 것까지 확인(AC7의 브라우저 재확인).
  - AC14: 패널이 열린 채로 지도 드래그가 되고, 다른 마커 클릭 시 패널 내용이 교체됐다.
    동일 마커 재클릭으로 닫히는 것도 확인. **비모달 설계가 의도대로 동작한다.**
  - AC15: 지도 빈 곳 클릭 시 닫힘. 드래그는 `click` 이벤트를 발생시키지 않아 패널이
    유지된다(위 AC14) — 두 동작이 서로 간섭하지 않는 것을 함께 확인했다.
  - AC16: 클러스터 클릭 시 패널이 열리지 않고 확대만 됨. 클러스터러는 개별 마커의 click을
    가로채므로 별도 처리가 필요 없었다.
  - **AC5 브라우저 재확인**: 선택한 사무소가 bbox 밖으로 나갈 때까지 지도를 옮기자 패널이
    자동으로 닫혔다(마커 0개, dialog 없음). 아직 bbox 안일 때는 유지되는 것도 확인.
  - `role="dialog"` / `aria-labelledby`(사무소명) / 포커스가 닫기 버튼 / `aria-modal` 없음을
    실제 DOM에서 확인(AC8·AC9).
- **테스트 인프라 변경 2건** (구현 중 필요해져서 추가, 명세 영향 범위에 반영):
  - `vitest.config.ts` `include`를 `*.test.{ts,tsx}`로 넓히고 `__tests__/setup.ts`(jest-dom) 추가.
  - JSX 파싱이 안 돼 `.tsx` 테스트가 죽었다. Next.js 15의 vite는 **rolldown 기반이라
    `esbuild` 옵션이 무시된다**(`"Both esbuild and oxc options were set"` 경고로 드러남).
    `oxc: { jsx: { runtime: "automatic" } }` 로 해결.
- 이번에도 카카오 도메인 미등록(`docs/decisions.md`) 때문에 3000에서 검증했다. 원본 `app-web`을
  잠시 내렸다가 복구했다.

## 열린 질문 (해소됨 — 2026-08-20)

1. **"백드롭 클릭"의 해석** → **비모달 + 지도 클릭 시 닫힘**으로 확정. 클릭을 가로채는 백드롭을
   두지 않으므로 "동일 마커 재클릭"과 "지도 빈 곳 클릭" 두 요구가 모두 충족된다.
   product-spec의 "백드롭 클릭" 문구는 이 해석으로 읽는다 (모달 오버레이 아님).
