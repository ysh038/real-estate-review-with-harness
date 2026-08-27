import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchOfficesByBbox, searchOffices } from "../../lib/officesApi";

const BBOX = { minLng: 127.1, minLat: 37.4, maxLng: 127.2, maxLat: 37.5 };

describe("fetchOfficesByBbox", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC2: bbox를 쿼리스트링으로 조립해 요청하고, 응답을 그대로 노출한다", async () => {
    const responseBody = {
      offices: [
        {
          id: "office-1",
          name: "테스트 공인중개사",
          ownerName: "홍길동",
          address: "성남시 분당구",
          phone: null,
          sigungu: "성남시",
          lat: 37.45,
          lng: 127.15,
          matchConfidence: null,
          tagCounts: [],
        },
      ],
      isTruncated: false,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseBody),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchOfficesByBbox(BBOX, "http://localhost:8788");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/api/offices?bbox=127.1%2C37.4%2C127.2%2C37.5",
    );
    expect(result).toEqual(responseBody);
  });

  it("AC3용: 응답이 실패(non-2xx)면 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOfficesByBbox(BBOX, "http://localhost:8788")).rejects.toThrow();
  });

  it("AC3용: 응답 본문이 계약(zod 스키마)에 맞지 않으면 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ offices: "not-an-array" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOfficesByBbox(BBOX, "http://localhost:8788")).rejects.toThrow();
  });
});

describe("searchOffices", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("q를 쿼리스트링으로 실어 요청하고, 응답을 그대로 노출한다", async () => {
    const responseBody = {
      offices: [
        {
          id: "office-1",
          name: "분당공인중개사",
          ownerName: "홍길동",
          address: "성남시 분당구",
          phone: null,
          sigungu: "성남시",
          lat: 37.45,
          lng: 127.15,
          matchConfidence: null,
          tagCounts: [],
        },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseBody),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchOffices("분당", "http://localhost:8788");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8788/api/offices/search?q=%EB%B6%84%EB%8B%B9",
    );
    expect(result).toEqual(responseBody);
  });

  it("응답이 실패(non-2xx)면 예외를 던진다", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchOffices("분당", "http://localhost:8788")).rejects.toThrow();
  });
});
