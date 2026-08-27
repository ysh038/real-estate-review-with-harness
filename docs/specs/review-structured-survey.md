# 명세: 정형 설문 항목 (전문성 평가 + 하자 대응 경험)

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

`docs/product-spec.md` Phase 12-C. 지금 리뷰는 별점(1~5) + 자유 텍스트 + 거래정보
(dealType/dealResult/방문시기) + 긍정 태그 6종(review-tags 명세)으로 구성된다.
이 중 태그는 "친절함"·"허위매물 없음"·"강매 없음"처럼 개별 긍정 신호를 다중
선택하는 방식이라, **경험을 방향성 있게(좋음/보통/아쉬움) 판단해야 하는 항목**이나
**계약 이후 사후 대응처럼 태그로 쪼개기 애매한 항목**은 지금 스키마로 표현할 수
없다. 원본(real-estate-agent-review)도 `docs/product-spec.md` 12-C에
"자유 텍스트 + 정형 항목 혼합 폼"을 제안만 해두고 항목 자체는 미확정 상태로
남겨뒀다(직접 확인) — 이 저장소가 항목을 먼저 확정하고 구현한다.

## 원본과의 관계 (통제변인)

원본 12-C 섹션은 방향만 제시한다: "친절도/전문성 등 객관식", "허위매물·하자대응
경험 예/아니오", "12-B 태그와 중복 정리 먼저 결정". 항목 이름·보기·enum 값은
원본에 없다 — 이 저장소가 아래처럼 독자적으로 정한다:

- **태그와의 중복 정리**: 이미 태그가 있는 신호(허위매물 없음·친절함·강매 없음·
  설명 꼼꼼·응답 빠름·매물 많음)는 설문 항목으로 다시 만들지 않는다. 태그는 이미
  구현·배포된 기능이라 흡수/재설계하면 기존 리뷰 데이터와의 하위 호환이 깨진다.
  대신 태그가 커버하지 못하는 두 가지만 새 정형 항목으로 추가한다.
- **전문성 평가**: 원본이 말한 "전문성"은 태그의 "설명 꼼꼼"(설명을 꼼꼼히
  했는가)보다 넓은 개념 — 시세 파악·서류/법률 처리 등을 포괄하는 종합 판단이라
  중복이 아니라고 판단해 채택한다.
- **하자 대응 경험**: 원본이 말한 "허위매물·하자대응" 중 허위매물은 이미
  태그("허위매물 없음")로 있으므로 하자 대응만 새로 추가한다.
- **보기(enum) 문구**: 원본에 없으므로 이 저장소가 새로 짓는다(아래 AC 참고).
  하자 대응은 원본이 "예/아니오"를 제안했지만, "하자 자체가 없었음"과 "하자는
  있었는데 대응이 미흡했음"을 구분 못 하면 정보 손실이 크다고 판단해 3지선다로
  변경한다 — 이 부분은 원본 제안과 다른 지점이라 아래 "열린 질문"에도 남긴다.

## 범위 밖

- **정량 통계/집계 노출** (예: "전문성 평균 별점", "하자 대응 원만 비율") — 사무소
  카드·상세에 집계해 보여주는 것은 이번엔 하지 않는다. 태그 집계(tagCounts)와
  같은 패턴을 나중에 필요하면 별도 명세로 추가한다.
- **정렬/필터** ("전문성 좋음만 보기" 등) — review-permalink-report-and-sort의
  정렬(최신/오래된)에 새 축을 추가하지 않는다.
- **필수 입력화** — 두 항목 모두 선택 사항이다. dealType/dealResult/방문시기와
  같은 패턴(입력 장벽을 올리지 않는다).
- **기존 리뷰에 소급 적용** — 두 필드는 nullable이라 과거 리뷰는 값 없이(응답
  없음) 표시된다. 백필하지 않는다.
- **리뷰 수정(PATCH) 시 값 검증 강화** — `updateReviewRequestSchema`가
  `createReviewRequestSchema`와 동일 스키마를 재사용하는 기존 패턴을 그대로
  따른다(review-write-and-report 설계 메모). 별도 규칙을 추가하지 않는다.

## 수용 기준

**계약(zod) + DB**

