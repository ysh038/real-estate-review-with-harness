import { z } from "zod";

import { officeSummarySchema } from "./office";

/** 리뷰 본문 최소 길이 — 한 줄짜리 "좋아요"가 평점만 올리는 것을 막는다. */
export const REVIEW_CONTENT_MIN_LENGTH = 10;

export const REVIEW_PAGE_SIZE_DEFAULT = 20;
export const REVIEW_PAGE_SIZE_MAX = 50;

export const reviewRatingSchema = z.number().int().min(1).max(5);

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
});

export type TReview = z.infer<typeof reviewSchema>;

export const reviewListResponseSchema = z.object({
  reviews: z.array(reviewSchema),
  /** 다음 페이지가 없으면 null. 값의 내부 구조에 의존하지 말 것 (불투명 커서). */
  nextCursor: z.string().nullable(),
});

export type TReviewListResponse = z.infer<typeof reviewListResponseSchema>;

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
export const createReviewRequestSchema = z.object({
  rating: reviewRatingSchema,
  content: z.string().min(REVIEW_CONTENT_MIN_LENGTH),
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
