import { z } from "zod";

export * from "./office";

/**
 * 앱 간 계약(contract)의 단일 정본.
 * web·api 어느 쪽에서도 request/response 타입을 직접 정의하지 않는다.
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  uptimeSec: z.number().nonnegative(),
});

export type THealthResponse = z.infer<typeof healthResponseSchema>;
