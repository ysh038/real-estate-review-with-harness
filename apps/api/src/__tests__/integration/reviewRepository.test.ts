import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDb } from "../../db/client";
import {
  offices,
  reviewReports,
  reviews,
  users,
  type TOfficeInsert,
} from "../../db/schema";
import { createOfficeRepository } from "../../repositories/officeRepository";
import { createReviewRepository } from "../../repositories/reviewRepository";

/**
 * 실제 DB가 필요한 테스트. 접속할 수 없으면 통째로 skip한다
 * (officeRepository.test.ts 와 같은 이유 — 게이트가 로컬 환경에 인질로 잡히면 안 된다).
 */
const databaseUrl = process.env.DATABASE_URL;

const canConnect = async (url: string | undefined): Promise<boolean> => {
  if (!url) return false;
  const probe = postgres(url, { max: 1, connect_timeout: 2, onnotice: () => {} });
  try {
    await probe`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await probe.end({ timeout: 1 });
  }
};

const isDbReachable = await canConnect(databaseUrl);

const OFFICE: TOfficeInsert = {
  id: "review-test-office",
  name: "테스트 사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
};

const CONTENT = "열 자를 넘기는 충분한 길이의 리뷰 본문입니다";

describe.skipIf(!isDbReachable)("reviewRepository (real DB)", () => {
  const db = createDb(databaseUrl ?? "");
  const officeRepository = createOfficeRepository(db);
  const reviewRepository = createReviewRepository(db);

  /** 테스트용 사용자를 만들고 id 를 돌려준다. */
  const insertUser = async (kakaoId: string, nickname: string) => {
    const [row] = await db
      .insert(users)
      .values({ kakaoId, nickname })
      .returning({ id: users.id });
    return row!.id;
  };

  beforeAll(async () => {
    // AC1: 마이그레이션을 두 번 돌려도 실패하지 않는다.
    await migrate(db, { migrationsFolder: "./drizzle" });
    await migrate(db, { migrationsFolder: "./drizzle" });
  });

  // FK CASCADE 가 걸려 있어 users·offices 를 지우면 reviews 도 함께 사라진다.
  beforeEach(async () => {
    await db.delete(reviewReports);
    await db.delete(reviews);
    await db.delete(users);
    await db.delete(offices);
    await officeRepository.upsertMany([OFFICE]);
  });

  afterAll(async () => {
    await db.delete(reviewReports);
    await db.delete(reviews);
    await db.delete(users);
    await db.delete(offices);
  });

  it("AC1: 세 테이블이 존재하고 조회할 수 있다", async () => {
    await expect(
      reviewRepository.findByOfficeId(OFFICE.id, 10),
    ).resolves.toEqual([]);
  });

  it("AC2: 같은 사용자가 같은 사무소에 리뷰를 두 번 넣으면 DB 제약으로 거부된다", async () => {
    const userId = await insertUser("kakao-1", "사용자1");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId,
      rating: 5,
      content: CONTENT,
    });

    await expect(
      reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 3,
        content: CONTENT,
      }),
    ).rejects.toThrow();
  });

  it("AC3: 같은 사용자가 같은 리뷰를 두 번 신고하면 DB 제약으로 거부된다", async () => {
    const authorId = await insertUser("kakao-author", "글쓴이");
    const reporterId = await insertUser("kakao-reporter", "신고자");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: authorId,
      rating: 5,
      content: CONTENT,
    });
    const [review] = await reviewRepository.findByOfficeId(OFFICE.id, 1);

    await db
      .insert(reviewReports)
      .values({ reviewId: review!.id, reporterUserId: reporterId });

    await expect(
      db
        .insert(reviewReports)
        .values({ reviewId: review!.id, reporterUserId: reporterId }),
    ).rejects.toThrow();
  });

  it("AC6: rating 이 1~5 범위를 벗어나면 DB 제약으로 거부된다", async () => {
    const userId = await insertUser("kakao-range", "범위테스트");

    await expect(
      reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 6,
        content: CONTENT,
      }),
    ).rejects.toThrow();
  });

  it("본문이 10자 미만이면 DB 제약으로 거부된다", async () => {
    const userId = await insertUser("kakao-short", "짧은글");

    await expect(
      reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: "짧다",
      }),
    ).rejects.toThrow();
  });

  it("AC4: 리뷰가 달린 사무소를 조회하면 평점이 집계된다", async () => {
    const first = await insertUser("kakao-a", "가");
    const second = await insertUser("kakao-b", "나");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: first,
      rating: 5,
      content: CONTENT,
    });
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: second,
      rating: 4,
      content: CONTENT,
    });

    const ratings = await officeRepository.findVisibleRatingsByOfficeId(
      OFFICE.id,
    );

    expect(ratings.sort()).toEqual([4, 5]);
  });

  it("AC5/AC17: hidden_at 이 설정된 리뷰는 집계와 목록에서 모두 빠진다", async () => {
    const visible = await insertUser("kakao-visible", "보이는사람");
    const hidden = await insertUser("kakao-hidden", "숨겨진사람");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: visible,
      rating: 5,
      content: CONTENT,
    });
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: hidden,
      rating: 1,
      content: CONTENT,
      hiddenAt: new Date(),
    });

    const ratings = await officeRepository.findVisibleRatingsByOfficeId(
      OFFICE.id,
    );
    const rows = await reviewRepository.findByOfficeId(OFFICE.id, 10);

    expect(ratings).toEqual([5]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nickname).toBe("보이는사람");
  });

  it("AC18: 리뷰는 최신순으로 반환된다", async () => {
    const older = await insertUser("kakao-older", "먼저");
    const newer = await insertUser("kakao-newer", "나중");
    await db.insert(reviews).values({
      officeId: OFFICE.id,
      userId: older,
      rating: 3,
      content: CONTENT,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    await db.insert(reviews).values({
      officeId: OFFICE.id,
      userId: newer,
      rating: 4,
      content: CONTENT,
      createdAt: new Date("2026-08-15T00:00:00.000Z"),
    });

    const rows = await reviewRepository.findByOfficeId(OFFICE.id, 10);

    expect(rows.map((row) => row.nickname)).toEqual(["나중", "먼저"]);
  });

  it("AC11: 커서를 넘기면 그 지점 다음부터 반환한다 (겹침 없음)", async () => {
    const first = await insertUser("kakao-1st", "첫번째");
    const second = await insertUser("kakao-2nd", "두번째");
    const third = await insertUser("kakao-3rd", "세번째");
    await db.insert(reviews).values([
      {
        officeId: OFFICE.id,
        userId: first,
        rating: 5,
        content: CONTENT,
        createdAt: new Date("2026-08-03T00:00:00.000Z"),
      },
      {
        officeId: OFFICE.id,
        userId: second,
        rating: 4,
        content: CONTENT,
        createdAt: new Date("2026-08-02T00:00:00.000Z"),
      },
      {
        officeId: OFFICE.id,
        userId: third,
        rating: 3,
        content: CONTENT,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
      },
    ]);

    const page1 = await reviewRepository.findByOfficeId(OFFICE.id, 2);
    const last = page1.at(-1)!;
    const page2 = await reviewRepository.findByOfficeId(OFFICE.id, 2, {
      createdAt: last.createdAt,
      id: last.id,
    });

    expect(page1.map((row) => row.nickname)).toEqual(["첫번째", "두번째"]);
    expect(page2.map((row) => row.nickname)).toEqual(["세번째"]);
  });
});
