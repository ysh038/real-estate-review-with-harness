import { eq } from "drizzle-orm";
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
      visitedYear: 2026,
      visitedMonth: 3,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
    });
    await reviewRepository.insert({
      officeId: OFFICE.id,
      userId: second,
      rating: 4,
      content: CONTENT,
      createdFromIp: null,
      dealType: null,
      dealResult: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
      visitedYear: null,
      visitedMonth: null,
      tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함", "응답 빠름"],
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
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함", "강매 없음"],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 4,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
      });

      const updated = await reviewRepository.update(created.id, {
        rating: 5,
        content: CONTENT,
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["설명 꼼꼼", "허위매물 없음"],
      });

      expect(updated.tags.sort()).toEqual(["설명 꼼꼼", "허위매물 없음"]);
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
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
      });
      const hidden = await reviewRepository.insert({
        officeId: OFFICE.id,
        userId: hiddenAuthor,
        rating: 1,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
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
        visitedYear: null,
        visitedMonth: null,
        tags: ["친절함"],
      });
      await reviewRepository.insert({
        officeId: otherOffice.id,
        userId: userB,
        rating: 5,
        content: CONTENT,
        createdFromIp: null,
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
        tags: ["응답 빠름"],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
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
        visitedYear: null,
        visitedMonth: null,
        tags: [],
      });
      await reviewRepository.toggleHelpful(review.id, voter);

      const updated = await reviewRepository.update(review.id, {
        rating: 3,
        content: "수정된 충분히 긴 리뷰 본문입니다",
        dealType: null,
        dealResult: null,
        visitedYear: null,
        visitedMonth: null,
        tags: [],
      });

      expect(updated.helpfulCount).toBe(1);
    });
  });
});
