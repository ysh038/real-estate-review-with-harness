# 작업 로그 — real-estate-review-with-harness

> `/ship` 시 맨 위에 한 줄씩 추가된다. 형식: `- YYYY-MM-DD <해시 7자> <요약>`

- 2026-08-28 dc12a88 ReviewSection·MyReviewItem을 atom/molecule로 교체 - Atomic
  Design 청크 3 (명세: docs/specs/design-system-review-organisms.md — AC1~31 전부
  확인, 계획: docs/design-system-atomic-plan.md). 두 organism의 CSS 22개 중복을
  RatingInput·RatingDisplay·DealFieldSet·TagChipGroup·PhotoUploader·FormError
  molecule과 Button·Chip·Badge atom으로 교체해 실제로 없앴다. reportButton은
  Button ghost로 확정(청크 1 열린 질문 1번). PhotoUploader에 removeLabel 필드
  추가(기존/새 사진 삭제 라벨 구분, 전역 인덱스로는 재구성 불가해 필요). 기존
  테스트 78개(ReviewSection 53 + MyPageReviews 25) 무수정 통과, 전체 269 +
  Storybook 94 무회귀. Docker 기동 후 실제 브라우저에서 시각 변경 실측 확인
  (Chip 배경 통일, copyLink 버튼 pill→각짐). 다음 액션은 청크 4
  (OfficeSearchBar·PhotoLightbox·LoginButton·mypage) `/spec`.

- 2026-08-28 76c1c49 디자인시스템 molecules 6종 + Badge atom - Atomic Design 청크 2 (명세:
  docs/specs/design-system-molecules.md — AC1~31 전부 확인, 계획:
  docs/design-system-atomic-plan.md). 청크 1 atom만으로는 ReviewSection·
  MyReviewItem의 CSS 22개 중복이 안 풀려, 폼 조각 molecule을 스토리로 고정.
  DealFieldSet는 계획의 Select×4가 아니라 재실측 Select×5+연도 Input.
  PhotoUploader는 쓰기 File[]와 수정 kept+new가 달라 items[]로 평평하게 받음
  (도메인 상수는 molecule이 import하지 않음). OfficeInfoFields 낮은 신뢰도
  배지만 파일럿 교체. ReviewSection·MyReviewItem은 청크 3. Storybook 93
  (신규 play 37) + 유닛 269 무회귀. 다음 액션은 청크 3 `/spec`.

- 2026-08-28 a066168 디자인시스템 atoms 7종 - Atomic Design 청크 1 (명세:
  docs/specs/design-system-atoms.md — AC1~27 전부 확인, 계획:
  docs/design-system-atomic-plan.md). Button 클래스 25개+가 실측상 5개
  variant로 수렴, ReviewSection·MyReviewItem이 CSS 클래스 22개를 중복
  정의(MyReviewItem의 :focus-visible 0개 vs ReviewSection 8개인 접근성
  드리프트 이미 발생)한 것을 발견 — Button·LinkButton·Chip·Select·
  TextArea·Input·FieldRow 7종을 apps/web/design-system/components/에
  신설. aria-pressed 쓰는 기존 버튼 5개가 전부 pill이라 "pill 토글은
  Chip이 흡수" 규칙 확정, contact 페이지 버튼 2개가 실제로 <a>였던 것을
  발견해 LinkButton을 Button과 분리. contact 페이지를 파일럿으로 교체
  (청기와 리브랜딩 누락 드리프트도 해소). 스토리 작성 중 FieldRow가
  <dl> 없이 렌더되면 axe 위반이라는 진짜 버그 1건 발견, 스토리에 <dl>
  데코레이터 추가로 해결. ReviewSection·MyReviewItem 교체는 청크 3으로
  분리. Storybook 스토리 46개 신규(test:storybook 통과) + 유닛 테스트
  269개 무회귀.
  - **환경 메모**: 게이트의 build 단계와 커밋 훅이 dev 서버와 같은
    apps/web/.next를 써서, 게이트를 돌리거나 커밋할 때마다 띄워둔 dev
    서버가 500으로 깨졌다(총 3회 재현) — rm -rf .next뿐 아니라 build
    자체가 원인. 매번 재기동으로 복구했다. dev 서버를 계속 띄워둔 채
    게이트/커밋을 하는 워크플로 자체의 구조적 충돌이라 별도 확인 필요.

