# 작업 로그 — real-estate-review-with-harness

> `/ship` 시 맨 위에 한 줄씩 추가된다. 형식: `- YYYY-MM-DD <해시 7자> <요약>`

- 2026-08-26 5fd723d 사무소 상세 라우트 & 딥링크 (Phase 8, docs/decisions.md #10 원본
  캐치업 범위 확장 이후 첫 착수. 명세: docs/specs/office-detail-route-and-deeplink.md —
  AC1~20 전부 확인, OfficeInfoFields 공유 컴포넌트 추출)
- 2026-08-25 a6a137a 관리자 숨김 리뷰 목록 + 복구 (격차 보완 덩이 J·마지막, docs/decisions.md
  #9, 명세: docs/specs/admin-hidden-reviews.md — 덩이 E~J 전부 완료)
- 2026-08-25 7ede190 내 리뷰 목록 (격차 보완 덩이 I, docs/decisions.md #9, 명세:
  docs/specs/my-reviews-list.md — 헤더 MyReviewsPanel 진짜 모달로 첫 도입)
- 2026-08-25 c9a4afe "도움돼요" 토글 (격차 보완 덩이 H, docs/decisions.md #9, 명세:
  docs/specs/review-helpful-toggle.md — getOptionalAuthUser 첫 도입)
- 2026-08-25 28d9218 비속어 필터 (격차 보완 덩이 G, docs/decisions.md #9, 명세:
  docs/specs/review-profanity-filter.md)
- 2026-08-24 3ad9eff 리뷰 태그(REVIEW_TAGS) + 사무소별 태그 집계 추가 (격차 보완 덩이 F,
  docs/decisions.md #9, 명세: docs/specs/review-tags.md)
- 2026-08-24 9cc7698 리뷰 작성 필드 확장 — 거래유형·거래결과·방문 시기 (원본과 리뷰 모델이
  다름을 확인해 좁히는 격차 보완 덩이 E, docs/decisions.md #9)
- 2026-08-21 f27cb6c 리뷰 목록·작성 폼 UI (덩이 D 완료, Phase 1 전체 완료 — AC20~22 실로그인
  검증은 자격증명 제약으로 스킵)
- 2026-08-20 1ca3b1e 리뷰 작성·수정·삭제·신고 + rate limit (덩이 C 완료, 실서버 스모크 버그 수정)
- 2026-08-20 97954ea 카카오 OAuth 실로그인 검증 완료 + scope 미지정 버그 수정 (덩이 B 완료)
- 2026-08-20 191658f 카카오 OAuth 로그인 + 세션 (덩이 B, AC1~7 자동검증, AC8~10 대기)
- 2026-08-20 ddb8ce9 reviews 스키마 + 읽기 API (Phase 1 덩이 A, integration 실DB 검증)
- 2026-08-20 b82ece3 마커 클릭 → 사무소 상세 패널 + 닫기 (비모달 확정, MVP 완료)
- 2026-08-20 76fa825 마커 클러스터링 (카카오 MarkerClusterer)
- 2026-08-20 3c03219 bbox 기준 오피스 마커 동적 로딩 + 300ms debounce (CORS·z-index 버그 동반 수정)
- 2026-08-19 d9ccc25 카카오 지도 SDK 로드 + 렌더링 (레벨·도메인 등록은 후속 결정 대기)
- 2026-08-15 cc18acb 성남시 실시딩 완료 — 2273건→1913건 upsert, 고유좌표 68.6%
- 2026-08-15 3c74323 시딩 지오코딩을 키워드 검색으로 변경 (원본 실제 방식 확인 후 반영)
- 2026-08-15 43094c2 시딩 파이프라인 인프라 (게이트 통과, 실데이터 스코프는 미해결)
- 2026-08-15 989e0d3 offices 스키마 + bbox 조회 API (AC 11개 → 테스트 22개)
- 2026-08-15 7cea67e 모노레포 스켈레톤 + create-harness 적용, 갭 G1~G6 기록

