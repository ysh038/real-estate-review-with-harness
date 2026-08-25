import { z } from "zod";

import { officeSummarySchema } from "./office";
import { reviewTagEnum } from "./reviewTag";

/** 태그 종류 자체가 6개뿐이라 이 상한은 사실상 "전부 선택"과 같은 경계값이다. */
const REVIEW_TAGS_MAX = 6;

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

/** 리뷰에 함께 노출되는 작성자 정보. 개인 식별에 쓰이지 않는 공개 필드만. */
export const reviewAuthorSchema = z.object({
  nickname: z.string(),
  profileImageUrl: z.string().nullable(),
});

export type TReviewAuthor = z.infer<typeof reviewAuthorSchema>;

export const reviewSchema = z.object({
  id: z.string().uuid(),
  officeId: z.string(),
  rating: reviewRatingSchema,
  content: z.string().min(REVIEW_CONTENT_MIN_LENGTH),
  author: reviewAuthorSchema,
  createdAt: z.string().datetime(),
  dealType: dealTypeEnum.nullable(),
  dealResult: dealResultEnum.nullable(),
  visitedYear: visitedYearSchema.nullable(),
  visitedMonth: visitedMonthSchema.nullable(),
  /** 태그가 없으면 빈 배열 — null 아님. */
  tags: z.array(reviewTagEnum),
  helpfulCount: z.number().int().nonnegative(),
  /** 비로그인 요청은 null("모름") — 로그인했지만 안 눌렀으면 false ("안 눌렀음"). */
  isHelpful: z.boolean().nullable(),
});

export type TReview = z.infer<typeof reviewSchema>;

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
    visitedYear: visitedYearSchema.optional(),
    visitedMonth: visitedMonthSchema.optional(),
    tags: z.array(reviewTagEnum).max(REVIEW_TAGS_MAX).optional(),
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
