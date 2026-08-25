import type { MiddlewareHandler } from "hono";

const ADMIN_API_KEY_HEADER = "x-admin-api-key";

export interface IRequireAdminDeps {
  /** 미설정(undefined)이면 관리자 기능 자체가 꺼진 상태다 — 503으로 구분한다. */
  adminApiKey: string | undefined;
}

/**
 * `x-admin-api-key` 헤더 검증. 이 저장소의 기존 DI 패턴을 따라 전역 env를 직접 읽지
 * 않고 deps로 주입받는다 — 단위 테스트가 실제 env 없이 라우트를 돌릴 수 있어야 한다
 * (근거: docs/specs/admin-hidden-reviews.md 설계 메모).
 */
export const requireAdmin = (deps: IRequireAdminDeps): MiddlewareHandler => {
  return async (c, next) => {
    if (!deps.adminApiKey) {
      return c.json({ message: "관리자 기능이 설정되지 않았습니다" }, 503);
    }

    const provided = c.req.header(ADMIN_API_KEY_HEADER);
    if (!provided || provided !== deps.adminApiKey) {
      return c.json({ message: "권한이 없습니다" }, 403);
    }

    await next();
  };
};
