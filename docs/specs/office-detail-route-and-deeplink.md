# 명세: 사무소 상세 라우트 & 딥링크

- 작성일: 2026-08-26
- 상태: 구현됨

## 목표

지금은 사무소 정보를 보는 방법이 지도 위 마커를 클릭해 뜨는 비모달 패널(`OfficeDetailPanel`)
하나뿐이다. 이 패널은 지도가 반드시 함께 있어야 하고, URL이 바뀌지 않아 **특정 사무소를
링크 하나로 공유하거나 새로고침 후에도 유지할 방법이 없다.** 카카오톡·SNS로 "이 사무소
어때?"를 공유하려 해도 지도 전체 URL만 보낼 수 있다.

`/offices/[id]` 독립 페이지를 만들어 사무소 하나를 풀페이지로 보여주고, OG 메타데이터로
공유 미리보기를 지원한다. 지도 쪽에는 `/?office=<id>` 딥링크를 추가해 특정 사무소로 바로
진입할 수 있게 한다. 이 둘은 이후 마이페이지 고도화(Phase 9)·리뷰 퍼머링크(Phase 11)가
링크를 걸 "목적지" 역할도 겸한다 (`docs/product-spec.md` Phase 8).

## 범위 밖

- **`/mypage` 등에서 이 라우트로 링크 연결** — Phase 9에서 마이페이지를 만들 때 연결한다.
  이번엔 라우트 자체와 홈 화면 진입점(패널의 "상세 보기")만 다룬다.
- **개별 리뷰 퍼머링크(`#review-<id>` 앵커)** — Phase 11 항목.
- **SNS 공유 버튼 UI** — OG 메타데이터까지만. 실제 "공유하기" 버튼은 만들지 않는다.
- **뒤로가기 시 이전 지도 뷰포트(중심·줌) 복원** — `/offices/[id]`에서 지도로 돌아가면
  항상 기본 화면(또는 `?office=` 딥링크)으로 진입한다. 세션 간 뷰포트 기억은 범위 밖.
