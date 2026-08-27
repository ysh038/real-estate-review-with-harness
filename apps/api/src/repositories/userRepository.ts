import { eq, sql } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { users } from "../db/schema";
import type { IUserRepository } from "../services/authService";

const toAuthUser = (row: {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
  createdAt: Date;
}) => ({ ...row, createdAt: row.createdAt.toISOString() });

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
        createdAt: users.createdAt,
      });

    // insert/update 대상이 항상 있는 upsert라 row는 항상 존재한다.
    if (!row) throw new Error("사용자 upsert가 행을 반환하지 않았습니다");
    return toAuthUser(row);
  },

  findById: async (userId) => {
    const [row] = await db
      .select({
        id: users.id,
        nickname: users.nickname,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return row ? toAuthUser(row) : null;
  },

  updateNickname: async (userId, nickname) => {
    const [row] = await db
      .update(users)
      .set({ nickname, updatedAt: sql`now()` })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        nickname: users.nickname,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
      });

    // requireAuth를 통과했다는 건 세션의 userId가 users에 실존한다는 뜻이라 항상 있다.
    if (!row) throw new Error("존재하지 않는 사용자의 닉네임을 갱신하려 했습니다");
    return toAuthUser(row);
  },

  delete: async (userId) => {
    await db.delete(users).where(eq(users.id, userId));
  },
});