- [x] AC1: `packages/types`에 `EXPERTISE_LEVELS = ["전문적이었음", "보통",
      "아쉬웠음"]`와 `DEFECT_RESPONSES = ["원만히 해결됨", "미흡했음", "하자
      없었음"]` enum이 추가되고, `TReview`·`TCreateReviewRequest`에 각각
      `expertise: TExpertiseLevel | null`(응답)·`expertise?:
      TExpertiseLevel`(요청)와 `defectResponse`도 동일한 모양으로 추가된다.
- [x] AC2: `reviews` 테이블에 `expertise`·`defect_response` nullable text
      컬럼이 마이그레이션으로 추가된다. 기존 행은 두 컬럼 모두 NULL이다.

**API**

- [x] AC3: `POST /api/offices/:id/reviews`에 `expertise`·`defectResponse` 중
      하나 또는 둘 다 보내면 저장되고, 응답 리뷰 객체에 그대로 돌아온다.
- [x] AC4: 두 필드를 생략하면 응답에서 각각 `null`이다(기존 리뷰 포함).
- [x] AC5: `expertise`에 `EXPERTISE_LEVELS`에 없는 문자열을 보내면 400
      (dealType과 동일한 기존 검증 패턴).
- [x] AC6: `PATCH /api/reviews/:id`(수정)도 AC3~AC5와 동일하게 동작한다
      (updateReviewRequestSchema가 createReviewRequestSchema를 재사용하는
      기존 패턴).

**작성 폼 (`ReviewSection`)**

- [x] AC7: 거래정보 select들 옆에 "전문성"·"하자 대응" select 두 개가 추가되고,
      각각 "선택 안 함" + 3개 보기를 갖는다(기존 dealType select와 동일한
      UI 패턴).
- [x] AC8: 두 항목을 선택하지 않고 제출해도 기존 필수 검증(별점·본문 10자)만
      통과하면 정상 제출된다 — 새 항목이 필수가 아님을 확인한다.
- [x] AC9: 정상 제출 시 `submitReview`가 선택한 `expertise`/`defectResponse`
      값을 포함해 호출된다.

**리뷰 카드 표시**

- [x] AC10: 리뷰에 `expertise`나 `defectResponse` 값이 있으면 카드에
      "전문성: 전문적이었음" · "하자 대응: 원만히 해결됨" 형태로 보인다.
- [x] AC11: 둘 다 없으면(기존 리뷰) 표시 영역 자체가 없다 — 빈 레이블이 보이지
      않는다.

**임시저장 연동**

- [x] AC12: `useReviewDraft`의 draft 모양에 `expertise`·`defectResponse`가
      추가되고, 값이 있으면 다른 필드와 동일하게 자동저장·복원 대상이 된다
      (review-ux-consistency-and-draft AC10~14와 동일한 규칙).

## 영향 범위

- **만질 파일**
  - `packages/types/src/review.ts` — `EXPERTISE_LEVELS`·`DEFECT_RESPONSES`
    enum, `TReview`/`TCreateReviewRequest`/`TUpdateReviewRequest` 확장.
  - `apps/api/src/db/schema.ts` — `reviews` 테이블에 컬럼 2개 추가.
  - `apps/api/drizzle/` — `bun run db:generate`로 생성되는 신규 마이그레이션
    SQL 파일.
  - `apps/api/src/services/reviewService.ts` — `dealType`/`dealResult`가
    지나가는 모든 지점(생성·수정·조회·행 매핑)에 새 필드 2개를 나란히 추가.
    grep으로 `dealType` 등장 지점을 전부 확인해 빠짐없이 반영한다.
  - `apps/api/src/routes/reviewsRoute.ts`(또는 해당 라우트 파일) — 별도 로직
    없음(zod 스키마가 이미 계약에서 검증), 필요 시 응답 매핑만 확인.
  - `apps/web/components/ReviewSection/ReviewSection.tsx` — select 2개 추가,
    카드 표시에 `expertise`/`defectResponse` 반영, `handleSubmit`의
    `reviewInput`에 포함, `useReviewDraft` 연동.
  - `apps/web/hooks/useReviewDraft.ts` — `IReviewDraft`에 필드 2개 추가.
  - `apps/web/lib/reviewsApi.ts` — 응답 매핑에 새 필드가 있다면 그대로 통과
    (zod 스키마가 이미 처리할 가능성이 높음, 확인만).
  - 테스트: `apps/api/src/__tests__/unit/reviewService.test.ts`·
    `reviewsRoute.test.ts`, `apps/web/__tests__/unit/ReviewSection.test.tsx`·
    `useReviewDraft.test.ts` 확장.
