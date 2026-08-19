import { Hono } from "hono";

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
 */
export const createApp = (deps: IAppDeps) =>
  new Hono()
    .route("/health", createHealthRoute())
    .route("/api/offices", createOfficesRoute(deps.officeRepository));
