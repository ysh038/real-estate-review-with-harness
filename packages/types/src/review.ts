import { z } from "zod";

import { officeSummarySchema } from "./office";
import { reviewTagEnum } from "./reviewTag";

/** 태그 종류 자체가 6개뿐이라 이 상한은 사실상 "전부 선택"과 같은 경계값이다. */
const REVIEW_TAGS_MAX = 6;

/**
 * 리뷰당 첨부 가능한 최대 사진 수(review-photo-upload 명세). 태그 상한(REVIEW_TAGS_MAX)과
 * 달리 export한다 — 태그는 6개짜리 고정 선택지라 프런트가 "더 못 고름" 상태를 스스로
 * 계산할 필요가 없지만, 사진은 사용자가 임의 개수를 골라 첨부하는 열린 목록이라
 * 파일 선택 버튼을 몇 장부터 숨길지 프런트도 같은 값을 알아야 한다.
 */
export const REVIEW_PHOTOS_MAX = 3;

/** 리뷰 본문 최소 길이 — 한 줄짜리 "좋아요"가 평점만 올리는 것을 막는다. */
export const REVIEW_CONTENT_MIN_LENGTH = 10;

export const REVIEW_PAGE_SIZE_DEFAULT = 20;
export const REVIEW_PAGE_SIZE_MAX = 50;

export const reviewRatingSchema = z.number().int().min(1).max(5);

/**
 * 원본(real-estate-agent-review)에는 별점이 없고 대신 이 필드들로 리뷰를 표현한다
 * (근거: docs/decisions.md #9). 값 자체는 사용자에게 보이는 한국어 라벨이라 원본 문구를
 * 그대로 채택했다 — 도메인 어휘로 취급, 통제변인(소스 미복사) 위반이 아니다.
 */
export const DEAL_TYPES = ["전세", "월세", "매매", "상가", "원룸·오피스텔"] as const;
export const DEAL_RESULTS = ["계약함", "안 함", "단순 상담"] as const;
export const dealTypeEnum = z.enum(DEAL_TYPES);
export const dealResultEnum = z.enum(DEAL_RESULTS);
export type TDealType = z.infer<typeof dealTypeEnum>;
export type TDealResult = z.infer<typeof dealResultEnum>;

const visitedYearSchema = z.number().int().min(2000).max(2100);
const visitedMonthSchema = z.number().int().min(1).max(12);

/**
 * 정형 설문 항목(Phase 12-C, docs/specs/review-structured-survey.md). 원본에는 항목
 * 자체가 미확정 상태(직접 확인)라 보기 문구는 이 저장소가 새로 정한다 — dealType/
 * dealResult와 달리 원본 도메인 어휘를 그대로 채택한 것이 아니다.
 */
export const EXPERTISE_LEVELS = ["전문적이었음", "보통", "아쉬웠음"] as const;
export const DEFECT_RESPONSES = ["원만히 해결됨", "미흡했음", "하자 없었음"] as const;
export const expertiseLevelEnum = z.enum(EXPERTISE_LEVELS);
export const defectResponseEnum = z.enum(DEFECT_RESPONSES);
export type TExpertiseLevel = z.infer<typeof expertiseLevelEnum>;
export type TDefectResponse = z.infer<typeof defectResponseEnum>;

/** 리뷰에 함께 노출되는 작성자 정보. 개인 식별에 쓰이지 않는 공개 필드만. */
export const reviewAuthorSchema = z.object({
  nickname: z.string(),
  profileImageUrl: z.string().nullable(),
});

export type TReviewAuthor = z.infer<typeof reviewAuthorSchema>;

/** 업로드된 사진 한 장. url은 storageKey로부터 계산되는 공개 접근 주소다. */
export const reviewPhotoSchema = z.object({
  storageKey: z.string(),
  url: z.string(),
});

export type TReviewPhoto = z.infer<typeof reviewPhotoSchema>;

export const reviewSchema = z.object({
  id: z.string().uuid(),
  officeId: z.string(),
  rating: reviewRatingSchema,
  content: z.string().min(REVIEW_CONTENT_MIN_LENGTH),
  author: reviewAuthorSchema,
  createdAt: z.string().datetime(),
  dealType: dealTypeEnum.nullable(),
  dealResult: dealResultEnum.nullable(),
  expertise: expertiseLevelEnum.nullable(),
  defectResponse: defectResponseEnum.nullable(),
  visitedYear: visitedYearSchema.nullable(),
  visitedMonth: visitedMonthSchema.nullable(),
  /** 태그가 없으면 빈 배열 — null 아님. */
  tags: z.array(reviewTagEnum),
  /** 사진이 없으면 빈 배열. 업로드한(제출한) 순서 그대로. */
  photos: z.array(reviewPhotoSchema),
  helpfulCount: z.number().int().nonnegative(),
  /** 비로그인 요청은 null("모름") — 로그인했지만 안 눌렀으면 false ("안 눌렀음"). */
  isHelpful: z.boolean().nullable(),
});

export type TReview = z.infer<typeof reviewSchema>;

/** POST /api/uploads 응답. */
export const uploadPhotoResponseSchema = z.object({
  storageKey: z.string(),
});

export type TUploadPhotoResponse = z.infer<typeof uploadPhotoResponseSchema>;

/**
 * POST /api/reviews/:id/helpful 응답. 토글은 항상 로그인 상태에서만 일어나므로
 * isHelpful에 null 케이스가 없다 (review-helpful-toggle 설계 메모).
 */
export const helpfulResponseSchema = z.object({
  helpfulCount: z.number().int().nonnegative(),
  isHelpful: z.boolean(),
});

