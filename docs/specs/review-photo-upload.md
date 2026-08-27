# 명세: 리뷰 사진 업로드

- 작성일: 2026-08-27
- 상태: 구현됨

## 목표

원본 캐치업 Phase 2(`docs/product-spec.md`, `docs/decisions.md` #10). 리뷰 작성 시 사진을
최대 3장 첨부하고, 리뷰 목록에서 썸네일 + 라이트박스로 볼 수 있게 한다. 로컬 개발은
MinIO(S3 호환)를 쓰고, `STORAGE_PROVIDER` 값으로 운영 시 R2/AWS S3로 바꿀 수 있게 한다.

원본(`apps/api/src/lib/s3.ts`·`uploads.service.ts`·`uploads.route.ts`)을 인터페이스만
참조해 확인한 사실 두 가지가 이번 스펙의 범위를 정한다(통제변인 원칙, `docs/decisions.md`
#9):

1. **원본엔 업로드 경로가 둘이다** — ⓐ `POST /uploads`(API 경유, 파일을 직접 받아 서버가
   sharp로 EXIF 제거·리사이즈까지 처리), ⓑ `POST /uploads/presign`(클라이언트가 발급받은
   URL로 S3에 직접 올림, "레거시 — EXIF 제거 없음"이라는 원본 주석이 붙어 있다).
   `docs/product-spec.md`가 요구하는 "EXIF 제거·리사이즈(서버 처리)"는 서버가 파일
   바이트를 실제로 봐야만 가능한데, presign은 서버가 바이트를 볼 수조차 없는 구조라
   목표와 상충한다. 이 스펙은 ⓐ만 구현한다 — product-spec.md의 "presign 업로드"라는
   표현은 "업로드 API"로 해석해 반영한다.
2. **이 저장소엔 리뷰 수정 UI 자체가 없다** — `PATCH /api/reviews/:id`는 덩이 C(2026-08-20)
   부터 있었지만, 프런트 어디에도 "수정" 버튼이나 수정 폼 진입점이 만들어진 적이 없다
   (`apps/web/lib/reviewsApi.ts`에 `updateReview` 호출 자체가 없음, 직접 확인). "리뷰 수정
   시 사진 변경"은 수정 UI가 있어야 의미가 있는 후속 작업이라, 이번 스펙은 **작성(생성) 시
   사진 첨부 + 표시**까지만 다루고, 수정 UI(및 그 위에서의 사진 변경)는 별도 명세로
   분리한다 — 아래 "범위 밖" 참고.

## 범위 밖

- **리뷰 수정 UI 자체, 그리고 그 위에서의 사진 추가/삭제** — 위 목표에서 설명한 대로 이
  저장소엔 수정 진입점이 없다. 계약(`updateReviewRequestSchema`)에는 `photoKeys`를
  추가해 API 레벨에서는 이미 준비해두지만(전체교체 원칙, tags와 동일), 수정 폼 UI 구현은
  이 스펙 다음에 별도로 착수한다.
- **presign(클라이언트 → S3 직접 업로드) 경로** — 위 이유로 제외.
- **업로드됐지만 리뷰 생성에 실패해 리뷰에 연결되지 못한 "고아" 사진 정리** — 스토리지
  비용 문제일 뿐 기능 결함이 아니다. 필요해지면 Phase 5(운영 자동화)에서 배치로 처리.
- **사진 순서 재배열(드래그 앤 드롭)** — 업로드한 순서 = 표시 순서만 지원.
- **원본 화질 다운로드/원본 그대로 보기** — 서버가 리사이즈한 뒤 원본은 저장하지 않는다.
  라이트박스도 리사이즈된 버전만 보여준다.
- **관리자가 리뷰의 특정 사진만 골라 삭제** — 원본에도 없다. 기존 모더레이션(리뷰 전체
  숨김)만 가능.
- **프로덕션 S3/R2 실배포 설정·자격증명** — 로컬 MinIO로만 검증한다.
- **동영상, HEIC 등 확장 포맷** — jpeg/png/webp/gif 네 가지만(원본과 동일).

## 수용 기준

**계약** (`packages/types`)

- [x] AC1: `reviewPhotoSchema = { storageKey: string, url: string }`.
- [x] AC2: `reviewSchema`(및 이를 extend하는 `myReviewSchema`·`adminHiddenReviewSchema`)에
      `photos: reviewPhotoSchema[]` 필드가 추가된다.
- [x] AC3: `createReviewRequestSchema`·`updateReviewRequestSchema`에
      `photoKeys: z.array(z.string().min(1)).max(REVIEW_PHOTOS_MAX).optional()`가
      추가된다(`REVIEW_PHOTOS_MAX = 3`, 기존 `REVIEW_TAGS_MAX` 네이밍과 동일 관례).

**env·인프라**

- [x] AC4: `STORAGE_PROVIDER`(`minio`|`s3`|`r2`, 기본 `minio`), `S3_ENDPOINT`(선택,
      url), `S3_REGION`(기본 `us-east-1`), `S3_ACCESS_KEY`·`S3_SECRET_KEY`(선택),
      `S3_BUCKET`(기본 `reviews`), `S3_PUBLIC_URL`(선택, url) — 전부 선택값이라
      미설정이어도 서버 부팅은 막지 않는다(`ADMIN_API_KEY`와 같은 패턴).
- [x] AC5: `infra/docker/docker-compose.yml`에 MinIO 서비스가 추가되고, 포트는 원본
      (9000/9001)과 겹치지 않는 값(9002/9003)을 쓴다(`docs/decisions.md` #6과 동일 원칙).

**업로드 API** (`POST /api/uploads`)

- [x] AC6: 세션 없이 요청하면 401.
- [x] AC7: 스토리지가 설정되지 않았으면(S3 client 생성 불가) 503.
- [x] AC8: `file` 파트가 없거나 허용 타입(jpeg/png/webp/gif) 외 `Content-Type`이면 400.
- [x] AC9: 5MB를 초과하는 파일이면 413.
- [x] AC10: 정상 업로드 시 EXIF orientation을 실제 회전에 반영한 뒤 태그를 제거하고,
      최대 2000px(긴 변 기준, 비율 유지, 확대는 안 함)로 리사이즈한다. jpeg/webp는
      품질 85로 재인코딩하고, gif는 png로 변환(첫 프레임만, 애니메이션 미보존)한다.
      처리된 결과만 스토리지에 저장하고 `{ storageKey }`를 반환한다.

**리뷰 작성 연동**

- [x] AC11: `photoKeys`를 포함해 리뷰를 작성하면 응답 `photos` 배열이 제출한 배열과
      같은 순서로 채워진다.
- [x] AC12: `photoKeys`를 4개 이상 보내면 400 (계약 검증 — 회귀 확인).
- [x] AC13: `photoKeys`를 생략하거나 빈 배열로 보내면 `photos: []`.
- [x] AC14: 리뷰 작성 폼에서 파일을 선택하면 즉시 로컬 미리보기 썸네일이 보이고,
      각 항목에 개별 삭제(×) 버튼이 있다.
- [x] AC15: 이미 3장을 첨부했으면 파일 선택 버튼이 더 이상 보이지 않는다.
- [x] AC16: 제출 시 첨부 사진이 있으면 먼저 각 파일을 `POST /api/uploads`로 순차
      업로드해 `storageKey`를 모으고, 그 값들로 `photoKeys`를 채워 리뷰 생성 요청을
      보낸다. 업로드 중에는 "사진 업로드 중..." 로딩 문구가 보인다.
- [x] AC17: 업로드가 하나라도 실패하면 리뷰 생성 요청 자체를 보내지 않고 에러 문구를
      보여준다.

**표시** (썸네일 + 라이트박스)

- [x] AC18: 사진이 있는 리뷰는 본문 아래 정사각형 썸네일 목록을 보여준다. 없으면
      아무것도 렌더링하지 않는다.
- [x] AC19: 썸네일을 클릭하면 그 사진부터 시작하는 전체화면 라이트박스가 열린다.
- [x] AC20: 라이트박스는 Esc로 닫히고, 사진이 2장 이상이면 ←/→ 키와 이전/다음 버튼으로
      이동하며 "n / 총장수" 카운터를 보여준다.
- [x] AC21: 라이트박스가 열려 있는 동안 배경(`body`) 스크롤이 잠기고, 닫히면 원래대로
      복원된다.
- [x] AC22: 라이트박스의 사진 바깥(어두운 배경) 클릭 시 닫힌다.

## 영향 범위

- **만질 파일**
  - `infra/docker/docker-compose.yml` — `minio` 서비스 추가(포트 9002/9003).
  - `.env.example` — `STORAGE_PROVIDER` 등 6개 변수 추가(MinIO 로컬 기본값 포함).
  - `packages/env/src/index.ts` — `serverEnvSchema`에 위 변수 추가.
  - `packages/types/src/review.ts` — `reviewPhotoSchema`, `REVIEW_PHOTOS_MAX`,
    `reviewSchema.photos`, `createReviewRequestSchema`/`updateReviewRequestSchema`의
    `photoKeys`.
  - `apps/api/src/db/schema.ts` — `reviewPhotos` 테이블(신규): `id`, `reviewId`(FK
    cascade), `storageKey`, `position`(integer, 표시 순서 확정용 — 아래 설계 메모),
    `createdAt`.
  - `apps/api/drizzle/` — 신규 마이그레이션.
  - `apps/api/src/lib/photoStorage.ts`(신규) — `IPhotoStorage` 인터페이스(`upload`,
    `getPublicUrl`) + `@aws-sdk/client-s3`·`sharp` 기반 실구현. deps로 주입한다
    (`requireAdmin`의 `adminApiKey`와 같은 이유 — 아래 설계 메모).
  - `apps/api/src/routes/uploads.ts`(신규) — `POST /api/uploads`.
  - `apps/api/src/repositories/reviewRepository.ts` — `replacePhotos`(신규, `replaceTags`와
    동일 패턴), `findPhotosByReviewIds`(신규, `findTagsByReviewIds`와 동일 패턴).
    `insert`·`update`·`findByOfficeId`·`findByUserId`·`findHidden`·`restore`에 사진
    배선 추가.
  - `apps/api/src/services/reviewService.ts` — `toReview` 계열 매핑 함수에 `photos`
    필드 추가, `create`/`update` 파라미터에 `photoKeys` 추가.
  - `apps/api/src/app.ts`·`apps/api/src/index.ts` — `photoStorage` deps 배선.
  - `apps/api/package.json` — `sharp`·`@aws-sdk/client-s3` 추가(presign을 구현하지
    않으므로 `@aws-sdk/s3-request-presigner`는 불필요 — 목표에서 이미 제외), `build`
    스크립트에 `--external sharp`(원본과 동일한 번들링 제약 — sharp는 네이티브
    바이너리라 번들에 포함하면 안 된다).
  - `apps/web/lib/reviewsApi.ts` — `uploadPhoto(file)` 추가.
  - `apps/web/components/ReviewSection/ReviewSection.tsx` — 파일 선택 input·미리보기·
    업로드 후 제출 플로우·썸네일 목록.
  - `apps/web/components/PhotoLightbox/`(신규) — 라이트박스 컴포넌트. 이 저장소의
    다른 신규 컴포넌트들(OfficeDetailPanel·ReviewSection 등)과 동일하게 별도
    Storybook 온보딩 없이 일반 컴포넌트로 추가한다 — 이 세션에서 `/ds-init`·`/ds-add`가
    실제로 쓰인 적이 없어 그 관례를 그대로 따른다.
  - 기존 review 관련 테스트 전반(`reviewService.test.ts`·`reviewRepository.test.ts`·
    `reviewsRoute.test.ts`·`officeDetailRoute.test.ts` 등) — `photos: []` 필드 추가로
    인한 픽스처 갱신. 신규: `uploadsRoute.test.ts`, `photoStorage` 관련 단위·통합 테스트,
    `ReviewSection.test.tsx` 확장, `PhotoLightbox.test.tsx`.
- **새 의존성**: `sharp`, `@aws-sdk/client-s3`(API만).
- **기존 기능 영향**: 기존 리뷰 응답에 `photos: []`가 추가되는 것 외 변경 없음(항상
  기존 필드 유지, 새 필드만 덧붙는 확장이라 하위 호환).

## 설계 메모

- **`photoStorage`를 deps로 주입하는 이유**: 원본은 모듈 top-level에서 `getEnv()`를
  직접 불러 S3 client를 만든다. 이 저장소는 `requireAdmin`(`admin-hidden-reviews` 명세)
  이후로 "테스트가 실제 env/외부 자원 없이 라우트를 돌릴 수 있어야 한다"는 원칙을
  지켜왔다 — 업로드 라우트 단위 테스트가 진짜 MinIO 없이도 403/503/400 분기를
  검증하려면 같은 패턴이 필요하다.
- **`review_photos`에 `position` 컬럼을 추가하는 이유**: 원본은 `createdAt` 정렬만
  쓰는데, `createPhotos`가 여러 사진을 한 번의 벌크 insert로 넣으면 `defaultNow()`
  타임스탬프가 밀리초 단위로 겹칠 수 있어 순서가 흔들릴 수 있다(원본엔 tie-break용
  serial이 없다). 사용자가 고른 업로드 순서를 확정적으로 보존하려고 명시적 정수
  컬럼을 추가한다 — 사소하지만 원본의 잠재적 결함을 그대로 가져오지 않기로 한
  독자적 판단이다.
- **`photoKeys`도 전체교체(향후 수정 시)**: 계약에 `photoKeys`를 넣어두는 지금 시점부터
  `tags`와 동일하게 "PATCH = 부분 수정 아니라 전체 교체" 원칙을 따르기로 한다
  (`review-write-and-report` 설계 메모와 같은 결). 수정 UI가 생길 때 별도 규칙을
  새로 만들 필요가 없다.
- **`getPublicUrl`이 `S3_PUBLIC_URL` 미설정 시 `storageKey`를 그대로 반환**: 원본과
  동일한 fallback이다. 이 경우 반환된 url이 실제로 열리지 않을 수 있지만(브라우저가
  storageKey를 경로로 해석 못함), 로컬 개발은 `.env.example`에 MinIO 공개 URL을
  기본값으로 채워두므로 실제로는 항상 유효한 URL이 나간다 — 코드 레벨에서 별도 방어를
  추가하지 않는다.
- **업로드 실패 시 부분 업로드 정리 안 함(AC17)**: 사진 3장 중 2장 업로드 성공 후
  3번째가 실패하면, 이미 스토리지에 올라간 2장은 지우지 않고 그대로 둔 채 에러만
  보여준다. 리뷰에 연결되지 않은 채 남지만 기능적 문제는 없고(누구에게도 노출 안 됨),
  정리 로직을 추가하는 비용이 지금 시점의 이득보다 크다고 판단했다(위 "범위 밖" 참고).

## 열린 질문

없음 — presign 제외·수정 UI 범위 제외·`position` 컬럼 추가·전체교체 원칙 전부 위
설계 메모에서 확정했다.

## 실행 결과 (2026-08-27)

- **AC1~22 전부 확인.** 계약(`packages/types`) → env/인프라 → 스토리지 추상화
  (`photoStorage.ts`) → 업로드 API → repository/service 배선 → 프런트(업로드 UI·
  썸네일·라이트박스) 순으로 구현. 신규 테스트: `photoStorage.test.ts`(입력 검증 4 +
  실 MinIO 4) · `uploadsRoute.test.ts` 6 · `reviewService.test.ts`/`officeReviewWriteRoute.test.ts`/
  `reviewRepository.test.ts`(통합) 사진 관련 케이스 다수 · 프런트
  `reviewsApi.test.ts`(uploadPhoto) 2 · `useOfficeReviews.test.ts`(업로드 오케스트레이션) 3 ·
  `ReviewSection.test.tsx`(작성 폼 첨부 6 + 표시/라이트박스 3) · `PhotoLightbox.test.tsx` 11.
- **Red 확인**: 업로드 검증 로직(`InvalidContentTypeError`/`FileTooLargeError`),
  `POST /api/uploads` 라우트, `officeReviewWriteRoute`의 photoKeys 연동, `PhotoLightbox`
  컴포넌트 전체, `ReviewSection`의 첨부·썸네일·라이트박스 통합은 모두 구현 전에 테스트를
  먼저 돌려 실패를 확인했다. `photoStorage.ts`의 검증 순서(타입 검사 → 용량 검사)는
  구현이 앞서 있었던 터라 일부러 검증 코드를 주석 처리해 두 테스트가 실제로 잡는지
  확인한 뒤 원복했다(사후 Red 검증) — `reviewRepository.ts`의 `insert`/`route`의
  `photoKeys` 전달 배선도 같은 방식으로 확인했다.
- **`position` 컬럼의 필요성은 통합 테스트로 강제 재현하지 못함(정직한 한계)**:
  `ORDER BY position`을 일부러 지우고 순서 테스트를 돌려봤지만 이번 실행에서는
  Postgres가 우연히 삽입 순서 그대로 반환해 테스트가 실패하지 않았다(정렬 안 된
  결과의 순서는 명세되지 않은 구현 세부사항이라 이렇게 통과하는 경우가 있을 수 있다).
  `ORDER BY` 없는 결과 순서에 의존하지 않는다는 원칙 자체는 관계형 DB의 표준 상식이라
  테스트가 못 잡았다고 되돌리지 않고 명시적 정렬을 그대로 유지했다.
- **실 MinIO 통합 테스트**: `docker compose up -d minio`(포트 9002/9003, 원본의
  9000/9001과 별도)로 띄운 뒤 `photoStorage.test.ts`의 실 업로드 스위트 8개 전부
  통과 — 버킷 자동 생성 + public-read 정책, 2000px 초과 이미지 축소, 2000px 미만
  이미지 미확대, gif→png 변환을 실제 오브젝트 스토리지로 확인했다.
- **개발 서버 스모크 테스트**: `bun run db:migrate`로 개발 DB에 마이그레이션 적용 후
  `bun run --cwd apps/api dev` + 실 MinIO에 대해 curl로 전체 플로우 검증 — 11250×11250
  실제 JPEG(macOS 배경화면을 sips로 변환)를 `POST /api/uploads`에 올려 2000×2000으로
  축소됨을 다운로드해 직접 확인, 그 `storageKey`로 `POST /api/offices/:id/reviews` →
  응답의 `photos[].url`이 `http://localhost:9002/reviews/...`로 정확히 계산됨 →
  `GET /api/offices/:id/reviews` 공개 목록에서도 동일하게 노출 → 그 URL을 curl로
  직접 열어 `Content-Type: image/jpeg` 200 응답을 확인. 테스트 데이터(사무소·사용자·
  리뷰·업로드된 MinIO 오브젝트)는 종료 후 전부 정리했다.
- **하네스 게이트**: `node .harness/gates/run-checks.mjs` 전체 통과
  (typecheck → lint → stylelint → test → build). `import/order` 린트 에러 1건
  (`reviewService.ts`의 `photoStorage` import 위치) 발견·수정.
- **기존 테스트 마이그레이션 규모**: `reviewSchema`에 필수 필드 `photos`가 추가되면서
  API 8개 파일 + 웹 6개 파일의 기존 리뷰 픽스처에 `photos: []`를 추가해야 했다
  (기계적 변경, 로직 변경 없음). `reviewRepository.test.ts`(통합)의 `insert`/`update`
  호출 44곳에는 스크립트로 `photoKeys: []`를 일괄 삽입한 뒤 삽입 개수(44)와 삽입 위치를
  전부 diff로 육안 확인했다 — 과거 세션에서 겪은 "일괄 스크립트가 무관한 라인까지
  건드린" 사고(덩이 E)를 반복하지 않기 위해서다.
