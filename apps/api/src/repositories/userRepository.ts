import { eq, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { users } from "../db/schema";
import type { IUserRepository } from "../services/authService";

export const createUserRepository = (db: TDatabase): IUserRepository => ({
  upsertByKakaoId: async (profile) => {
    const [row] = await db
      .insert(users)
      .values({
        kakaoId: profile.kakaoId,
        nickname: profile.nickname,
        profileImageUrl: profile.profileImageUrl,
      })
      .onConflictDoUpdate({
        target: users.kakaoId,
        set: {
          nickname: profile.nickname,
          profileImageUrl: profile.profileImageUrl,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: users.id,
        nickname: users.nickname,
        profileImageUrl: users.profileImageUrl,
      });

    // insert/update 대상이 항상 있는 upsert라 row는 항상 존재한다.
    if (!row) throw new Error("사용자 upsert가 행을 반환하지 않았습니다");
    return row;
  },

  findById: async (userId) => {
    const [row] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        profileImageUrl: users.profileImageUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row ?? null;
  },
});
