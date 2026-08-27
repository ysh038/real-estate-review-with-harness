import type { TOfficeDetailResponse } from "@repo/types";
import { describe, expect, it } from "vitest";

import { buildOfficeMetadata } from "../../lib/officeMetadata";

const OFFICE: TOfficeDetailResponse = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  matchConfidence: null,
  tagCounts: [],
  avgRating: 4.5,
  reviewCount: 3,
};

describe("buildOfficeMetadata", () => {
  it("AC1: title에 사무소명이 포함된다", () => {
    expect(buildOfficeMetadata(OFFICE).title).toContain("분당공인중개사사무소");
  });

  it("AC2: description에 주소가 포함된다", () => {
    expect(buildOfficeMetadata(OFFICE).description).toContain(
      "경기도 성남시 분당구 판교로 1",
    );
  });

  it("AC3: 리뷰가 1개 이상이면 description에 리뷰 수가 포함된다", () => {
    expect(buildOfficeMetadata(OFFICE).description).toContain("리뷰 3개");
  });

  it("AC4: 리뷰가 0개면 '0개' 대신 안내 문구가 들어간다", () => {
    const description = buildOfficeMetadata({
      ...OFFICE,
      reviewCount: 0,
    }).description;

    expect(description).not.toContain("0개");
    expect(description).toContain("아직 리뷰가 없습니다");
  });
});
