import type { TOfficeDetailResponse } from "@repo/types";
import { describe, expect, it, vi } from "vitest";

const { fetchOfficeDetail } = vi.hoisted(() => ({
  fetchOfficeDetail: vi.fn(),
}));
vi.mock("../../lib/reviewsApi", () => ({ fetchOfficeDetail }));

const { resolveInitialOffice } = await import("../../lib/resolveInitialOffice");

const OFFICE: TOfficeDetailResponse = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  tagCounts: [],
  avgRating: null,
  reviewCount: 0,
};

describe("resolveInitialOffice", () => {
  it("officeId가 없으면 null을 반환한다", async () => {
    expect(await resolveInitialOffice(undefined)).toBeNull();
    expect(fetchOfficeDetail).not.toHaveBeenCalled();
  });

  it("존재하는 officeId면 사무소 상세를 반환한다", async () => {
    fetchOfficeDetail.mockResolvedValueOnce(OFFICE);

    expect(await resolveInitialOffice("office-1")).toEqual(OFFICE);
  });

  it("AC17: 존재하지 않거나 잘못된 id로 조회가 실패하면 에러를 던지지 않고 null을 반환한다", async () => {
    fetchOfficeDetail.mockRejectedValueOnce(new Error("404"));

    await expect(resolveInitialOffice("no-such-id")).resolves.toBeNull();
  });
});
