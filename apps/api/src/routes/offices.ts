import { zValidator } from "@hono/zod-validator";
import { bboxQuerySchema, officesByBboxResponseSchema } from "@repo/types";
import { Hono } from "hono";

import {
  createOfficeService,
  type IOfficeRepository,
} from "../services/officeService";

/** 라우트는 검증 → 서비스 호출 → 응답만 한다. SQL·비즈니스 판단은 아래 레이어. */
export const createOfficesRoute = (repository: IOfficeRepository) => {
  const service = createOfficeService(repository);

  return new Hono().get("/", zValidator("query", bboxQuerySchema), async (c) => {
    const { bbox } = c.req.valid("query");
    const result = await service.findByBbox(bbox);

    return c.json(officesByBboxResponseSchema.parse(result));
  });
};
