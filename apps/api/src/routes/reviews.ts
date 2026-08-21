import { zValidator } from "@hono/zod-validator";
import { reviewSchema, updateReviewRequestSchema } from "@repo/types";
import { Hono } from "hono";

import { type IAuthedVariables, requireAuth } from "../middleware/requireAuth";
import type { IAuthServiceDeps } from "../services/authService";
import {
  createReviewService,
  DuplicateReportError,
  ForbiddenReviewActionError,
  ReviewNotFoundError,
  SelfReportError,
  type IReviewWriteRepository,
} from "../services/reviewService";

export interface IReviewsRouteDeps extends IAuthServiceDeps {
  reviewRepository: IReviewWriteRepository;
}

/**
 * PATCH/DELETE /api/reviews/:id — 본인 리뷰 수정·삭제
 * POST /api/reviews/:id/report — 신고 (본인 리뷰 제외, 1인 1회, 5회 누적 시 자동 숨김)
 */
export const createReviewsRoute = (deps: IReviewsRouteDeps) => {
  const service = createReviewService(deps.reviewRepository);

  return new Hono<{ Variables: IAuthedVariables }>()
    .patch(
      "/:id",
      requireAuth(deps),
      zValidator("json", updateReviewRequestSchema),
      async (c) => {
        const { rating, content } = c.req.valid("json");
        try {
          const review = await service.update({
            reviewId: c.req.param("id"),
            authUser: c.get("authUser"),
            rating,
            content,
          });
          return c.json(reviewSchema.parse(review));
        } catch (error) {
          if (error instanceof ReviewNotFoundError) {
            return c.json({ message: error.message }, 404);
          }
          if (error instanceof ForbiddenReviewActionError) {
            return c.json({ message: error.message }, 403);
          }
          throw error;
        }
      },
    )
    .delete("/:id", requireAuth(deps), async (c) => {
      try {
        await service.remove({
          reviewId: c.req.param("id"),
          authUser: c.get("authUser"),
        });
        return c.body(null, 204);
      } catch (error) {
        if (error instanceof ReviewNotFoundError) {
          return c.json({ message: error.message }, 404);
        }
        if (error instanceof ForbiddenReviewActionError) {
          return c.json({ message: error.message }, 403);
        }
        throw error;
      }
    })
    .post("/:id/report", requireAuth(deps), async (c) => {
      try {
        await service.report({
          reviewId: c.req.param("id"),
          authUser: c.get("authUser"),
        });
        return c.body(null, 204);
      } catch (error) {
        if (error instanceof ReviewNotFoundError) {
          return c.json({ message: error.message }, 404);
        }
        if (error instanceof SelfReportError) {
          return c.json({ message: error.message }, 400);
        }
        if (error instanceof DuplicateReportError) {
          return c.json({ message: error.message }, 409);
        }
        throw error;
      }
    });
};
