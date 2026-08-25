# 프로덕트 명세 — real-estate-review-with-harness

> 이 서비스가 무엇인지, 남은 일이 무엇인지의 정본. 에이전트가 기능을 제안·구현할 때 기준이 된다.

## 서비스 개요

경기도에서 부동산 거래를 앞두고 중개사를 골라야 하는 일반 소비자가, **중개업소를 고르기 전에
실제 이용자 평가를 지도 위에서 바로 확인**하기 위한 서비스.

지도에 공인중개사 사무소를 띄우고, 마커를 누르면 사무소 정보와 리뷰를 보여준다.
카카오 로그인 후 별점과 본문으로 리뷰를 남길 수 있다.

## 범위 (실험 대상)

원본 [real-estate-agent-review](https://github.com/ysh038/real-estate-agent-review)는
Phase 1~13까지 구현돼 있다. 이 저장소는 **MVP + Phase 1** 까지만 재구현한다 —
비교 표본으로 충분하면서 단일 실험으로 끝낼 수 있는 구간. 근거: `docs/experiment.md`.

## 완료된 기능

<!-- 기능이 /ship 되면 여기로 옮긴다 -->

- [x] 모노레포 스켈레톤 + 하네스 설치·배선 (검증 5종 통과)
- [x] `offices` 스키마 + Drizzle 마이그레이션 + `GET /api/offices?bbox=` (명세: `specs/offices-schema-and-bbox-query.md`)
- [x] 성남시 중개업소 시딩 (2273건 → 1913건 upsert, 명세: `specs/seed-sigungu.md`)
- [x] 카카오 지도 SDK 로드 + 렌더링 (레벨·도메인 후속 결정 대기, 명세: `specs/kakao-map-render.md`)
- [x] bbox 기준 오피스 마커 동적 로딩 + 300ms debounce (명세: `specs/office-marker-bbox-sync.md`)
- [x] 마커 클러스터링 (명세: `specs/marker-clustering.md`)
- [x] 마커 클릭 → 사무소 상세 패널 + 닫기(ESC·지도 클릭·재클릭) (명세: `specs/office-detail-panel.md`)
      — "백드롭 클릭"은 *지도 클릭*으로 확정. 지도를 덮는 백드롭은 "동일 마커 재클릭"과
      충돌해서 비모달로 갔다 (근거: 해당 명세 설계 메모)

**MVP 완료.** Phase 1(리뷰 시스템) 원래 계획한 10개 항목도 전부 완료했지만, 이후 원본과
실제 코드를 대조해보니 리뷰 모델 자체가 달랐다(원본엔 별점이 없다) — 격차를 덩이 E~J로
보완 중이다(`docs/decisions.md` #9). 덩이 D의 실 카카오 로그인 브라우저 검증(AC20~22)도
스킵된 채 남아있다.

## TODO

> 새 항목 추가 기준(`.cursor/rules/00-core` TODO 정책): 명시적 요청이거나 직접 후속 조치,
> 방치 시 버그·보안 문제, 기존 항목과 중복 없음 — 셋 다 만족할 때만.

### Phase 1 — 리뷰 시스템

> 10개 항목을 4덩이로 나눠 진행한다: **A** 스키마+읽기 API(완료) → **B** OAuth →
> **C** 쓰기·신고·rate limit → **D** UI. 인증 없이 검증 가능한 구간을 A로 먼저 잘랐다.

- [x] `users` · `reviews` · `review_reports` 테이블 + 마이그레이션 (덩이 A,
      명세: `specs/reviews-schema-and-read-api.md`)
- [x] `GET /api/offices/:id` — 사무소 + 리뷰 집계(`avgRating`, `reviewCount`) (덩이 A)
- [x] `GET /api/offices/:id/reviews` — 커서 페이지네이션 (덩이 A)
- [x] 카카오 OAuth — 콜백 라우트, HttpOnly 세션 쿠키, OAuth state(CSRF) (덩이 B,
      명세: `specs/kakao-oauth-login.md` — AC1~10 전부 실로그인까지 확인 완료)
- [x] 로그인/로그아웃 UI + 세션 컨텍스트 (덩이 B — **완료**)
- [x] `POST /api/offices/:id/reviews` — 작성 (인증 필수, 사무소당 1인 1리뷰) (덩이 C,
      명세: `specs/review-write-and-report.md`)
- [x] `PATCH` / `DELETE /api/reviews/:id` — 본인 리뷰 수정·삭제 (덩이 C)
- [x] `POST /api/reviews/:id/report` — 신고, 5회 누적 시 `hidden_at` 자동 설정 (덩이 C —
      실서버 스모크로 4건 노출 유지 → 5번째 자동 숨김까지 확인)
- [x] Rate limit — IP + 사무소 조합 24시간 1건 (초과 429) (덩이 C — 작성에만 적용,
      근거는 명세 "범위 밖")
- [x] 리뷰 목록·작성 폼 UI (별점 + 본문 10자 이상), 로딩·에러 상태 (덩이 D, 마지막 —
      명세: `specs/review-list-and-write-ui.md` — AC1~19 테스트로 확인, AC20~22(실 카카오
      로그인 브라우저 검증)는 스킵 → `docs/decisions.md` 후속 조치 참고)

### Phase 1 격차 보완 — 원본 리뷰 모델과의 차이 (덩이 E~J)

> 덩이 A~D를 "완료"로 표시한 뒤 원본(`real-estate-agent-review`)의 실제 코드를 열어보니
> 리뷰 모델 자체가 다르다는 게 드러났다 — 원본에는 별점이 없고, 대신 거래정보·태그·
> 비속어 필터·helpful·내 리뷰·관리자 모더레이션이 있다. 근거와 결정: `docs/decisions.md` #9.

- [x] 덩이 E — 리뷰 작성 필드 확장: `dealType`(거래유형)·`dealResult`(거래결과)·
      `visitedYear`/`visitedMonth`(방문 시기), 전부 nullable (명세:
      `specs/review-deal-and-visit-fields.md` — AC1~15 전부 확인, 실DB 통합 테스트 +
      개발 DB 스모크 테스트 완료)
- [x] 덩이 F — 리뷰 태그(`REVIEW_TAGS`) + 사무소별 태그 집계(`tagCounts`) (명세:
      `specs/review-tags.md` — AC1~15 전부 확인, 실DB 통합 테스트 + 시딩 데이터 무결성
      확인 완료)
- [x] 덩이 G — 비속어 필터: 작성·수정 시 검출되면 422 (명세:
      `specs/review-profanity-filter.md` — AC1~8 전부 확인, 개발 DB 스모크 테스트 완료)
- [x] 덩이 H — "도움돼요" 토글 + `helpfulCount`/`isHelpful` (명세:
      `specs/review-helpful-toggle.md` — AC1~15 전부 확인, 실DB 통합 테스트 +
      개발 DB 스모크 테스트 완료)
- [ ] 덩이 I — 내 리뷰 목록 (로그인한 사용자가 자신이 쓴 리뷰를 모아 보기)
- [ ] 덩이 J — 관리자: 숨김 리뷰 목록 + 복구 (API 전용, `x-admin-api-key` 헤더 인증 —
      원본도 admin web UI 없음)

## 하지 않기로 한 것

- **사진 업로드(Phase 2) 이후 전부** — 실험 범위 밖. 하네스 효과 측정에 MVP+Phase 1로 충분하다.
- **마커 색상 `avgRating` 그라데이션** — 원본에서도 스펙 복잡도 대비 우선순위가 낮아 PASS된 항목.