- 2026-08-28 739d101 "청기와" 디자인시스템 적용 + Places 카테고리 필터 +
  문의 이메일 노출 제거 (명세: docs/specs/design-system-cheonggiwa-rebrand.md
  — AC1~13 전부 확인). Claude Design(claude.ai/design) 프로젝트에서
  DesignSync 도구로 가져온 팔레트를 적용해 UX 감사 리포트 9건 전부 해결.
  색상·타이포(Pretendard)·z-index 토큰 전체 교체, 배지 글자색을 톤별로
  재계산해 Storybook addon-a11y로 WCAG AA 실측 통과(별점 전용
  --color-rating 신설로 기존 미발견 버그도 해결). 카카오 Places 카테고리
  칩(중개업소/지하철역/학교/은행) 추가로 무관한 장소 노출 문제 해결 —
  실 브라우저에서 "중개업소" 필터 시 아파트 단지가 사라지고 실제
  중개업소만 남는 것 확인. 문의 페이지 이메일 텍스트 노출 제거(mailto
  유지). 작업 중 카테고리 칩이 검색바를 2줄로 늘려 트렁케이션 배너와
  다시 겹치는 회귀를 직접 발견·수정. Claude Design 산출물은 전부 데이터로
  취급해 실제 파일·줄번호와 대조 검증 후 적용. Vitest 269건(신규 7),
  Storybook a11y 10건, 전체 하네스 게이트 통과.
- 2026-08-27 9e85864 UX 감사(레이어 충돌 리포트) 항목 수정 — Critical 2·
  High 1·Medium 1·Low 1건. 사무소 상세 패널이 열려도 로그인 위젯·검색바가
  패널 헤더 위에 남아 "닫기" 클릭을 가로채던 문제(elementFromPoint로 확인)를
  패널 z-index를 40으로 올려 해결, 375px 모바일에서 검색바·로그인·"결과
  많음" 배너가 기본 화면부터 겹치던 문제를 검색바 폭 축소(min() 사용)와
  배너 위치 하향으로 해결, 검색창 폰트를 16px로 올려 iOS 자동 확대 방지,
  검색 드롭다운에 max-height+스크롤 추가, 리뷰 없음 상태의 로그인 안내
  문구를 실제 링크로 교체, FAQ의 낡은 콘텐츠(이미 배포된 리뷰 수정·삭제
  기능을 "곧 추가될 예정"이라던 문구) 수정. 실 브라우저로 데스크톱·모바일
  둘 다 재검증, Vitest 1건 신규(총 262건 통과). Places 카테고리 필터·브랜드
  색상 토큰 정립은 범위가 더 커 남겨둠.
- 2026-08-27 7760509 Storybook 온디맨드 설치(ds-init, design-system 스킬
  Part 1). Next.js 15(Turbopack) 자동 감지로 `@storybook/nextjs-vite` 설치,
  a11y.test=error 전환, 하네스 checks에 test-storybook 등록, 이 저장소
  토큰만 쓰는 참조 구현 3종(ExampleForm/ExampleTable/ExampleDetail) + 상호작용
  스토리 추가. 환경 특이 이슈 2건 우회: `.storybook/**`가 타입 인식 린트의
  tsconfig 프로그램에 안 잡혀 무관한 파일까지 규칙을 못 찾는 것처럼 보였던
  문제(린트 대상 제외로 해결), addon-vitest 브라우저 서버 기본 포트(63315)가
  이 Windows 머신의 Hyper-V 동적 포트 제외 범위에 걸려 EACCES 나던 문제(고정
  포트 61245로 우회). 부수 발견: a11y.test=error를 켜자마자
  `--color-success`·`--color-warning` 토큰이 흰 글자와 쓰이면 WCAG AA
  미달임을 실측(3.29·3.18:1)으로 잡아냄 — `--color-info`는 흰/진한 글자 둘 다
  기준 미달이라 별도 디자인 토큰 이슈로 남김(UX 감사 리포트와 같은 계열의
  발견).
- 2026-08-27 5e01bdd 리뷰 수정 시 사진 변경(추가/삭제) — Phase 2 완료 (명세:
  docs/specs/review-edit-photo-changes.md — AC1~11 전부 확인).
  review-photo-upload·review-edit-and-delete-ui 두 명세에서 범위 밖으로
  뗐던 마지막 항목. 편집 폼에서 기존 사진 제거·새 사진 추가 가능, 저장 시
  "남은 기존 사진 → 새로 업로드한 사진" 순서로 photoKeys 구성. 작성 폼
  (useOfficeReviews.submitReview)과 동일한 원칙으로 업로드 오케스트레이션을
  useMyReviews.updateReview에 새 인자(newPhotoFiles)로 내렸다 — 실패 시 PATCH
  자체를 안 보냄. Vitest 12건 신규, 브라우저로 RequireAuth 리다이렉트·무크래시
  확인(첫 시도에 500 에러가 떴으나 원인은 직전 하네스 게이트의 next build가
  next dev의 .next 캐시를 손상시킨 것 — 코드 문제 아님, .next 삭제로 해결).
