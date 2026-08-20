import { eq } from "drizzle-orm";

import type { TDatabase } from "../db/client";
import { sessions } from "../db/schema";
import type { ISessionRepository } from "../services/authService";

export const createSessionRepository = (db: TDatabase): ISessionRepository => ({
  create: async (session) => {
    await db.insert(sessions).values(session);
  },

  findById: async (id) => {
    const [row] = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    return row ?? null;
  },

  deleteById: async (id) => {
    await db.delete(sessions).where(eq(sessions.id, id));
  },
});
