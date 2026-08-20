import { Hono } from "hono";
import { cors } from "hono/cors";

import { createHealthRoute } from "./routes/health";
import { createOfficesRoute } from "./routes/offices";
import type { IOfficeRepository } from "./services/officeService";

export interface IAppDeps {
  officeRepository: IOfficeRepository;
}

/**
 * 라우트 조립만 담당한다. 서버 부팅(포트·env·DB 연결)은 index.ts.
 * 의존성을 주입받는 이유는 테스트다 — 단위 테스트가 DB 없이 라우트를 돌릴 수 있어야
 * 검증 게이트가 로컬 환경에 인질로 잡히지 않는다.
 *
 * CORS: apps/web(Next.js)과 apps/api(Hono)는 개발·운영 모두 항상 다른 origin(포트)이다
 * — 브라우저에서 직접 fetch하는 이번 명세(office-marker-bbox-sync)에서 실제로 막히는 걸
 * 확인했다. 지금은 인증 쿠키가 없는 공개 조회 API뿐이라 origin을 넓게 허용해도 안전하다.
 * 세션 쿠키가 생기는 Phase 1(카카오 OAuth)에서 credentials 요건에 맞춰 좁힌다.
 */
export const createApp = (deps: IAppDeps) =>
  new Hono()
    .use("*", cors())
    .route("/health", createHealthRoute())
    .route("/api/offices", createOfficesRoute(deps.officeRepository));
