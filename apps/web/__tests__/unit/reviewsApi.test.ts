import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createReview,
  fetchMyReviews,
  fetchOfficeDetail,
  fetchReviews,
  reportReview,
  toggleReviewHelpful,
  uploadPhoto,
} from "../../lib/reviewsApi";

const BASE_URL = "http://localhost:8788";

describe("reviewsApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetchOfficeDetail: GET /api/offices/:id 를 호출하고 계약 스키마로 파싱한다", async () => {
    const body = {
      id: "office-1",
      name: "분당공인중개사사무소",
      ownerName: "홍길동",
      address: "경기도 성남시 분당구 판교로 1",
      phone: "031-000-0000",
      sigungu: "성남시",
      lat: 37.4,
      lng: 127.1,
      matchConfidence: null,
      avgRating: 4.3,
      reviewCount: 12,
      tagCounts: [],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOfficeDetail("office-1", BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1`,
    );
    expect(result).toEqual(body);
  });

  it("fetchReviews: 커서·limit 없이 호출하면 쿼리 없이 요청한다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchReviews("office-1", {}, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1/reviews`,
    );
  });

  it("fetchReviews: 커서가 있으면 쿼리스트링에 실어 보낸다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchReviews("office-1", { cursor: "abc" }, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1/reviews?cursor=abc`,
    );
  });

  it("fetchReviews: sort를 넘기면 쿼리스트링에 실어 보낸다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchReviews("office-1", { sort: "oldest" }, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1/reviews?sort=oldest`,
    );
  });

  it("fetchReviews: cursor·sort를 함께 넘기면 둘 다 쿼리스트링에 실린다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchReviews("office-1", { cursor: "abc", sort: "oldest" }, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1/reviews?cursor=abc&sort=oldest`,
    );
  });

  it("reportReview: POST /api/reviews/:id/report 를 credentials 포함해 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);

    await reportReview("review-1", BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/reviews/review-1/report`,
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("reportReview: 실패 응답이면 status를 포함한 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: "이미 신고했습니다" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(reportReview("review-1", BASE_URL)).rejects.toMatchObject({
      status: 409,
      message: "이미 신고했습니다",
    });
  });

  it("fetchOfficeDetail: 실패 응답이면 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOfficeDetail("no-such", BASE_URL)).rejects.toThrow();
  });

  it("uploadPhoto: POST /api/uploads를 multipart로 credentials 포함해 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ storageKey: "uploads/abc.jpg" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const result = await uploadPhoto(file, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/uploads`,
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    const [, options] = fetchMock.mock.calls[0] as [string, { body: FormData }];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("file")).toBe(file);
    expect(result).toEqual({ storageKey: "uploads/abc.jpg" });
  });

  it("uploadPhoto: 실패 응답이면 status를 포함한 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: () => Promise.resolve({ message: "파일 용량이 너무 큽니다" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await expect(uploadPhoto(file, BASE_URL)).rejects.toMatchObject({ status: 413 });
  });

  it("createReview: POST /api/offices/:id/reviews 를 credentials 포함해 호출한다", async () => {
    const body = {
      id: "00000000-0000-4000-8000-000000000001",
      officeId: "office-1",
      rating: 5,
      content: "충분히 긴 리뷰 본문입니다 열 자 이상",
      author: { nickname: "홍길동", profileImageUrl: null },
      createdAt: "2026-08-21T00:00:00.000Z",
      dealType: null,
      dealResult: null,
      visitedYear: null,
      visitedMonth: null,
      tags: [],
      photos: [],
      helpfulCount: 0,
      isHelpful: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createReview(
      "office-1",
      { rating: 5, content: "충분히 긴 리뷰 본문입니다 열 자 이상" },
      BASE_URL,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/offices/office-1/reviews`,
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: 5,
          content: "충분히 긴 리뷰 본문입니다 열 자 이상",
        }),
      }),
    );
    expect(result).toEqual(body);
  });

  it("createReview: 실패 응답이면 status를 포함한 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: "이미 작성했습니다" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createReview("office-1", { rating: 5, content: "x".repeat(10) }, BASE_URL),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("toggleReviewHelpful: POST /api/reviews/:id/helpful 를 credentials 포함해 호출한다", async () => {
    const body = { helpfulCount: 1, isHelpful: true };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await toggleReviewHelpful(
      "00000000-0000-4000-8000-000000000001",
      BASE_URL,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/reviews/00000000-0000-4000-8000-000000000001/helpful`,
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(result).toEqual(body);
  });

  it("toggleReviewHelpful: 실패 응답이면 status를 포함한 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "인증이 필요합니다" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      toggleReviewHelpful("00000000-0000-4000-8000-000000000001", BASE_URL),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("fetchMyReviews: GET /api/me/reviews 를 credentials 포함해 호출한다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchMyReviews({}, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/me/reviews`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("fetchMyReviews: 커서가 있으면 쿼리스트링에 실어 보낸다", async () => {
    const body = { reviews: [], nextCursor: null };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchMyReviews({ cursor: "abc" }, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/me/reviews?cursor=abc`,
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("fetchMyReviews: 실패 응답이면 status를 포함한 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ message: "인증이 필요합니다" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchMyReviews({}, BASE_URL)).rejects.toMatchObject({
      status: 401,
    });
  });
});