- 2026-08-27 c2a28f7 카카오 Places 지역명 검색 (Phase 13 마무리, 명세:
  docs/specs/kakao-places-location-search.md — AC1~16 전부 확인).
  office-search-bar에서 범위 밖으로 뗐던 항목 — 검색바가 우리 DB 사무소
  검색과 병렬로 카카오 Places.keywordSearch()를 호출해 지역명·장소를 최대
  3건 별도 섹션으로 보여주고, 선택하면 지도만 이동(상세 패널은 안 엶)한다.
  브라우저 검증에서 심각한 버그 발견·수정: `buildKakaoMapScriptUrl`이
  URLSearchParams로 콤마를 %2C로 인코딩해버리는데, 카카오 SDK 부트스트랩
  코드가 자기 script src의 쿼리스트링을 디코딩 없이 정규식으로 파싱해
  콤마로 split하는 바람에 두 번째 라이브러리부터 로드 실패 → 지도가 영원히
  "불러오는 중" 상태에 멈추는 버그. 유닛 테스트로는 못 잡는 버그였다
  (`URL.searchParams.get()`이 다시 디코딩해줘서 통과시켜버림) — 원본
  문자열을 직접 검사하는 테스트를 추가해 재발 방지. Vitest 23건 신규,
  브라우저로 사무소·장소 혼합 검색·패널 닫힘·지도 이동 확인.
- 2026-08-27 52cbeca 마이페이지 리뷰 수정·삭제 UI (명세:
  docs/specs/review-edit-and-delete-ui.md — AC1~13 전부 확인). PATCH/DELETE
  /api/reviews/:id는 이미 완성돼 있었지만 호출할 UI가 없던 것을 발견해 채웠다
  — /mypage/reviews에 항목별 수정(인라인 폼, 새 MyReviewItem 컴포넌트로 분리)·
  삭제(확인 후 하드 삭제) 추가. PATCH 전체교체 때문에 photoKeys를 생략하면
  기존 사진이 사라지는 함정을 편집 폼이 항상 기존 사진 키를 보존해 보내는
  방식으로 막았다 — sabotage-verify로 이 지점의 기존 테스트 공백을 발견하고
  전용 테스트 추가. 사진 추가/삭제 자체는 3방향 diff가 필요해 여전히 범위
  밖. Vitest 17건 신규, 브라우저로 라우트 리다이렉트 무회귀 확인(인터랙션은
  카카오 로그인 필요해 단위 테스트로 대체).

- 2026-08-27 290be5f 정형 설문 항목 - 전문성 평가 + 하자 대응 경험 (Phase
  12-C, 명세: docs/specs/review-structured-survey.md — AC1~12 전부 확인).
  원본도 항목 미확정 상태였던 것을 이 저장소가 먼저 확정 — 전문성 평가(3단계)·
  하자 대응 경험(3지선다, 원본의 예/아니오 제안을 사용자 확정으로 확장)을
  기존 태그와 안 겹치게 새로 설계. dealType/dealResult와 동일한 패턴으로
  DB·API·작성 폼·카드 표시·draft까지 전체 반영. 기존 fixture 68곳을
  스크립트로 일괄 갱신하다 발견한 실수 2건(HTTP 바디에 잘못 넣은 null이
  optional() 스키마에서 400을 내던 것, 무관한 테스트의 exact-match가 깨진
  것)을 직접 수정. Vitest 41건 신규/확장, sabotage-verify로 신규 테스트의
  실효성 확인, 브라우저로 오피스 상세·리뷰 목록 API 무회귀 확인(작성 폼은
  카카오 로그인 필요해 단위 테스트로 대체).

- 2026-08-27 cc409b8 리뷰 로딩/빈/에러 상태 일관화 + 작성 임시저장 (Phase 11
  마무리, 명세: docs/specs/review-ux-consistency-and-draft.md — AC1~16 전부
  확인). Skeleton/ReviewListSkeleton·EmptyState·ErrorState 공유 컴포넌트로
  ReviewSection·mypage/reviews·OfficeSearchBar 통일, OfficeSearchBar가
  useOfficeSearch의 error를 화면에 안 그리던 기존 누락도 보완. useReviewDraft
  훅으로 리뷰 작성 폼 localStorage 임시저장·이탈 경고·복원 배너 추가(원본
  ReviewForm.tsx의 "복원은 storage 유지, 새로 작성만 삭제" 로직을 통제변인으로
  참조). Vitest 33건 신규/확장 + 실 브라우저로 검색바 로딩/빈/에러·리뷰 빈 상태
  검증(작성 폼은 카카오 로그인 필요해 브라우저 재현 불가, 단위 테스트로 대체).

