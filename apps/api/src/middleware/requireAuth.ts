import type { Context, MiddlewareHandler } from "hono";
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
 * 세션 쿠키가 있으면 사용자를, 없거나 무효면 `null`을 돌려준다 — 절대 401을 던지지
 * 않는다. `GET /api/offices/:id/reviews`처럼 로그인을 강제하진 않지만 "로그인했다면
 * 누구인지"가 응답(isHelpful)에 필요한 공개 라우트에서 쓴다
 * (근거: docs/specs/review-helpful-toggle.md 설계 메모).
 */
export const getOptionalAuthUser = async (
  c: Context,
  deps: IAuthServiceDeps,
): Promise<IAuthUser | null> => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const authService = createAuthService(deps);
  return authService.getUserBySessionId(sessionId);
};

/**
 * GET /api/me가 직접 하던 "세션 쿠키 → 사용자 확인, 없으면 401"을 공용화한다 —
 * 리뷰 작성·수정·삭제·신고가 전부 이 패턴을 반복하기 때문이다
 * (근거: docs/specs/review-write-and-report.md).
 */
export const requireAuth = (
  deps: IAuthServiceDeps,
): MiddlewareHandler<{ Variables: IAuthedVariables }> => {
  return async (c, next) => {
    const user = await getOptionalAuthUser(c, deps);
    if (!user) return c.json({ message: "인증이 필요합니다" }, 401);

    c.set("authUser", user);
    await next();
  };
};
