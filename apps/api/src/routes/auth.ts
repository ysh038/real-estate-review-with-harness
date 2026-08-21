import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { IKakaoOAuthClient } from "../lib/kakaoOAuthClient";
import { SESSION_COOKIE_NAME } from "../lib/sessionCookie";
import { requireAuth, type IAuthedVariables } from "../middleware/requireAuth";
import { createAuthService, type IAuthServiceDeps } from "../services/authService";

const STATE_COOKIE = "kakao_oauth_state";
// 로그인 시작~콜백 사이에만 필요 — 카카오 로그인 화면 왕복 시간이면 충분하다.
const STATE_COOKIE_MAX_AGE_SEC = 10 * 60;
// authService 의 SESSION_TTL_MS(30일)와 맞춘다. 쿠키 만료가 서버 세션보다 먼저 끝나면
// 브라우저가 유효한 세션 쿠키를 조용히 지워버려 사용자가 이유 없이 로그아웃된 것처럼 보인다.
const SESSION_COOKIE_MAX_AGE_SEC = 30 * 24 * 60 * 60;

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});

export interface IAuthRouteDeps extends IAuthServiceDeps {
  oauthClient: IKakaoOAuthClient;
  webBaseUrl: string;
  isProduction: boolean;
}

/**
 * GET /auth/kakao — 로그인 시작 (state 쿠키 발급 후 카카오로 리다이렉트)
 * GET /auth/kakao/callback — 콜백 (state 검증 → 로그인 처리 → 세션 쿠키 → web으로 리다이렉트)
 *
 * 브라우저 최상위 리다이렉트 왕복이라 JSON이 아니라 3xx만 응답한다. 실패 사유를 노출하지
 * 않고 web으로 되돌리는 이유: 여기는 아직 인증 전이라 에러 상세를 클라이언트에 줄 이유가 없다.
 */
export const createKakaoOAuthRoute = (deps: IAuthRouteDeps) => {
  const service = createAuthService(deps);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: deps.isProduction,
    path: "/",
  };

  return new Hono()
    .get("/", (c) => {
      const state = randomUUID();
      setCookie(c, STATE_COOKIE, state, {
        ...cookieOptions,
        maxAge: STATE_COOKIE_MAX_AGE_SEC,
      });
      return c.redirect(deps.oauthClient.buildAuthorizeUrl(state));
    })
    .get("/callback", zValidator("query", callbackQuerySchema), async (c) => {
      const { code, state } = c.req.valid("query");
      const expectedState = getCookie(c, STATE_COOKIE);
      deleteCookie(c, STATE_COOKIE, { path: "/" });

      if (!code || !state) {
        return c.redirect(`${deps.webBaseUrl}/?loginError=1`);
      }

      try {
        const { sessionId, expiresAt } = await service.handleCallback({
          code,
          state,
          expectedState,
        });
        setCookie(c, SESSION_COOKIE_NAME, sessionId, {
          ...cookieOptions,
          maxAge: SESSION_COOKIE_MAX_AGE_SEC,
          expires: expiresAt,
        });
        return c.redirect(`${deps.webBaseUrl}/`);
      } catch {
        // AC3(state 불일치)·AC4(토큰 교환/프로필 조회 실패) 전부 여기로 모인다 —
        // 실패 사유를 구분해 노출할 화면이 아직 없다.
        return c.redirect(`${deps.webBaseUrl}/?loginError=1`);
      }
    });
};

/** GET /api/me — 세션으로 현재 사용자 확인 (AC5·AC6) */
export const createMeRoute = (deps: IAuthServiceDeps) =>
  new Hono<{ Variables: IAuthedVariables }>().get("/", requireAuth(deps), (c) =>
    c.json(c.get("authUser")),
  );

/** POST /api/auth/logout — 세션 무효화 (AC7) */
export const createAuthActionsRoute = (deps: IAuthServiceDeps) => {
  const service = createAuthService(deps);

  return new Hono().post("/logout", async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE_NAME);
    if (sessionId) {
      await service.logout(sessionId);
      deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
    }
    return c.body(null, 204);
  });
};
