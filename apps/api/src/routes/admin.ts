import { zValidator } from "@hono/zod-validator";
import {
  adminHiddenReviewListResponseSchema,
  reviewListQuerySchema,
  reviewSchema,
} from "@repo/types";
import { Hono } from "hono";

import { requireAdmin, type IRequireAdminDeps } from "../middleware/requireAdmin";
import {
  createReviewService,
  InvalidCursorError,
  ReviewAlreadyVisibleError,
  ReviewNotFoundError,
  type IReviewWriteRepository,
} from "../services/reviewService";

export interface IAdminRouteDeps extends IRequireAdminDeps {
  reviewRepository: IReviewWriteRepository;
}

/**
 * GET /api/admin/reviews/hidden — 숨김 리뷰 목록
 * POST /api/admin/reviews/:id/restore — 복구
 * 원본과 동일하게 admin web UI 없이 API만 (근거: docs/specs/admin-hidden-reviews.md).
 */
export const createAdminRoute = (deps: IAdminRouteDeps) => {
  const service = createReviewService(deps.reviewRepository);

  return new Hono()
    .get(
      "/reviews/hidden",
      requireAdmin(deps),
      zValidator("query", reviewListQuerySchema),
      async (c) => {
        const { cursor, limit } = c.req.valid("query");
        try {
          const result = await service.listHidden({ limit, cursor });
          return c.json(adminHiddenReviewListResponseSchema.parse(result));
        } catch (error) {
          if (error instanceof InvalidCursorError) {
            return c.json({ message: error.message }, 400);
          }
          throw error;
        }
      },
    )
    .post("/reviews/:id/restore", requireAdmin(deps), async (c) => {
      try {
        const restored = await service.restore(c.req.param("id"));
        return c.json(reviewSchema.parse(restored));
      } catch (error) {
        if (error instanceof ReviewNotFoundError) {
          return c.json({ message: error.message }, 404);
        }
        if (error instanceof ReviewAlreadyVisibleError) {
          return c.json({ message: error.message }, 409);
        }
        throw error;
      }
    });
};
