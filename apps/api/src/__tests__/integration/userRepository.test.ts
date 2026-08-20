import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../db/client";
import { users } from "../../db/schema";
import { createUserRepository } from "../../repositories/userRepository";
import { TEST_DATABASE_URL, canConnect } from "../helpers/testDb";

/** 실제 DB가 필요한 테스트. 접속할 수 없으면 통째로 skip한다 (TEST_DATABASE_URL 은 helpers/testDb.ts 참고). */
const isDbReachable = await canConnect(TEST_DATABASE_URL);

describe.skipIf(!isDbReachable)("userRepository (real DB)", () => {
  const db = createDb(TEST_DATABASE_URL ?? "");
  const repository = createUserRepository(db);

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  beforeEach(async () => {
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(users);
  });

  it("AC1: kakaoId 가 처음이면 새 사용자를 만든다", async () => {
    const user = await repository.upsertByKakaoId({
      kakaoId: "K1",
      nickname: "홍길동",
      profileImageUrl: "https://x/a.png",
    });

    expect(user.nickname).toBe("홍길동");
    await expect(repository.findById(user.id)).resolves.toEqual(user);
  });

  it("AC1: 같은 kakaoId 로 다시 로그인하면 닉네임·프로필 이미지가 최신값으로 갱신되고 행이 늘지 않는다", async () => {
    const first = await repository.upsertByKakaoId({
      kakaoId: "K1",
      nickname: "옛날닉네임",
      profileImageUrl: "https://x/old.png",
    });

    const second = await repository.upsertByKakaoId({
      kakaoId: "K1",
      nickname: "새닉네임",
      profileImageUrl: "https://x/new.png",
    });

    expect(second.id).toBe(first.id);
    expect(second.nickname).toBe("새닉네임");
    expect(second.profileImageUrl).toBe("https://x/new.png");

    const rows = await db.select().from(users);
    expect(rows).toHaveLength(1);
  });

  it("존재하지 않는 id 로 findById 하면 null", async () => {
    await expect(
      repository.findById("00000000-0000-4000-8000-000000000000"),
    ).resolves.toBeNull();
  });
});
