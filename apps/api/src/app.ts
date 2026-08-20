import { Hono } from "hono";
import { cors } from "hono/cors";

import {
  createAuthActionsRoute,
  createKakaoOAuthRoute,
  createMeRoute,
  type IAuthRouteDeps,
} from "./routes/auth";
import { createHealthRoute } from "./routes/health";
import { createOfficesRoute } from "./routes/offices";
import type {
  IOfficeDetailRepository,
  IOfficeRepository,
} from "./services/officeService";
import type { IReviewRepository } from "./services/reviewService";

export interface IAppDeps extends IAuthRouteDeps {
  officeRepository: IOfficeRepository & IOfficeDetailRepository;
  reviewRepository: IReviewRepository;
}

/**
 * 라우트 조립만 담당한다. 서버 부팅(포트·env·DB 연결)은 index.ts.
 * 의존성을 주입받는 이유는 테스트다 — 단위 테스트가 DB 없이 라우트를 돌릴 수 있어야
 * 검증 게이트가 로컬 환경에 인질로 잡히지 않는다.
 *
 * CORS: apps/web(Next.js)과 apps/api(Hono)는 개발·운영 모두 항상 다른 origin(포트)이다.
 * 세션 쿠키(카카오 OAuth, docs/specs/kakao-oauth-login.md)가 생기면서 `credentials: true`
 * 가 필요해졌다 — 와일드카드 origin(`*`)은 `Access-Control-Allow-Credentials: true` 와
 * 함께 쓸 수 없으므로(스펙 위반, 브라우저가 거부) 특정 origin(`deps.webBaseUrl`)만 허용한다.
 */
export const createApp = (deps: IAppDeps) =>
  new Hono()
    .use("*", cors({ origin: deps.webBaseUrl, credentials: true }))
    .route("/health", createHealthRoute())
    .route("/auth/kakao", createKakaoOAuthRoute(deps))
    .route("/api/offices", createOfficesRoute(deps))
    .route("/api/me", createMeRoute(deps))
    .route("/api/auth", createAuthActionsRoute(deps));