- **새 의존성**: 없음.
- **기존 기능 영향**: 기존 리뷰 데이터는 두 필드가 NULL로 채워져 화면에 아무
  영향이 없다. 기존 dealType/dealResult 표시·검증 로직은 건드리지 않는다.

## 열린 질문

없음 — 하자 대응 3지선다(원만히 해결됨/미흡했음/하자 없었음), 전문성 평가
3단계(전문적이었음/보통/아쉬웠음) 모두 사용자 확정(2026-08-27).

## 실행 결과 (2026-08-27)

**계약 + DB (AC1-2)**

- `packages/types/src/review.ts`에 `EXPERTISE_LEVELS`·`DEFECT_RESPONSES`
  enum과 `TExpertiseLevel`·`TDefectResponse` 타입 추가, `reviewSchema`(nullable)·
  `createReviewRequestSchema`(optional)에 반영. `myReviewSchema`·
  `adminHiddenReviewSchema`·`updateReviewRequestSchema`는 `reviewSchema`/
  `createReviewRequestSchema`를 확장·재사용하는 기존 구조라 별도 수정 없이
  자동으로 새 필드를 물려받았다.
- `apps/api/src/db/schema.ts`에 `expertise`·`defect_response` nullable text
  컬럼 추가 → `bun run db:generate`로 `drizzle/0010_sour_micromax.sql` 생성
  (`ALTER TABLE reviews ADD COLUMN` 2건) → `bun run db:migrate`로 로컬
  dev DB(`app`, :5433)에 적용, `psql \d reviews`로 컬럼 존재 확인.

**API (AC3-6)**

- `reviewService.ts`의 `dealType`/`dealResult`가 지나가는 모든 지점(zod로
  검증된 요청 타입 3곳, repository 인터페이스 4곳, mapper 함수 3곳, params
  타입 2곳, create/update 메서드 본문 2곳)에 grep으로 전수 확인하며
  `expertise`/`defectResponse`를 나란히 추가. `reviewRepository.ts`의
  `OWNED_ROW_COLUMNS`와 4개 `.select()` 컬럼 목록, `update()`의 인라인
  patch 타입도 동일하게 갱신 — insert/update 자체는 스프레드(`...reviewFields`)
  로 Drizzle에 그대로 넘어가 컬럼 매핑 외 추가 코드가 필요 없었다.
- `apps/api/src/routes/offices.ts`(POST)·`reviews.ts`(PATCH) 라우트의
  구조분해·서비스 호출부에 두 필드를 추가.
- 기존 테스트 68곳(주로 `dealResult: null`/`dealResult: "값"` 형태의 fixture
  객체)이 `expertise`/`defectResponse`를 새 필수 프로퍼티로 요구하게 되면서
  타입 에러가 났다 — 스크립트로 `dealResult: <값>,` 표준형 라인 바로 뒤에
  `expertise: null,`·`defectResponse: null,`을 일괄 삽입해 fixture를
  기계적으로 갱신했다(80곳, `reviewRepository.test.ts`가 49곳으로 최다).
  `fakeReviewRepository.ts`(2곳)는 `row.dealResult`/`patch.dealResult` 형태라
  스크립트 패턴에 안 걸려 수작업으로 추가.
- **버그 발견 1**: 이 기계적 삽입이 `reviewsRoute.test.ts`의 PATCH 통합
  테스트(`JSON.stringify` 요청 바디) 안에도 `expertise: null`을 끼워 넣었는데,
  `expertise`는 `.optional()`이지 `.nullable()`이 아니라서 실제 HTTP 요청에
  `null`을 보내면 400이 되어 `repository.update`가 아예 호출되지 않는 회귀가
  생겼다(테스트 실행으로 발견). 요청 바디에서는 제거하고, 생략 시 서비스가
  `?? null`로 채워 응답에는 여전히 `expertise: null`이 나오는 기존 로직을
  그대로 활용해 assertion은 유지했다 — 요청 스키마(optional, null 거부)와
  응답 스키마(nullable, null 허용)의 비대칭을 놓칠 뻔한 지점.