export type THelpfulResponse = z.infer<typeof helpfulResponseSchema>;

export const reviewListResponseSchema = z.object({
  reviews: z.array(reviewSchema),
  /** 다음 페이지가 없으면 null. 값의 내부 구조에 의존하지 말 것 (불투명 커서). */
  nextCursor: z.string().nullable(),
});

export type TReviewListResponse = z.infer<typeof reviewListResponseSchema>;

/**
 * 내 리뷰 목록(`GET /api/me/reviews`) 전용 응답 — 공개 목록(reviewSchema)에는 없는
 * officeName·isHidden을 더한다. 별도 스키마로 두는 이유: 이 두 필드를 공개 응답에
 * 얹으면 "이 리뷰가 숨겨졌는지"를 다른 사용자에게 노출하게 된다
 * (근거: docs/specs/my-reviews-list.md 설계 메모).
 */
export const myReviewSchema = reviewSchema.extend({
  officeName: z.string(),
  isHidden: z.boolean(),
});

export type TMyReview = z.infer<typeof myReviewSchema>;

export const myReviewListResponseSchema = z.object({
  reviews: z.array(myReviewSchema),
  nextCursor: z.string().nullable(),
});

export type TMyReviewListResponse = z.infer<typeof myReviewListResponseSchema>;

/**
 * 관리자 숨김 리뷰 목록(`GET /api/admin/reviews/hidden`) 전용 응답 — officeName·
 * reportCount(누적 신고 수)·hiddenAt(숨겨진 시각)을 더한다
 * (근거: docs/specs/admin-hidden-reviews.md).
 */
export const adminHiddenReviewSchema = reviewSchema.extend({
  officeName: z.string(),
  reportCount: z.number().int().nonnegative(),
  hiddenAt: z.string().datetime(),
});

export type TAdminHiddenReview = z.infer<typeof adminHiddenReviewSchema>;

export const adminHiddenReviewListResponseSchema = z.object({
  reviews: z.array(adminHiddenReviewSchema),
  nextCursor: z.string().nullable(),
});

export type TAdminHiddenReviewListResponse = z.infer<
  typeof adminHiddenReviewListResponseSchema
>;

/**
 * 리뷰 목록 쿼리. 라우트가 직접 파싱하지 않도록 계약 쪽에 둔다.
 * limit 상한을 계약에 박아두면 한 번에 전부 긁어가는 요청이 400으로 막힌다.
 */
export const reviewListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(REVIEW_PAGE_SIZE_MAX)
    .default(REVIEW_PAGE_SIZE_DEFAULT),
});

export const reviewSortEnum = z.enum(["latest", "oldest"]);
export type TReviewSort = z.infer<typeof reviewSortEnum>;

/**
 * `GET /api/offices/:id/reviews` 전용 — 사무소 공개 목록에만 정렬을 둔다
 * (review-permalink-report-and-sort 명세). `/api/me/reviews`·관리자 숨김 목록은
 * `reviewListQuerySchema`를 그대로 쓴다.
 */
export const officeReviewListQuerySchema = reviewListQuerySchema.extend({
  sort: reviewSortEnum.default("latest"),
});

export type TOfficeReviewListQuery = z.infer<typeof officeReviewListQuerySchema>;

export type TReviewListQuery = z.infer<typeof reviewListQuerySchema>;

/**
 * 리뷰 작성·수정 요청 본문. 같은 모양이다 — PATCH는 부분 수정이 아니라 전체 교체
 * (근거: docs/specs/review-write-and-report.md 설계 메모, "누락 필드는 기존값 유지?"
 * 같은 partial-update 규칙을 새로 만들지 않기 위함).
 */
export const createReviewRequestSchema = z
  .object({
    rating: reviewRatingSchema,
    content: z.string().min(REVIEW_CONTENT_MIN_LENGTH),
    dealType: dealTypeEnum.optional(),
    dealResult: dealResultEnum.optional(),
    expertise: expertiseLevelEnum.optional(),
    defectResponse: defectResponseEnum.optional(),
    visitedYear: visitedYearSchema.optional(),
    visitedMonth: visitedMonthSchema.optional(),
    tags: z.array(reviewTagEnum).max(REVIEW_TAGS_MAX).optional(),
    /** 업로드 API(POST /api/uploads)로 먼저 받은 storageKey들. tags와 같은 전체교체
     * 원칙(review-photo-upload 설계 메모). */
    photoKeys: z.array(z.string().min(1)).max(REVIEW_PHOTOS_MAX).optional(),
  })
  // 연도만 있고 월이 없는(또는 반대) 반쪽 데이터를 막는다 — 원본과 동일한 제약
  // (docs/specs/review-deal-and-visit-fields.md 설계 메모).
  .refine((v) => (v.visitedYear == null) === (v.visitedMonth == null), {
    message: "방문 연도와 방문 월은 함께 입력하거나 함께 비워야 합니다",
    path: ["visitedMonth"],
  });

export type TCreateReviewRequest = z.infer<typeof createReviewRequestSchema>;

export const updateReviewRequestSchema = createReviewRequestSchema;

export type TUpdateReviewRequest = TCreateReviewRequest;

export const officeDetailResponseSchema = officeSummarySchema.extend({
  /** 리뷰가 없으면 null — "평점 0점"과 "평가 없음"은 다르다. */
  avgRating: z.number().nullable(),
  reviewCount: z.number().int().nonnegative(),
});

export type TOfficeDetailResponse = z.infer<typeof officeDetailResponseSchema>;
