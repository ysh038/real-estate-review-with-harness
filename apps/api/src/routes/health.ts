import { healthResponseSchema, type THealthResponse } from "@repo/types";
import { Hono } from "hono";

const startedAt = Date.now();

export const createHealthRoute = () =>
  new Hono().get("/", (c) => {
    const body: THealthResponse = {
      status: "ok",
      service: "@repo/api",
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    };
    return c.json(healthResponseSchema.parse(body));
  });
