import { zValidator } from "@hono/zod-validator";
import { authUserSchema, updateNicknameRequestSchema } from "@repo/types";
import { Hono } from "hono";
import { deleteCookie, getCookie } from "hono/cookie";

import { SESSION_COOKIE_NAME } from "../lib/sessionCookie";
import { requireAuth, type IAuthedVariables } from "../middleware/requireAuth";
import type { IAuthServiceDeps } from "../services/authService";

/**
 * PATCH /api/users/me — 닉네임 수정 (mypage-shell-and-profile 명세).
 * DELETE /api/users/me — 회원 탈퇴 (member-account-deletion-and-anonymization 명세).
 *   계정은 즉시 삭제하지만 작성한 리뷰는 지우지 않는다 — `reviews.user_id`가
 *   `ON DELETE SET NULL`이라 DB가 익명화를 알아서 처리한다.
 */
export const createUsersRoute = (deps: IAuthServiceDeps) =>
  new Hono<{ Variables: IAuthedVariables }>()
    .patch(
      "/me",
      requireAuth(deps),
      zValidator("json", updateNicknameRequestSchema),
      async (c) => {
        const { nickname } = c.req.valid("json");
        const authUser = c.get("authUser");
        const updated = await deps.userRepository.updateNickname(
          authUser.id,
          nickname,
        );
        return c.json(authUserSchema.parse(updated));
      },
    )
    .delete("/me", requireAuth(deps), async (c) => {
      const authUser = c.get("authUser");
      await deps.userRepository.delete(authUser.id);

      // 실 DB에서는 세션 행도 FK CASCADE로 이미 사라졌지만, 브라우저 쿠키 자체는
      // 별도로 지워야 한다(로그아웃 라우트와 동일한 처리, 근거: 명세 AC6).
      const sessionId = getCookie(c, SESSION_COOKIE_NAME);
      if (sessionId) await deps.sessionRepository.deleteById(sessionId);
      deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });

      return c.body(null, 204);
    });
