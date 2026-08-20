import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../db/client";
import { offices, type TOfficeInsert } from "../../db/schema";
import { createOfficeRepository } from "../../repositories/officeRepository";
import { TEST_DATABASE_URL, canConnect } from "../helpers/testDb";

/**
 * 실제 DB가 필요한 테스트. 접속할 수 없으면 통째로 skip한다.
 *
 * 게이트(.harness/config.json 의 test 체크)가 로컬 Postgres 유무에 인질로 잡히면
 * 결국 게이트를 꺼버리게 된다. DB가 있으면 더 검증하고, 없으면 단위 테스트만 돈다.
 * TEST_DATABASE_URL 을 쓰는 이유는 helpers/testDb.ts 참고 — 시딩 데이터가 든
 * DATABASE_URL 을 절대 재사용하지 않는다.
 */
const isDbReachable = await canConnect(TEST_DATABASE_URL);

const buildOffice = (
  id: string,
  lat: number,
  lng: number,
  overrides: Partial<TOfficeInsert> = {},
): TOfficeInsert => ({
  id,
  name: `사무소 ${id}`,
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat,
  lng,
  ...overrides,
});

describe.skipIf(!isDbReachable)("officeRepository (real DB)", () => {
  const db = createDb(TEST_DATABASE_URL ?? "");
  const repository = createOfficeRepository(db);

  beforeAll(async () => {
    // AC1: 마이그레이션을 두 번 돌려도 실패하지 않는다 (이미 적용된 것은 건너뛴다).
    await migrate(db, { migrationsFolder: "./drizzle" });
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  // 테스트끼리 행이 새면 단정이 조용히 무의미해진다 — 매 케이스 전에 비운다.
  beforeEach(async () => {
    await db.delete(offices);
  });

  afterAll(async () => {
    await db.delete(offices);
  });

  it("AC1: offices 테이블이 존재하고 조회할 수 있다", async () => {
    await expect(repository.findByBbox(
      { minLng: -180, minLat: -90, maxLng: 180, maxLat: 90 },
      10,
    )).resolves.toEqual([]);
  });

  it("AC2: 같은 id 를 두 번 upsert하면 행은 1개이고 최신 값으로 갱신된다", async () => {
    const id = "41135-TEST-0001";
    await repository.upsertMany([buildOffice(id, 37.4, 127.1)]);
    await repository.upsertMany([
      buildOffice(id, 37.4, 127.1, { name: "이름 변경됨", phone: "031-999-9999" }),
    ]);

    const rows = await repository.findByBbox(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      10,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("이름 변경됨");
    expect(rows[0]?.phone).toBe("031-999-9999");
  });

  it("AC3: bbox 안의 사무소만 반환하고, 경계선 위의 좌표는 포함한다", async () => {
    await repository.upsertMany([
      buildOffice("inside", 37.4, 127.1),
      buildOffice("on-min-corner", 37.3, 127.0),
      buildOffice("on-max-corner", 37.5, 127.2),
      buildOffice("outside-lat", 37.6, 127.1),
      buildOffice("outside-lng", 37.4, 127.3),
    ]);

    const rows = await repository.findByBbox(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      100,
    );

    expect(rows.map((row) => row.id).sort()).toEqual([
      "inside",
      "on-max-corner",
      "on-min-corner",
    ]);
  });
});
