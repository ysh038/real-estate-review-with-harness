import { zValidator } from "@hono/zod-validator";
import {
  bboxQuerySchema,
  officeDetailResponseSchema,
  officesByBboxResponseSchema,
  reviewListQuerySchema,
  reviewListResponseSchema,
} from "@repo/types";
import { Hono } from "hono";

import {
  createOfficeDetailService,
  createOfficeService,
  type IOfficeDetailRepository,
  type IOfficeRepository,
} from "../services/officeService";
import {
  createReviewService,
  InvalidCursorError,
  type IReviewRepository,
} from "../services/reviewService";

export interface IOfficesRouteDeps {
  officeRepository: IOfficeRepository & IOfficeDetailRepository;
  reviewRepository: IReviewRepository;
}

/** 라우트는 검증 → 서비스 호출 → 응답만 한다. SQL·비즈니스 판단은 아래 레이어. */
export const createOfficesRoute = ({
  officeRepository,
  reviewRepository,
}: IOfficesRouteDeps) => {
  const service = createOfficeService(officeRepository);
  const detailService = createOfficeDetailService(officeRepository);
  const reviewService = createReviewService(reviewRepository);

  return new Hono()
    .get("/", zValidator("query", bboxQuerySchema), async (c) => {
      const { bbox } = c.req.valid("query");
      const result = await service.findByBbox(bbox);

      return c.json(officesByBboxResponseSchema.parse(result));
    })
    .get("/:id", async (c) => {
      const detail = await detailService.findDetailById(c.req.param("id"));
      if (!detail) return c.json({ message: "사무소를 찾을 수 없습니다" }, 404);

      return c.json(officeDetailResponseSchema.parse(detail));
    })
    .get(
      "/:id/reviews",
      zValidator("query", reviewListQuerySchema),
      async (c) => {
        const { cursor, limit } = c.req.valid("query");
        try {
          const result = await reviewService.listByOfficeId(
            c.req.param("id"),
            { limit, cursor },
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
    );
};
