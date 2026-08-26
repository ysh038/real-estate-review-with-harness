import { zValidator } from "@hono/zod-validator";
import { authUserSchema, updateNicknameRequestSchema } from "@repo/types";
import { Hono } from "hono";

import { requireAuth, type IAuthedVariables } from "../middleware/requireAuth";
import type { IAuthServiceDeps } from "../services/authService";

/** PATCH /api/users/me — 닉네임 수정 (mypage-shell-and-profile 명세). */
export const createUsersRoute = (deps: IAuthServiceDeps) =>
  new Hono<{ Variables: IAuthedVariables }>().patch(
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
  );
