import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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
import { TEST_DATABASE_URL, canConnect } from "../helpers/testDb";

/**
 * 실제 DB가 필요한 테스트. 접속할 수 없으면 통째로 skip한다
 * (officeRepository.test.ts 와 같은 이유 — 게이트가 로컬 환경에 인질로 잡히면 안 된다).
 * TEST_DATABASE_URL 을 쓰는 이유는 helpers/testDb.ts 참고.
 */
const isDbReachable = await canConnect(TEST_DATABASE_URL);

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
  const db = createDb(TEST_DATABASE_URL ?? "");
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
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });

    await expect(
      reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 3,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
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
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
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
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
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
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      }),
    ).rejects.toThrow();
  });

  it("AC10(review-deal-and-visit-fields): 거래정보·방문시기가 실DB를 왕복한다", async () => {
    const userId = await insertUser("kakao-deal-info", "거래정보테스트");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId,
      rating: 5,
      content: CONTENT,
      createdFromIp: null,
      dealType: "전세",
      dealResult: "계약함",
      expertise: null,
      defectResponse: null,
      visitedYear: 2026,
      visitedMonth: 3,
      tags: [],
      photoKeys: [],
    });

    const [row] = await reviewRepository.findByOfficeId(OFFICE.id, 1);

    expect(row?.dealType).toBe("전세");
    expect(row?.dealResult).toBe("계약함");
    expect(row?.visitedYear).toBe(2026);
    expect(row?.visitedMonth).toBe(3);
  });

  it("AC4: 리뷰가 달린 사무소를 조회하면 평점이 집계된다", async () => {
    const first = await insertUser("kakao-a", "가");
    const second = await insertUser("kakao-b", "나");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: first,
      rating: 5,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: second,
      rating: 4,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
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
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
    // "이미 숨겨진 리뷰"는 신고 흐름을 거치지 않고 픽스처로 직접 만든다 —
    // insert()는 이제 실제 작성 API가 쓰는 메서드라 hiddenAt을 받지 않는다.
    await db.insert(reviews).values({
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

  it("AC7: 24시간 안에 같은 (사무소, IP)로 작성된 리뷰가 있으면 true", async () => {
    const userId = await insertUser("kakao-ip-1", "아이피테스트1");
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId,
      rating: 5,
      content: CONTENT,
      createdFromIp: "203.0.113.1",
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });

    await expect(
      reviewRepository.hasRecentReviewFromIp(OFFICE.id, "203.0.113.1"),
    ).resolves.toBe(true);
  });

  it("AC7: 다른 IP거나 24시간이 지난 리뷰면 false", async () => {
    const sameIpOldUser = await insertUser("kakao-ip-2", "아이피테스트2");
    const otherIpUser = await insertUser("kakao-ip-3", "아이피테스트3");
    // 24시간을 넘긴 리뷰 — repository.insert는 createdAt을 지정할 수 없으니 db로 직접 만든다.
    await db.insert(reviews).values({
      officeId: OFFICE.id,
      userId: sameIpOldUser,
      rating: 5,
      content: CONTENT,
      createdFromIp: "203.0.113.1",
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: otherIpUser,
      rating: 5,
      content: CONTENT,
      createdFromIp: "198.51.100.1",
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });

    await expect(
      reviewRepository.hasRecentReviewFromIp(OFFICE.id, "203.0.113.1"),
    ).resolves.toBe(false);
    await expect(
      reviewRepository.hasRecentReviewFromIp(OFFICE.id, "192.0.2.1"),
    ).resolves.toBe(false);
  });

  it("AC12: 수정하면 updatedAt이 이전보다 커진다", async () => {
    const userId = await insertUser("kakao-update", "수정테스트");
    const created = await reviewRepository.insert({
      officeId: OFFICE.id,
      userId,
      rating: 3,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
    const [before] = await db
      .select({ updatedAt: reviews.updatedAt })
      .from(reviews)
      .where(eq(reviews.id, created.id));

    await reviewRepository.update(created.id, {
      rating: 5,
      content: "수정된 충분히 긴 리뷰 본문입니다",
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
    const [after] = await db
      .select({ updatedAt: reviews.updatedAt })
      .from(reviews)
      .where(eq(reviews.id, created.id));

    expect(after!.updatedAt.getTime()).toBeGreaterThan(
      before!.updatedAt.getTime(),
    );
  });

  it("AC13: 삭제하면 목록·단건 조회 모두에서 사라진다", async () => {
    const userId = await insertUser("kakao-delete", "삭제테스트");
    const created = await reviewRepository.insert({
      officeId: OFFICE.id,
      userId,
      rating: 3,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });

    await reviewRepository.deleteById(created.id);

    await expect(reviewRepository.findById(created.id)).resolves.toBeNull();
    const rows = await reviewRepository.findByOfficeId(OFFICE.id, 10);
    expect(rows.find((row) => row.id === created.id)).toBeUndefined();
  });

  it("AC18: 신고가 4건이면 그대로 노출되고, 5번째에 hidden_at이 설정된다", async () => {
    const authorId = await insertUser("kakao-reported-author", "글쓴이");
    const created = await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: authorId,
      rating: 3,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      expertise: null,
      defectResponse: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photoKeys: [],
    });
    const reporterIds = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        insertUser(`kakao-reporter-${i}`, `신고자${i}`),
      ),
    );

    for (const reporterId of reporterIds.slice(0, 4)) {
      await reviewRepository.insertReport(created.id, reporterId);
      await reviewRepository.hideIfThresholdReached(created.id, 5);
    }
    const [afterFour] = await db
      .select({ hiddenAt: reviews.hiddenAt })
      .from(reviews)
      .where(eq(reviews.id, created.id));
    expect(afterFour!.hiddenAt).toBeNull();

    await reviewRepository.insertReport(created.id, reporterIds[4]!);
    await reviewRepository.hideIfThresholdReached(created.id, 5);
    const [afterFive] = await db
      .select({ hiddenAt: reviews.hiddenAt })
      .from(reviews)
      .where(eq(reviews.id, created.id));
    expect(afterFive!.hiddenAt).not.toBeNull();
  });

  describe("태그 (review-tags)", () => {
    it("insert 시 넘긴 태그가 review_tags 를 왕복한다", async () => {
      const userId = await insertUser("kakao-tags-1", "사용자태그1");

      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함", "응답 빠름"],
        photoKeys: [],
      });

      expect(created.tags.sort()).toEqual(["응답 빠름", "친절함"]);

      const [refetched] = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      expect(refetched?.tags.sort()).toEqual(["응답 빠름", "친절함"]);

      const byId = await reviewRepository.findById(created.id);
      expect(byId?.tags.sort()).toEqual(["응답 빠름", "친절함"]);
    });

    it("update에서 태그를 생략하면(빈 배열) 기존 태그가 전부 삭제된다(전체교체)", async () => {
      const userId = await insertUser("kakao-tags-2", "사용자태그2");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함", "강매 없음"],
        photoKeys: [],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 4,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      expect(updated.tags).toEqual([]);
      const refetched = await reviewRepository.findById(created.id);
      expect(refetched?.tags).toEqual([]);
    });

    it("update에서 태그를 다른 조합으로 바꾸면 기존 태그는 사라지고 새 태그만 남는다", async () => {
      const userId = await insertUser("kakao-tags-3", "사용자태그3");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
        photoKeys: [],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 5,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["설명 꼼꼼", "허위매물 없음"],
        photoKeys: [],
      });

      expect(updated.tags.sort()).toEqual(["설명 꼼꼼", "허위매물 없음"]);
    });
  });

  describe("사진 (review-photo-upload)", () => {
    it("AC11: insert 시 넘긴 photoKeys가 제출한 순서 그대로 review_photos를 왕복한다", async () => {
      const userId = await insertUser("kakao-photos-1", "사용자사진1");

      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: ["uploads/first.jpg", "uploads/second.jpg", "uploads/third.jpg"],
      });

      expect(created.photos.map((p) => p.storageKey)).toEqual([
        "uploads/first.jpg",
        "uploads/second.jpg",
        "uploads/third.jpg",
      ]);

      const [refetched] = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      expect(refetched?.photos.map((p) => p.storageKey)).toEqual([
        "uploads/first.jpg",
        "uploads/second.jpg",
        "uploads/third.jpg",
      ]);
    });

    it("update에서 photoKeys를 생략하면(빈 배열) 기존 사진이 전부 삭제된다(전체교체)", async () => {
      const userId = await insertUser("kakao-photos-2", "사용자사진2");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: ["uploads/a.jpg", "uploads/b.jpg"],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 4,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      expect(updated.photos).toEqual([]);
      const [refetched] = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      expect(refetched?.photos).toEqual([]);
    });

    it("update에서 photoKeys를 다른 조합·순서로 바꾸면 기존 사진은 사라지고 새 순서만 남는다", async () => {
      const userId = await insertUser("kakao-photos-3", "사용자사진3");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: ["uploads/old.jpg"],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 5,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: ["uploads/new-2.jpg", "uploads/new-1.jpg"],
      });

      expect(updated.photos.map((p) => p.storageKey)).toEqual([
        "uploads/new-2.jpg",
        "uploads/new-1.jpg",
      ]);
    });
  });

  describe("태그 집계 (review-tags, officeRepository)", () => {
    it("숨겨진 리뷰의 태그는 findTagCountsByOfficeId 집계에서 제외된다 (AC9)", async () => {
      const visibleAuthor = await insertUser("kakao-tagcount-visible", "보이는사용자");
      const hiddenAuthor = await insertUser("kakao-tagcount-hidden", "숨김사용자");

      await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: visibleAuthor,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
        photoKeys: [],
      });
      const hidden = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: hiddenAuthor,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
        photoKeys: [],
      });
      await db
        .update(reviews)
        .set({ hiddenAt: new Date() })
        .where(eq(reviews.id, hidden.id));

      const tagCounts = await officeRepository.findTagCountsByOfficeId(OFFICE.id);

      expect(tagCounts).toEqual([{ tag: "친절함", count: 1 }]);
    });

    it("findTopTagCountsByOfficeIds 는 여러 사무소를 한 번에 배치 조회한다 (AC10)", async () => {
      const otherOffice: TOfficeInsert = { ...OFFICE, id: "review-test-office-2" };
      await officeRepository.upsertMany([otherOffice]);

      const userA = await insertUser("kakao-batch-a", "사용자A");
      const userB = await insertUser("kakao-batch-b", "사용자B");

      await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: userA,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
        photoKeys: [],
      });
      await reviewRepository.insert({
        officeId: otherOffice.id,
        userId: userB,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["응답 빠름"],
        photoKeys: [],
      });

      const result = await officeRepository.findTopTagCountsByOfficeIds(
        [OFFICE.id, otherOffice.id],
        2,
      );

      expect(result.get(OFFICE.id)).toEqual([{ tag: "친절함", count: 1 }]);
      expect(result.get(otherOffice.id)).toEqual([{ tag: "응답 빠름", count: 1 }]);
    });
  });

  describe("도움돼요 (review-helpful-toggle)", () => {
    it("AC6·AC7: 처음 누르면 isHelpful true·count 1, 다시 누르면 false·count 0", async () => {
      const author = await insertUser("kakao-helpful-author", "글쓴이");
      const voter = await insertUser("kakao-helpful-voter", "투표자");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const first = await reviewRepository.toggleHelpful(review.id, voter);
      expect(first).toEqual({ helpfulCount: 1, isHelpful: true });

      const second = await reviewRepository.toggleHelpful(review.id, voter);
      expect(second).toEqual({ helpfulCount: 0, isHelpful: false });
    });

    it("AC8: 본인 리뷰에도 도움돼요를 누를 수 있다", async () => {
      const author = await insertUser("kakao-helpful-self", "본인투표");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const result = await reviewRepository.toggleHelpful(review.id, author);

      expect(result).toEqual({ helpfulCount: 1, isHelpful: true });
    });

    it("여러 사용자가 누르면 helpfulCount가 누적된다", async () => {
      const author = await insertUser("kakao-helpful-multi-author", "글쓴이2");
      const voterA = await insertUser("kakao-helpful-multi-a", "투표자A");
      const voterB = await insertUser("kakao-helpful-multi-b", "투표자B");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      await reviewRepository.toggleHelpful(review.id, voterA);
      const afterBoth = await reviewRepository.toggleHelpful(review.id, voterB);

      expect(afterBoth).toEqual({ helpfulCount: 2, isHelpful: true });
    });

    it("AC9·AC10·AC11: findByOfficeId가 requestingUserId 기준으로 helpfulCount·isHelpful을 계산한다", async () => {
      const author = await insertUser("kakao-helpful-list-author", "글쓴이3");
      const voter = await insertUser("kakao-helpful-list-voter", "투표자3");
      const bystander = await insertUser("kakao-helpful-list-bystander", "구경꾼");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await reviewRepository.toggleHelpful(review.id, voter);

      const asVoter = await reviewRepository.findByOfficeId(
        OFFICE.id,
        10,
        undefined,
        voter,
      );
      const asBystander = await reviewRepository.findByOfficeId(
        OFFICE.id,
        10,
        undefined,
        bystander,
      );
      const anonymous = await reviewRepository.findByOfficeId(OFFICE.id, 10);

      expect(asVoter[0]).toMatchObject({ helpfulCount: 1, isHelpful: true });
      expect(asBystander[0]).toMatchObject({ helpfulCount: 1, isHelpful: false });
      expect(anonymous[0]).toMatchObject({ helpfulCount: 1, isHelpful: null });
    });

    it("AC2·AC3·AC4(review-permalink-report-and-sort): sort=oldest면 가장 오래된 리뷰부터, 커서로 정확히 이어진다", async () => {
      const oldest = await insertUser("kakao-sort-oldest", "가장오래됨");
      const middle = await insertUser("kakao-sort-middle", "중간");
      const newest = await insertUser("kakao-sort-newest", "가장최신");
      await db.insert(reviews).values([
        {
          officeId: OFFICE.id,
          userId: oldest,
          rating: 5,
          content: CONTENT,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
        {
          officeId: OFFICE.id,
          userId: middle,
          rating: 4,
          content: CONTENT,
          createdAt: new Date("2026-08-10T00:00:00.000Z"),
        },
        {
          officeId: OFFICE.id,
          userId: newest,
          rating: 3,
          content: CONTENT,
          createdAt: new Date("2026-08-20T00:00:00.000Z"),
        },
      ]);

      // AC2: sort 생략(기본 latest)이면 기존과 동일하게 최신순 — 회귀 확인.
      const latestFirst = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      expect(latestFirst.map((r) => r.rating)).toEqual([3, 4, 5]);

      // AC3·AC4: sort=oldest면 가장 오래된 것부터, 커서로 하나씩 정확히 이어진다.
      const page1 = await reviewRepository.findByOfficeId(
        OFFICE.id,
        1,
        undefined,
        null,
        "oldest",
      );
      const page2 = await reviewRepository.findByOfficeId(
        OFFICE.id,
        1,
        { createdAt: page1[0]!.createdAt, id: page1[0]!.id },
        null,
        "oldest",
      );
      const page3 = await reviewRepository.findByOfficeId(
        OFFICE.id,
        1,
        { createdAt: page2[0]!.createdAt, id: page2[0]!.id },
        null,
        "oldest",
      );

      expect(page1[0]?.rating).toBe(5);
      expect(page2[0]?.rating).toBe(4);
      expect(page3[0]?.rating).toBe(3);
    });

    it("수정해도 기존에 쌓인 도움돼요 투표는 유지된다(update가 helpfulCount를 0으로 리셋하지 않는다)", async () => {
      const author = await insertUser("kakao-helpful-update-author", "글쓴이4");
      const voter = await insertUser("kakao-helpful-update-voter", "투표자4");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await reviewRepository.toggleHelpful(review.id, voter);

      const updated = await reviewRepository.update(review.id, {
        rating: 3,
        content: "수정된 충분히 긴 리뷰 본문입니다",
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      expect(updated.helpfulCount).toBe(1);
    });
  });

  describe("내 리뷰 목록 (my-reviews-list)", () => {
    it("AC3·AC4: 본인 리뷰만, 사무소 이름과 함께 반환한다", async () => {
      const otherOffice: TOfficeInsert = { ...OFFICE, id: "review-test-office-my" };
      await officeRepository.upsertMany([otherOffice]);
      const me = await insertUser("kakao-myreviews-me", "나");
      const other = await insertUser("kakao-myreviews-other", "다른사람");
      await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: me,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await reviewRepository.insert({
        officeId: otherOffice.id,
        userId: other,
        rating: 3,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const myReviews = await reviewRepository.findByUserId(me, 10);

      expect(myReviews).toHaveLength(1);
      expect(myReviews[0]?.officeName).toBe(OFFICE.name);
    });

    it("AC5: 신고 누적으로 숨겨진 내 리뷰도 목록에 포함된다(hiddenAt이 채워져 반환된다)", async () => {
      const me = await insertUser("kakao-myreviews-hidden", "숨김테스트");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: me,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await db
        .update(reviews)
        .set({ hiddenAt: new Date() })
        .where(eq(reviews.id, created.id));

      const myReviews = await reviewRepository.findByUserId(me, 10);

      expect(myReviews).toHaveLength(1);
      expect(myReviews[0]?.hiddenAt).not.toBeNull();
    });

    it("AC6: 리뷰가 없으면 빈 배열이다", async () => {
      const me = await insertUser("kakao-myreviews-empty", "빈사람");

      const myReviews = await reviewRepository.findByUserId(me, 10);

      expect(myReviews).toEqual([]);
    });

    it("AC7·AC8: 커서 페이지네이션 + 최신순 정렬", async () => {
      const me = await insertUser("kakao-myreviews-paged", "페이지테스트");
      await db.insert(reviews).values([
        {
          officeId: OFFICE.id,
          userId: me,
          rating: 5,
          content: CONTENT,
          createdAt: new Date("2026-08-01T00:00:00.000Z"),
        },
      ]);
      const otherOffice: TOfficeInsert = { ...OFFICE, id: "review-test-office-my2" };
      await officeRepository.upsertMany([otherOffice]);
      await db.insert(reviews).values([
        {
          officeId: otherOffice.id,
          userId: me,
          rating: 4,
          content: CONTENT,
          createdAt: new Date("2026-08-15T00:00:00.000Z"),
        },
      ]);

      const page1 = await reviewRepository.findByUserId(me, 1);
      const page2 = await reviewRepository.findByUserId(me, 1, {
        createdAt: page1[0]!.createdAt,
        id: page1[0]!.id,
      });

      expect(page1[0]?.officeId).toBe(otherOffice.id);
      expect(page2[0]?.officeId).toBe(OFFICE.id);
    });
  });

  describe("관리자 — 숨김 리뷰 목록 + 복구 (admin-hidden-reviews)", () => {
    it("AC5·AC6: 숨겨진 리뷰만, officeName·reportCount·hiddenAt과 함께 반환한다", async () => {
      const author = await insertUser("kakao-admin-hidden-author", "숨김대상글쓴이");
      const visibleAuthor = await insertUser("kakao-admin-visible-author", "노출중글쓴이");
      const reporters = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          insertUser(`kakao-admin-reporter-${i}`, `신고자${i}`),
        ),
      );
      const hidden = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      for (const reporterId of reporters) {
        await reviewRepository.insertReport(hidden.id, reporterId);
      }
      await reviewRepository.hideIfThresholdReached(hidden.id, 5);
      await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: visibleAuthor,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const hiddenRows = await reviewRepository.findHidden(10);

      expect(hiddenRows).toHaveLength(1);
      expect(hiddenRows[0]?.id).toBe(hidden.id);
      expect(hiddenRows[0]?.officeName).toBe(OFFICE.name);
      expect(hiddenRows[0]?.reportCount).toBe(5);
      expect(hiddenRows[0]?.hiddenAt).not.toBeNull();
    });

    it("AC7: 숨겨진 리뷰가 없으면 빈 배열이다", async () => {
      const author = await insertUser("kakao-admin-none", "아무도안숨김");
      await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const hiddenRows = await reviewRepository.findHidden(10);

      expect(hiddenRows).toEqual([]);
    });

    it("AC11·AC12: 복구하면 hidden_at이 null이 되고 공개 목록에 다시 나타난다", async () => {
      const author = await insertUser("kakao-admin-restore", "복구대상글쓴이");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 2,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await db
        .update(reviews)
        .set({ hiddenAt: new Date() })
        .where(eq(reviews.id, created.id));

      const restored = await reviewRepository.restore(created.id);

      expect(restored?.id).toBe(created.id);
      expect(restored?.nickname).toBe("복구대상글쓴이");
      const publicList = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      expect(publicList.some((row) => row.id === created.id)).toBe(true);
    });

    it("AC13: 복구해도 review_reports는 지워지지 않는다", async () => {
      const author = await insertUser("kakao-admin-keep-reports", "신고유지대상");
      const reporter = await insertUser("kakao-admin-keep-reporter", "신고유지자");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await reviewRepository.insertReport(created.id, reporter);
      await db
        .update(reviews)
        .set({ hiddenAt: new Date() })
        .where(eq(reviews.id, created.id));

      await reviewRepository.restore(created.id);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviewReports)
        .where(eq(reviewReports.reviewId, created.id));
      expect(count).toBe(1);
    });
  });

  describe("회원 탈퇴 + 리뷰 익명화 (member-account-deletion-and-anonymization)", () => {
    it("AC1: 작성자를 삭제해도 리뷰는 남고 user_id가 null이 된다", async () => {
      const author = await insertUser("kakao-deleted-1", "탈퇴예정1");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      await db.delete(users).where(eq(users.id, author));

      const [row] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, created.id));
      expect(row).toBeDefined();
      expect(row!.userId).toBeNull();
    });

    it("AC3: user_id가 null인 리뷰가 같은 사무소에 여러 건이어도 유니크 제약을 위반하지 않는다", async () => {
      const authorA = await insertUser("kakao-deleted-a", "탈퇴예정A");
      const authorB = await insertUser("kakao-deleted-b", "탈퇴예정B");
      const reviewA = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: authorA,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      const reviewB = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: authorB,
        rating: 3,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      await db.delete(users).where(eq(users.id, authorA));
      await db.delete(users).where(eq(users.id, authorB));

      const rows = await db
        .select()
        .from(reviews)
        .where(eq(reviews.officeId, OFFICE.id));
      const ids = new Set([reviewA.id, reviewB.id]);
      const anonymized = rows.filter((row) => ids.has(row.id));
      expect(anonymized).toHaveLength(2);
      expect(anonymized.every((row) => row.userId === null)).toBe(true);
    });

    it("AC7: 작성자가 탈퇴해도 공개 목록(findByOfficeId)에서 사라지지 않는다", async () => {
      const author = await insertUser("kakao-deleted-list", "탈퇴예정목록");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 4,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      await db.delete(users).where(eq(users.id, author));

      const list = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      const found = list.find((row) => row.id === created.id);
      expect(found).toBeDefined();
      expect(found?.nickname).toBeNull();
      expect(found?.profileImageUrl).toBeNull();
    });

    it("AC10: 도움돼요를 누른 사용자가 탈퇴하면 투표가 함께 삭제되고 helpfulCount가 감소한다", async () => {
      const author = await insertUser("kakao-helpful-deleted-author", "글쓴이3");
      const voter = await insertUser("kakao-helpful-deleted-voter", "탈퇴할투표자");
      const review = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });
      await reviewRepository.toggleHelpful(review.id, voter);

      await db.delete(users).where(eq(users.id, voter));

      const list = await reviewRepository.findByOfficeId(OFFICE.id, 10);
      const found = list.find((row) => row.id === review.id);
      expect(found?.helpfulCount).toBe(0);
    });

    it("AC11: 신고자 전원이 탈퇴해 신고 기록이 사라져도 이미 숨겨진 리뷰는 계속 숨김 상태다", async () => {
      const author = await insertUser("kakao-hide-persist-author", "글쓴이4");
      const created = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: author,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        expertise: null,
        defectResponse: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
        photoKeys: [],
      });

      const reporterIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const reporterId = await insertUser(
          `kakao-hide-persist-reporter-${i}`,
          `신고자${i}`,
        );
        reporterIds.push(reporterId);
        await reviewRepository.insertReport(created.id, reporterId);
      }
      await reviewRepository.hideIfThresholdReached(created.id, 5);

      const [beforeRow] = await db
        .select({ hiddenAt: reviews.hiddenAt })
        .from(reviews)
        .where(eq(reviews.id, created.id));
      expect(beforeRow!.hiddenAt).not.toBeNull();

      for (const reporterId of reporterIds) {
        await db.delete(users).where(eq(users.id, reporterId));
      }

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviewReports)
        .where(eq(reviewReports.reviewId, created.id));
      expect(count).toBe(0);

      const [afterRow] = await db
        .select({ hiddenAt: reviews.hiddenAt })
        .from(reviews)
        .where(eq(reviews.id, created.id));
      expect(afterRow!.hiddenAt).not.toBeNull();
    });
  });
});
