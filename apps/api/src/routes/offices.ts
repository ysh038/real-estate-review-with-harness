import { zValidator } from "@hono/zod-validator";
import {
  bboxQuerySchema,
  createReviewRequestSchema,
  officeDetailResponseSchema,
  officeReviewListQuerySchema,
  officeSearchQuerySchema,
  officeSearchResponseSchema,
  officesByBboxResponseSchema,
  reviewListResponseSchema,
  reviewSchema,
} from "@repo/types";
import { Hono } from "hono";

import { getClientIp } from "../lib/clientIp";
import {
  type IAuthedVariables,
  getOptionalAuthUser,
  requireAuth,
} from "../middleware/requireAuth";
import type { IAuthServiceDeps } from "../services/authService";
import {
  createOfficeDetailService,
  createOfficeSearchService,
  createOfficeService,
  type IOfficeDetailRepository,
  type IOfficeRepository,
  type IOfficeSearchRepository,
} from "../services/officeService";
import {
  createReviewService,
  DuplicateReviewError,
  InvalidCursorError,
  ProfanityError,
  ReviewRateLimitedError,
  type IReviewWriteRepository,
} from "../services/reviewService";

export interface IOfficesRouteDeps extends IAuthServiceDeps {
  officeRepository: IOfficeRepository & IOfficeDetailRepository & IOfficeSearchRepository;
  reviewRepository: IReviewWriteRepository;
  photoPublicUrl: string | undefined;
}

/** 라우트는 검증 → 서비스 호출 → 응답만 한다. SQL·비즈니스 판단은 아래 레이어. */
export const createOfficesRoute = (deps: IOfficesRouteDeps) => {
  const { officeRepository, reviewRepository } = deps;
  const service = createOfficeService(officeRepository);
  const detailService = createOfficeDetailService(officeRepository);
  const searchService = createOfficeSearchService(officeRepository);
  const reviewService = createReviewService(reviewRepository, deps.photoPublicUrl);

  return new Hono<{ Variables: IAuthedVariables }>()
    .get("/", zValidator("query", bboxQuerySchema), async (c) => {
      const { bbox } = c.req.valid("query");
      const result = await service.findByBbox(bbox);

      return c.json(officesByBboxResponseSchema.parse(result));
    })
    // /:id 보다 먼저 등록해야 한다 — 안 그러면 Hono가 "search"를 id로 매칭한다
    // (office-search-bar 명세, 라우트 등록 순서 주의).
    .get("/search", zValidator("query", officeSearchQuerySchema), async (c) => {
      const { q } = c.req.valid("query");
      const result = await searchService.search(q);

      return c.json(officeSearchResponseSchema.parse(result));
    })
    .get("/:id", async (c) => {
      const detail = await detailService.findDetailById(c.req.param("id"));
      if (!detail) return c.json({ message: "사무소를 찾을 수 없습니다" }, 404);

      return c.json(officeDetailResponseSchema.parse(detail));
    })
    .get(
      "/:id/reviews",
      zValidator("query", officeReviewListQuerySchema),
      async (c) => {
        const { cursor, limit, sort } = c.req.valid("query");
        try {
          const requestingUser = await getOptionalAuthUser(c, deps);
          const result = await reviewService.listByOfficeId(
            c.req.param("id"),
            { limit, cursor, sort },
            requestingUser?.id ?? null,
          );

          return c.json(reviewListResponseSchema.parse(result));
        } catch (error) {
          // 깨진 커서는 클라이언트 잘못이다 — 500이 아니라 400으로 돌려준다.
          if (error instanceof InvalidCursorError) {
            return c.json({ message: error.message }, 400);
          }
          throw error;
        }
      },
    )
    .post(
      "/:id/reviews",
      requireAuth(deps),
      zValidator("json", createReviewRequestSchema),
      async (c) => {
        const officeId = c.req.param("id");
        // AC2: 없는 사무소면 404 — 리뷰를 붙일 대상 자체가 없다.
        const office = await officeRepository.findById(officeId);
        if (!office) return c.json({ message: "사무소를 찾을 수 없습니다" }, 404);

        const {
          rating,
          content,
          dealType,
          dealResult,
          visitedYear,
          visitedMonth,
          tags,
          photoKeys,
        } = c.req.valid("json");
        try {
          const review = await reviewService.create({
            officeId,
            authUser: c.get("authUser"),
            rating,
            content,
            clientIp: getClientIp(c),
            dealType,
            dealResult,
            visitedYear,
            visitedMonth,
            tags,
            photoKeys,
          });
          return c.json(reviewSchema.parse(review), 201);
        } catch (error) {
          if (error instanceof DuplicateReviewError) {
            return c.json({ message: error.message }, 409);
          }
          if (error instanceof ReviewRateLimitedError) {
            return c.json({ message: error.message }, 429);
          }
          if (error instanceof ProfanityError) {
            return c.json({ message: error.message }, 422);
          }
          throw error;
        }
      },
    );
};
