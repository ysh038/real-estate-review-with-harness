# 프로덕트 명세 — real-estate-review-with-harness

> 이 서비스가 무엇인지, 남은 일이 무엇인지의 정본. 에이전트가 기능을 제안·구현할 때 기준이 된다.

## 서비스 개요

경기도에서 부동산 거래를 앞두고 중개사를 골라야 하는 일반 소비자가, **중개업소를 고르기 전에
실제 이용자 평가를 지도 위에서 바로 확인**하기 위한 서비스.

지도에 공인중개사 사무소를 띄우고, 마커를 누르면 사무소 정보와 리뷰를 보여준다.
카카오 로그인 후 별점과 본문으로 리뷰를 남길 수 있다.

## 범위 (실험 대상)

원본 [real-estate-agent-review](https://github.com/ysh038/real-estate-agent-review)는
Phase 1~13까지 구현돼 있다. 이 저장소는 처음엔 **MVP + Phase 1** 까지만 재구현하기로
했다 — 비교 표본으로 충분하면서 단일 실험으로 끝낼 수 있는 구간이라는 근거였다
(`docs/experiment.md`).

**2026-08-26 범위 확장**: 하네스를 얹으면 원본만큼(혹은 그 이상) 개발이 가능한지 직접
확인하기 위해 범위를 원본의 **Phase 1~13 전체 캐치업**으로 넓혔다(`docs/decisions.md`
#10). 단, 원본이 Phase 7에서 제거한 별점은 이 저장소에서 **유지**하기로 재확인했다 —
같은 결정 참고.

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

**MVP + Phase 1 + 격차 보완(덩이 E~J) 전부 완료.** Phase 1 원래 계획 10개 항목에 더해,
원본과 실제 코드를 대조해 발견한 리뷰 모델 격차(원본엔 별점이 없고 거래정보·태그·비속어
필터·helpful·내 리뷰·관리자 모더레이션이 있었다, `docs/decisions.md` #9)까지 덩이 E~J로
전부 좁혔다. 남은 건 실 카카오 로그인이 필요한 브라우저 시각 검증(덩이 D AC20~22,
`MyReviewsPanel`)뿐 — `docs/decisions.md` 후속 조치 참고.

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
- [x] 덩이 I — 내 리뷰 목록 (로그인한 사용자가 자신이 쓴 리뷰를 모아 보기) (명세:
      `specs/my-reviews-list.md` — AC1~15 전부 확인, 실DB 통합 테스트 + 개발 DB 스모크
      테스트 완료. 단, `MyReviewsPanel` 실 브라우저 시각 검증은 실 카카오 로그인이
      필요해 스킵 — `docs/decisions.md` 후속 조치 참고)
- [x] 덩이 J — 관리자: 숨김 리뷰 목록 + 복구 (API 전용, `x-admin-api-key` 헤더 인증 —
      원본도 admin web UI 없음) (명세: `specs/admin-hidden-reviews.md` — AC1~13 전부
      확인, 실DB 통합 테스트 + 개발 DB 스모크 테스트 완료)

**덩이 E~J 전부 완료 — 원본과의 리뷰 모델 격차(`docs/decisions.md` #9)가 전부 좁혀졌다.**
남은 미완료는 실 카카오 로그인이 필요한 브라우저 시각 검증(review-list-and-write-ui
AC20~22, my-reviews-list `MyReviewsPanel`)뿐이며 `docs/decisions.md`에 후속 조치로
기록돼 있다.

### 원본 캐치업 — Phase 2~13 (2026-08-26 범위 확장, `docs/decisions.md` #10)

> 원본 `docs/product-spec.md`와 대조한 갭. Phase 번호는 원본 기준. 착수 전 각 Phase(또는
> 하위 항목)마다 `/spec`으로 명세를 먼저 쓴다 — 수용 기준이 테스트로 번역 가능해야 함.
> 별점은 유지하기로 했으므로(#10) 원본 스펙 중 별점 제거를 전제한 부분은 그대로 가져오지
> 않고 이 저장소 사정에 맞게 조정한다.

#### Phase 2 — 사진 업로드

- [ ] 사진 스토리지 연동(로컬은 S3 호환, 예: MinIO) + presign 업로드
- [ ] 리뷰 작성 폼에 사진 첨부(최대 3장) + 업로드 진행 상태
- [ ] 리뷰 목록 썸네일 + 라이트박스(확대) 뷰어
- [ ] EXIF 제거·리사이즈(서버 처리)
- [ ] 리뷰 수정 시 사진 변경(추가/삭제)

#### Phase 3 — 모더레이션

**완료.** 신고 누적 자동 숨김(덩이 C/J), 관리자 숨김 리뷰 조회·복구 API(덩이 J), 비속어
필터(덩이 G)로 원본과 동등한 기능을 이미 갖췄다.

#### Phase 4 — 데이터 확장

- [ ] 시드 스크립트 다른 시군 지정 지원 확인/정리 (`SEED_TARGET_SIGUNGU` 파라미터화)
- [ ] 경기도 외 지역 데이터 소스 검토 (원본은 data.go.kr 전국 API로 대체 — 참고만 하고
      구현 코드는 복사하지 않는다, `docs/decisions.md` #9 통제변인 원칙과 동일 기준)
- [ ] 지오코딩 매칭 신뢰도(`match_confidence`) 컬럼 + 낮은 신뢰도 배지

#### Phase 5 — 운영 자동화

- [ ] 시딩 결과 알림(Slack/Discord webhook)
- [ ] 주기적 재시딩 스케줄러(GitHub Actions cron)
- [ ] DB 백업 자동화(cron `pg_dump`)

#### Phase 6 — CI/CD & 배포

- [ ] web 자동 배포(Vercel 등)
- [ ] api 자동 배포(Railway/Fly.io 등)
- [ ] 프로덕션 Postgres 준비 + 마이그레이션 + 초기 시딩
- [ ] CI에 배포 스텝 추가, 필요 시크릿 등록
- [ ] 카카오 콘솔에 프로덕션 도메인 등록(JS SDK, OAuth Redirect URI)

#### Phase 7 — 별점 시스템

**원본과 다르게 간다.** 원본은 법적 리스크를 이유로 별점을 완전히 제거했지만, 이 저장소는
유지하기로 재확인했다(`docs/decisions.md` #9, #10). 할 일 없음 — 이 항목은 "원본을
따라가지 않기로 한 것"으로 기록만 남긴다.

#### Phase 8 — 사무소 상세 라우트 & 딥링크

- [ ] `/offices/[id]` 독립 라우트(서버 컴포넌트, 기존 `GET /api/offices/:id` 재사용)
- [ ] 존재하지 않는 id → 404
- [ ] OG 메타데이터(사무소명·주소·리뷰 수)
- [ ] `/?office=<id>` 진입 시 지도 이동 + 마커 활성화 + 패널 오픈
- [ ] 상세 페이지 내 미니맵(단일 마커)

#### Phase 9 — 마이페이지 고도화

- [ ] `MyReviewsPanel`(모달)을 유지할지 `/mypage` 서브라우트로 전환할지 설계 시 결정
- [ ] 프로필(표시명 편집, 가입일, 카카오 연동 표시)
- [ ] 설정(로그아웃, 회원 탈퇴 플로우 + 리뷰 익명화 안내)
- [ ] `GET/PATCH/DELETE /api/users/me`
- [ ] 비로그인 시 마이페이지 접근 → 홈 리다이렉트

#### Phase 10 — 법적·정책·고객지원

- [ ] 공통 푸터 + `/legal/*` 라우트 스캐폴딩(약관·개인정보처리방침·위치기반서비스
      이용약관·오픈소스 고지)
- [ ] 각 페이지 "준비 중" placeholder + 최종 개정일 필드
- [ ] `/contact` 문의 채널
- [ ] FAQ placeholder
- [ ] (실배포 직전) 실제 법적 문구 작성 — 전문가 검토 필요, 지금 범위 밖

#### Phase 11 — 리뷰 신뢰도 & UX

- [ ] 개별 리뷰 퍼머링크 (Phase 8 선행 필요)
- [ ] 신고 UI(버튼 + 사유 선택 모달) — API(`POST /api/reviews/:id/report`)는 이미 있음,
      프론트만 없음
- [ ] 리뷰 목록 정렬/필터(최신순/오래된순, 사진 있는 리뷰만 등)
- [ ] 로딩 스켈레톤 + 빈 상태 + 에러 상태 일관화
- [ ] 작성 중 임시저장(localStorage) + 이탈 경고 + draft 복원

#### Phase 12 — 리뷰 콘텐츠 고도화 (추가분)

> 12-A(거래 맥락)·12-B(태그)는 덩이 E·F로 이미 완료됨 — 원본보다 먼저 구현됐다.

- [ ] 12-C 정형 설문 — 원본도 미확정 상태, 항목 정의부터 필요(기획 확정 전 보류)
- [ ] 12-D 중개사 답변 — `[장기]` 새 사용자 타입(중개사) 필요, 보류

#### Phase 13 — 검색 & 탐색 UX

- [ ] 사무소 이름/주소 검색 API + 검색바 컴포넌트
- [ ] 디바운스 + 키보드 탐색(방향키/Enter/Esc), combobox ARIA
- [ ] 검색 결과 없음 상태
- [ ] 주소/지역명 검색(카카오 Places 등 — 인터페이스만 참고, 구현 코드 복사 안 함)

## 하지 않기로 한 것

- ~~사진 업로드(Phase 2) 이후 전부~~ → **2026-08-26 범위 확장으로 철회**
  (`docs/decisions.md` #10). 위 "원본 캐치업 — Phase 2~13" TODO 참고.
- **마커 색상 `avgRating` 그라데이션** — 원본에서도 스펙 복잡도 대비 우선순위가 낮아 PASS된 항목.
- **별점 제거(원본 Phase 7)** — 원본은 법적 리스크로 별점을 제거했지만, 이 저장소는 별점을
  유지하기로 재확인했다(`docs/decisions.md` #9, #10).
