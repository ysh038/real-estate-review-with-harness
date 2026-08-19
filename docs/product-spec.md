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

## TODO

> 새 항목 추가 기준(`.cursor/rules/00-core` TODO 정책): 명시적 요청이거나 직접 후속 조치,
> 방치 시 버그·보안 문제, 기존 항목과 중복 없음 — 셋 다 만족할 때만.

### MVP — 지도와 마커

- [ ] 카카오 지도 SDK 로드 + 지도 렌더링
- [ ] 지도 이동 시 bbox 기준 마커 동적 로딩 (300ms debounce)
- [ ] 마커 클러스터링
- [ ] 마커 클릭 → 사이드 패널에 사무소 정보 (대표자명·주소·전화번호)
- [ ] 패널 닫기: ESC · 백드롭 클릭 · 동일 마커 재클릭

### Phase 1 — 리뷰 시스템

- [ ] `users` · `reviews` · `review_reports` 테이블 + 마이그레이션
- [ ] 카카오 OAuth — 콜백 라우트, HttpOnly 세션 쿠키, OAuth state(CSRF)
- [ ] 로그인/로그아웃 UI + 세션 컨텍스트
- [ ] `GET /api/offices/:id` — 사무소 + 리뷰 집계(`avgRating`, `reviewCount`)
- [ ] `GET /api/offices/:id/reviews` — 커서 페이지네이션
- [ ] `POST /api/offices/:id/reviews` — 작성 (인증 필수, 사무소당 1인 1리뷰)
- [ ] `PATCH` / `DELETE /api/reviews/:id` — 본인 리뷰 수정·삭제
- [ ] `POST /api/reviews/:id/report` — 신고, 5회 누적 시 `hidden_at` 자동 설정
- [ ] Rate limit — IP + 사무소 조합 24시간 1건 (초과 429)
- [ ] 리뷰 목록·작성 폼 UI (별점 + 본문 10자 이상), 로딩·에러 상태

## 하지 않기로 한 것

- **사진 업로드(Phase 2) 이후 전부** — 실험 범위 밖. 하네스 효과 측정에 MVP+Phase 1로 충분하다.
- **마커 색상 `avgRating` 그라데이션** — 원본에서도 스펙 복잡도 대비 우선순위가 낮아 PASS된 항목.