- **미니맵의 길찾기·확대 버튼 등 부가 UI** — 위치 표시(단일 마커)만.
- **모바일 반응형 레이아웃** — 기존 관례대로 데스크톱 우선, 범위 밖 유지.
- **별점 제거 등 원본 Phase 7 관련 변경** — 이 저장소는 별점을 유지한다(`docs/decisions.md`
  #9·#10). 원본 스펙에 별점 관련 문구가 있어도 따르지 않는다.

## 수용 기준

**메타데이터 (Vitest — `buildOfficeMetadata` 순수 함수 단위)**

- [x] AC1: 사무소 정보가 주어지면 title에 사무소명이 포함된다.
- [x] AC2: description에 주소가 포함된다.
- [x] AC3: 리뷰가 1개 이상이면 description에 리뷰 수(`reviewCount`)가 포함된다.
- [x] AC4: 리뷰가 0개면 description에 "아직 리뷰가 없습니다" 같은 문구가 들어가고 `0개`가
      그대로 노출되지 않는다.

**정보 프레젠테이션 (`OfficeInfoFields` — Testing Library, `OfficeDetailPanel`에서 추출해 공유)**

- [x] AC5: 사무소명·대표자명·주소·전화번호가 화면에 보인다.
- [x] AC6: `ownerName`·`phone`이 `null`이면 "정보 없음"이 보인다.
- [x] AC7: 리팩터 후 `OfficeDetailPanel`의 기존 테스트(office-detail-panel AC6·AC7)가
      회귀 없이 통과한다.

**상세 페이지 (`/offices/[id]` — 브라우저 검증, `bun run dev` 3000 포트)**

- [x] AC8: 존재하는 id로 접속하면 사무소명·주소·전화번호·리뷰 목록이 보인다.
- [x] AC9: 존재하지 않는 id로 접속하면 Next.js 404 페이지가 뜬다.
- [x] AC10: 페이지에 해당 사무소 위치를 표시하는 미니맵과 마커 1개가 보인다.
- [x] AC11: 미니맵에는 다른 사무소 마커나 클러스터가 없다.
- [x] AC12: "지도로 돌아가기" 링크를 클릭하면 홈(`/`)으로 이동한다.
- [x] AC13: 리뷰 작성 폼으로 리뷰를 남기면 목록에 즉시 반영된다(`ReviewSection` 재사용 —
      기존 review-list-and-write-ui 동작 그대로).

**패널 → 상세 페이지 진입점**

- [x] AC14: 사이드 패널에 "상세 페이지 보기" 링크가 있고, 클릭하면 `/offices/:id`로
      이동한다.

**딥링크 `/?office=<id>` (단위: `useOfficeMarkers` Vitest / 통합: 브라우저 검증)**

- [x] AC15: `/?office=<id>`로 접속하면 지도 중심이 해당 사무소 좌표로, 줌 레벨 3으로
      설정된다.
- [x] AC16: 같은 진입에서 해당 사무소의 상세 패널이 마커 클릭 없이 자동으로 열려 있다.
- [x] AC17: 존재하지 않거나 잘못된 id로 `/?office=<id>` 접속 시 에러 없이 기본 화면(성남시청
      중심·레벨 8, 패널 없음)으로 대체된다.
- [x] AC18: `useOfficeMarkers`에 `initialSelectedOffice`를 넘기면 최초 `selectedOffice`가
      그 값으로 시작한다.
- [x] AC19: 초기 `offices`가 아직 빈 배열인 시점(최초 bbox 응답 도착 전)에는
      `initialSelectedOffice`가 즉시 `null`로 정리되지 않는다. 이후 실제 bbox 응답에 그
      사무소가 없으면 그때 정리된다(기존 AC5 로직과 공존).
- [x] AC20: `office` 쿼리 파라미터가 없는 일반 진입(`/`)은 기존과 동일하게 성남시청
      중심·레벨 8로 뜬다(회귀 확인).

## 영향 범위

- **만질/새로 만들 파일**
  - `apps/web/app/offices/[id]/page.tsx` (신규, Server Component) — `fetchOfficeDetail`
    서버 호출, 실패 시 `notFound()`, `generateMetadata` 구현
  - `apps/web/lib/officeMetadata.ts` (신규) — `buildOfficeMetadata(detail)` 순수 함수
    (AC1~4 단위 테스트 대상)
  - `apps/web/components/OfficeInfoFields/` (신규) — `OfficeDetailPanel`에서 name/
    ownerName/address/phone `<dl>` 블록을 추출한 공유 프레젠테이션 컴포넌트
  - `apps/web/components/OfficeDetailPanel/OfficeDetailPanel.tsx` — `OfficeInfoFields` 사용,
    "상세 페이지 보기" 링크(`next/link`) 추가
  - `apps/web/components/OfficeMiniMap/` (신규, client) — 단일 마커 전용 경량 지도.
    `KakaoMap`과 별도 컴포넌트(bbox 조회·클러스터링·선택 로직 없음)
  - `apps/web/app/page.tsx` — `searchParams` 읽어 `office` 파라미터 있으면 서버에서
    `fetchOfficeDetail` 호출(실패 시 무시), 결과를 `KakaoMap`에 `initialOffice`로 전달
  - `apps/web/components/KakaoMap/KakaoMap.tsx` — `initialOffice` prop 수신, 있으면 그
    좌표·레벨 3으로 지도 생성(없으면 기존 성남시청·레벨 8 그대로)
  - `apps/web/hooks/useOfficeMarkers.ts` — `initialSelectedOffice` 인자 추가, 선택 정리
    이펙트(AC5, 기존 office-detail-panel 명세)가 최초 bbox 응답 전에는 초기 선택을
    지우지 않도록 수정
  - 각 신규/변경 컴포넌트·훅에 대응하는 `__tests__/unit/*.test.ts(x)` 추가

- **새 의존성**: 없음 (기존 Next.js App Router 기능인 `generateMetadata`/`notFound`/
  `searchParams`만 사용)

- **기존 기능 영향**
  - `OfficeDetailPanel`은 마크업이 `OfficeInfoFields`로 옮겨갈 뿐 렌더 결과는 동일 —
    기존 스냅샷/텍스트 쿼리 기반 테스트에 영향 없어야 한다(AC7로 확인).
  - `useOfficeMarkers`의 선택-정리 이펙트 변경은 office-detail-panel AC5(화면 밖으로
    나가면 선택 해제)와 공존해야 한다 — AC19가 그 경계 조건을 명시한다.
  - `KakaoMap`·홈페이지는 `initialOffice`가 없는 기본 진입 시 기존 동작과 100% 동일해야
    한다(AC20).

## 설계 메모 (기본값으로 정하고 진행, 이견 있으면 알려달라)

- **딥링크 줌 레벨 3**: 사무소 단위로 확대해 보여주기 위한 값. 임의로 정했으니 실제로
  보고 너무 좁거나 넓으면 이 상수만 바꾸면 된다.
- **"상세 페이지 보기" 위치**: 패널의 전화번호 필드 아래, 리뷰 섹션 위에 링크 형태로 둔다.
- **미니맵 상호작용**: 드래그·줌은 허용하되 클릭 시 별도 동작(마커 재클릭 등)은 없음 —
  가장 단순한 형태로 시작.
- **딥링크 대상 사무소가 최초 bbox 밖일 수 있음**: 지도가 그 사무소 좌표로 센터링되므로
  대부분 bbox 안에 들어오지만, 레벨 3처럼 좁은 화면에서는 이론상 경계에 걸릴 수 있다.
  이번 스펙에서는 별도 보정 없이 "지도 중심 = 그 사무소 좌표"로만 보장한다(AC15). 실제로
  패널이 사라지는 문제가 관찰되면 후속 조치.

## 열린 질문

없음 — 위 "설계 메모"의 기본값에 이견이 없으면 그대로 `/impl`로 진행한다.

## 실행 결과 (2026-08-26)

- **AC1~AC7, AC14, AC18~AC19**: Vitest 신규 12건 전부 통과 (officeMetadata 4 +
  OfficeInfoFields 2 + resolveInitialOffice 3 + useOfficeMarkers 신규 2 +
  OfficeDetailPanel 신규 1), 기존 회귀 없음 — `bun run test` 기준 web 108개·api 186개
  전부 통과.
- **AC8~AC13, AC15~AC17, AC20**: 로컬 Postgres 시딩 데이터(성남시 1913건)로
  `bun run dev --port 3000` 브라우저 확인.
  - AC8·AC10·AC12: `/offices/나-36040000-1-0182` 접속 → 사무소명·대표자명·주소·
    "정보 없음"(전화번호)·미니맵(카카오 SDK 실제 렌더, 마커 1개)·"아직 리뷰가 없습니다"·
    "지도로 돌아가기" 링크 전부 확인.
  - AC9: 없는 id(`no-such-office-id`) 접속 → 실제 404 상태 코드 + Next 기본 404 페이지.
  - AC14: 딥링크로 연 패널의 "상세 페이지 보기" 클릭 → `/offices/:id`로 실제 이동 확인.
  - AC15·AC16: `/?office=<id>` 접속 → 줌 스케일 "50m"(레벨 3 상당)로 확대 + 마커 클릭
    없이 패널 자동 오픈.
  - AC17: `/?office=bogus-id-xyz` 접속 → 에러 없이 기본 화면(스케일 "2km" = 레벨 8,
    클러스터 마커, 패널 없음)으로 대체.
  - AC20: `/` 기본 접속이 AC17과 동일한 기본 화면인 것으로 회귀 없음 확인.
- **환경 이슈(코드 결함 아님)**: Windows + Turbopack 조합에서 `.next` 빌드 매니페스트
  파일 쓰기 경합으로 첫 요청이 간헐적으로 500을 내는 현상을 재차 겪었다(이전
  `kakao-map-render` 계열 명세들과 별개의 사례). `apps/web/.next` 삭제 후 재기동으로
  해결 — 코드 변경 불필요.
- `node .harness/gates/run-checks.mjs` 전체 통과 (typecheck → lint → stylelint → test →
  build). 프로덕션 빌드 라우트 목록에 `/offices/[id]`(ƒ, 798B)가 정상 포함됐고, `/`도
  `searchParams`를 읽게 되며 정적(○)에서 동적(ƒ)으로 바뀌었다 — 의도된 변화.
