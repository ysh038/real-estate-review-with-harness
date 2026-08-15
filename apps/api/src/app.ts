import { Hono } from "hono";

import { createHealthRoute } from "./routes/health";

/** 라우트 조립만 담당한다. 서버 부팅(포트·env)은 index.ts. */
export const createApp = () => new Hono().route("/health", createHealthRoute());