- AC3~AC6을 명시적으로 검증하는 새 테스트 8개 추가: `officeReviewWriteRoute.test.ts`
  에 POST 쪽 성공/검증 실패 4개, `reviewsRoute.test.ts`에 PATCH pass-through
  1개. `reviewService.create`의 `expertise`/`defectResponse` 매핑을 일부러
  `null`로 하드코딩해 sabotage-verify — 새 POST AC3 테스트가 즉시 실패하는
  것으로 테스트가 실제로 값을 검증하고 있음을 확인한 뒤 원복.
- `apps/api` 전체 테스트: 23 파일 234개 통과(통합 테스트 3파일은 기본 게이트대로
  DB 없이 skip).

**작성 폼 + 카드 표시 + 임시저장 (AC7-12)**

- `ReviewSection.tsx`에 `expertise`/`defectResponse` `useState` 추가, 거래정보
  select 옆에 동일 패턴의 select 2개 추가(AC7), `handleSubmit`의
  `reviewInput`에 조건부 스프레드로 포함(AC9), 성공 시 초기화 목록에 추가,
  카드에 `전문성: …`/`하자 대응: …` 줄 추가(AC10-11), `useReviewDraft` 저장
  effect·복원 핸들러에 두 필드 연동(AC12).
- `useReviewDraft.ts`의 `IReviewDraft`·`isEmptyDraft`에 필드 추가 — 이 저장소는
  `dealType` 등을 `NOT_SELECTED=""` 문자열 센티널로 쓰므로(원본과 달리 null이
  아님) draft 필드도 `string`(빈 문자열이 "선택 안 함")으로 맞췄다.
- Red 확인: `ReviewSection.test.tsx`에 AC7(select 2개 옵션)·AC9(제출 시
  포함)·AC10(카드 표시)·AC11(빈 상태에 표시 없음) 테스트 4개 추가 → 구현 전
  4개 모두 실패 확인(AC11은 아직 아무것도 안 그려서 우연히 통과하는 상태였고,
  구현 후에도 계속 통과함을 별도 확인) → 구현 후 전부 Green.
- **버그 발견 2**: 기존 "AC7(review-deal-and-visit-fields): 거래정보·방문시기를
  채워 제출하면…" 테스트의 `submitReview` exact-match 기대값에도 기계적
  삽입이 `expertise: null, defectResponse: null`을 끼워 넣었는데, 이 테스트는
  애초에 그 두 필드를 선택하지 않는 흐름이라 실제 `reviewInput`(조건부
  스프레드라 미선택 필드는 키 자체가 없음)과 어긋나 실패했다 — 무관한 기존
  테스트를 원래대로 되돌렸다.
- `useReviewDraft.test.ts`에 AC10(전문성·하자 대응만 있어도 저장) 테스트 추가.
  `isEmptyDraft`의 `expertise === "" && defectResponse === ""` 검사를
  일부러 `true &&`로 대체하는 sabotage-verify → 기존 9개 테스트는 전부
  그대로 통과했지만(기존 fixture가 항상 전 필드를 함께 채우거나 함께 비워
  이 경로를 아무도 건드리지 않았음 — 진짜 커버리지 공백) 새로 추가한 테스트만
  실패 → 원복 후 10개 전부 통과. 새 테스트가 없었다면 이 회귀는 어떤
  기존 테스트도 잡지 못했을 것이다.
- `apps/web` 전체 테스트: 35 파일 218개 통과.

**전체 게이트 + 실 브라우저**

- `node .harness/gates/run-checks.mjs` 전체 통과(typecheck → lint → stylelint
  → test → build).
- `docker stop app-web` → 이 저장소 web(:3000)·api(:8788) 기동 →
  `/offices/41135-2024-00077` 접속, `GET /api/offices/:id/reviews`가 200을
  반환하고(새 nullable 컬럼을 포함한 응답 스키마가 실제 DB 조회 경로에서도
  깨지지 않음을 확인) "아직 리뷰가 없습니다"가 정상 렌더링됨을 확인 →
  `docker start app-web`으로 원복.
- 실제 리뷰 작성 폼(전문성·하자 대응 select, 제출, 카드 표시)은 카카오
  로그인이 필요해 브라우저로 재현 불가(`docs/decisions.md` "논의 중" 섹션의
  기존 제약과 동일) — `ReviewSection.test.tsx`의 AC7/AC9/AC10/AC11 테스트로
  대체 검증했다.
