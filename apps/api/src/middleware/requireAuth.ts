import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";

import { SESSION_COOKIE_NAME } from "../lib/sessionCookie";
import {
  createAuthService,
  type IAuthServiceDeps,
  type IAuthUser,
} from "../services/authService";

export interface IAuthedVariables {
  authUser: IAuthUser;
}

/**
 * GET /api/me가 직접 하던 "세션 쿠키 → 사용자 확인, 없으면 401"을 공용화한다 —
 * 리뷰 작성·수정·삭제·신고가 전부 이 패턴을 반복하기 때문이다
 * (근거: docs/specs/review-write-and-report.md).
 */
export const requireAuth = (
  deps: IAuthServiceDeps,
): MiddlewareHandler<{ Variables: IAuthedVariables }> => {
  const authService = createAuthService(deps);

  return async (c, next) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    const user = sessionId ? await authService.getUserBySessionId(sessionId) : null;
    if (!user) return c.json({ message: "인증이 필요합니다" }, 401);

    c.set("authUser", user);
    await next();
  };
};
