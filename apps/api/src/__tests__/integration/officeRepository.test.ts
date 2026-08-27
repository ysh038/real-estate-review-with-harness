import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../db/client";
import { offices, reviews, users, type TOfficeInsert } from "../../db/schema";
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
  // offices를 지우면 reviews도 CASCADE로 함께 지워지므로 users만 따로 정리한다.
  beforeEach(async () => {
    await db.delete(offices);
    await db.delete(users);
  });

  afterAll(async () => {
    await db.delete(offices);
    await db.delete(users);
  });

  let userSeq = 0;
  const insertUser = async (nickname: string) => {
    userSeq += 1;
    const [row] = await db
      .insert(users)
      .values({ kakaoId: `search-test-${userSeq}`, nickname })
      .returning({ id: users.id });
    return row!.id;
  };

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

  it("AC4·AC6(geocoding-match-confidence): match_confidence가 저장되고 재시딩 시 최신값으로 갱신된다", async () => {
    const id = "41135-TEST-CONFIDENCE";
    await repository.upsertMany([
      buildOffice(id, 37.4, 127.1, { matchConfidence: 1 }),
    ]);

    const [beforeUpdate] = await repository.findByBbox(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      10,
    );
    expect(beforeUpdate?.matchConfidence).toBe(1);

    await repository.upsertMany([
      buildOffice(id, 37.4, 127.1, { matchConfidence: 0.5 }),
    ]);

    const [afterUpdate] = await repository.findByBbox(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      10,
    );
    expect(afterUpdate?.matchConfidence).toBe(0.5);
  });

  it("match_confidence를 안 주면 null로 저장된다(기존/수동 데이터와 동일한 상태)", async () => {
    const id = "41135-TEST-NO-CONFIDENCE";
    await repository.upsertMany([buildOffice(id, 37.4, 127.1)]);

    const [row] = await repository.findByBbox(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      10,
    );

    expect(row?.matchConfidence).toBeNull();
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

  describe("searchByQuery (office-search-bar)", () => {
    it("AC4·AC5: 이름 또는 주소에 검색어가 포함되면(대소문자 무시) 매칭된다", async () => {
      await repository.upsertMany([
        buildOffice("name-match", 37.4, 127.1, { name: "Bundang Realty" }),
        buildOffice("address-match", 37.4, 127.1, {
          name: "다른이름",
          address: "경기도 성남시 분당구 정자로 1",
        }),
        buildOffice("no-match", 37.4, 127.1, {
          name: "관련없음",
          address: "서울시 강남구",
        }),
      ]);

      const rows = await repository.searchByQuery("분당", 10);

      expect(rows.map((row) => row.id).sort()).toEqual([
        "address-match",
        "name-match",
      ]);
    });

    it("AC6: 비숨김 리뷰 수 내림차순으로 정렬된다", async () => {
      await repository.upsertMany([
        buildOffice("few-reviews", 37.4, 127.1, { name: "분당사무소A" }),
        buildOffice("many-reviews", 37.4, 127.1, { name: "분당사무소B" }),
        buildOffice("hidden-review-only", 37.4, 127.1, { name: "분당사무소C" }),
      ]);
      const [u1, u2, u3, u4] = await Promise.all([
        insertUser("리뷰어1"),
        insertUser("리뷰어2"),
        insertUser("리뷰어3"),
        insertUser("리뷰어4"),
      ]);
      await db.insert(reviews).values([
        { officeId: "few-reviews", userId: u1!, rating: 5, content: "테스트 리뷰 본문입니다" },
        { officeId: "many-reviews", userId: u2!, rating: 5, content: "테스트 리뷰 본문입니다" },
        { officeId: "many-reviews", userId: u3!, rating: 4, content: "테스트 리뷰 본문입니다" },
        // 숨김 리뷰는 개수에서 빠져야 한다 — hidden-review-only는 0건 취급.
        {
          officeId: "hidden-review-only",
          userId: u4!,
          rating: 1,
          content: "테스트 리뷰 본문입니다",
          hiddenAt: new Date(),
        },
      ]);

      const rows = await repository.searchByQuery("분당사무소", 10);

      expect(rows.map((row) => row.id)).toEqual([
        "many-reviews",
        "few-reviews",
        "hidden-review-only",
      ]);
    });

    it("AC7: 최대 limit 건까지만 반환한다", async () => {
      await repository.upsertMany(
        Array.from({ length: 10 }, (_, i) =>
          buildOffice(`many-${i}`, 37.4, 127.1, { name: `검색많음사무소${i}` }),
        ),
      );

      const rows = await repository.searchByQuery("검색많음", 8);

      expect(rows).toHaveLength(8);
    });

    it("AC8: 매칭되는 사무소가 없으면 빈 배열을 반환한다", async () => {
      const rows = await repository.searchByQuery("존재하지않는이름", 10);

      expect(rows).toEqual([]);
    });

    it("AC9: 검색어의 %는 와일드카드가 아니라 리터럴로 취급된다", async () => {
      // 이스케이프가 안 됐다면 "50%할인"이 "50" + (임의 문자) + "할인"으로 해석돼
      // literal-percent 뿐 아니라 사이에 다른 문자가 낀 wildcard-match-if-unescaped도
      // 매칭돼버린다 — 이 둘을 구분해야 이스케이프가 실제로 동작하는지 알 수 있다.
      await repository.upsertMany([
        buildOffice("literal-percent", 37.4, 127.1, { name: "50%할인부동산" }),
        buildOffice("wildcard-match-if-unescaped", 37.4, 127.1, {
          name: "50XX할인부동산",
        }),
      ]);

      const rows = await repository.searchByQuery("50%할인", 10);

      expect(rows.map((row) => row.id)).toEqual(["literal-percent"]);
    });

    it("AC9: 검색어의 _는 와일드카드가 아니라 리터럴로 취급된다", async () => {
      await repository.upsertMany([
        buildOffice("literal-underscore", 37.4, 127.1, { name: "성남_공인중개사" }),
        buildOffice("wildcard-match-if-unescaped", 37.4, 127.1, {
          name: "성남X공인중개사",
        }),
      ]);

      const rows = await repository.searchByQuery("성남_공인", 10);

      expect(rows.map((row) => row.id)).toEqual(["literal-underscore"]);
    });
  });
});