- 2026-08-27 56536eb 법적·정책 페이지 + 공통 푸터 (Phase 10, 명세:
  docs/specs/legal-pages-and-footer.md — AC1~10 전부 확인. 개인정보처리방침·
  오픈소스 목록·FAQ는 placeholder 대신 이 저장소의 실제 동작·의존성·기능 기준
  사실 내용으로 작성(전문가 검토가 필요한 계약 문구와는 다른 성격이라 판단).
  원본 "IP 해시" 문구가 이 저장소 실제 동작(원문 저장)과 다르다는 걸 코드 확인으로
  발견해 바로잡음. 실 브라우저로 6개 페이지 전부 검증, 홈 화면 지도가 휠/키보드
  스크롤을 소비해 스크린샷엔 안 잡히지만 Footer 자체는 정상 렌더링·클릭 가능함을
  DOM 검사 + 실제 링크 클릭 내비게이션으로 확인)
- 2026-08-27 07f976c 지오코딩 매칭 신뢰도 + 낮은 신뢰도 배지 (Phase 4, 명세:
  docs/specs/geocoding-match-confidence.md — AC1~9 전부 확인. rank 기반
  matchConfidence(1/(rank+1)), 0.5 미만이면 배지. kakaoGeocoder.ts에 처음으로
  단위 테스트 추가(그동안 seedService의 fake로만 간접 검증돼 왔음). 시드 스크립트
  시군 파라미터화는 이미 완료돼 있었음을 재확인만 함. 전국 데이터소스(MOLIT_API_KEY
  필요)는 검증 불가능해 조사만 하고 범위 밖으로 분리. 실 브라우저로 배지 노출/비노출
  둘 다 확인(카카오 로그인 불필요한 공개 조회라 가능했음))
- 2026-08-27 07ff99f 리뷰 사진 업로드 (Phase 2, 명세: docs/specs/review-photo-upload.md
  — AC1~22 전부 확인. 로컬 MinIO(포트 9002/9003) + sharp EXIF 제거·리사이즈, 업로드
  API 경로만 구현(presign은 서버 처리와 상충해 제외). review_photos에 position 컬럼
  추가(원본의 잠재적 정렬 불안정 회피). 리뷰 수정 UI 자체가 없어 "수정 시 사진 변경"은
  별도 명세로 분리. 실 MinIO 통합 테스트 + 개발 서버 스모크 테스트로 전체 파이프라인
  검증(대용량 실제 JPEG 리사이즈 확인 포함))
- 2026-08-27 9e85dd2 회원 탈퇴 + 리뷰 익명화 (Phase 9 나머지, 명세:
  docs/specs/member-account-deletion-and-anonymization.md — AC1~18 전부 확인.
  reviews.user_id를 nullable + ON DELETE SET NULL로 마이그레이션, DELETE
  /api/users/me, /mypage/settings 페이지. findByOfficeId·findHidden·restore의
  innerJoin→leftJoin 전환 필요성을 실DB 통합 테스트로 확인. Phase 9 전체 완료)
- 2026-08-26 c9e1044 사무소 검색바 (Phase 13, 명세: docs/specs/office-search-bar.md
  — AC1~21 전부 확인. 브라우저 검증에서 실버그 2건 발견·수정(ORDER BY 별칭 오류,
  panTo/setLevel 경합 → setCenter로 교체). 카카오 Places 지역명 검색은 별도 명세로
  분리)
- 2026-08-26 132f98d 리뷰 퍼머링크·신고 UI·정렬 (Phase 11 일부, 명세:
  docs/specs/review-permalink-report-and-sort.md — AC1~12 전부 확인. 신고 사유
  선택은 이 저장소 API가 사유를 안 받아 제외, "사진 있는 리뷰만" 필터는 사진
  기능 자체가 없어 제외. 로딩 스켈레톤 일관화·작성 중 임시저장은 별도 명세로 남음)
- 2026-08-26 e2127f0 마이페이지 뼈대 + 프로필 편집 (Phase 9 절반, 명세:
  docs/specs/mypage-shell-and-profile.md — AC1~22 전부 확인. MyReviewsPanel 모달을
  /mypage 서브라우트로 전환, LoginButton 루트 레이아웃 승격, 로그아웃 시 홈 이동.
  회원 탈퇴·리뷰 익명화는 스키마 마이그레이션 필요해 별도 명세로 분리)
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

