import { officeSearchResponseSchema } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import type { TOfficeSummaryRow } from "../../services/officeService";
import { createFakeAuthAppDeps } from "../helpers/fakeAuthDeps";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";
import { createFakeReviewRepository } from "../helpers/fakeReviewRepository";

const OFFICE: TOfficeSummaryRow = {
  id: "41135-2020-00001",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
};

const buildApp = (rows: TOfficeSummaryRow[] = [OFFICE]) => {
  const officeRepository = createFakeOfficeRepository(rows);
  return {
    app: createApp({
      officeRepository,
      reviewRepository: createFakeReviewRepository(),
      ...createFakeAuthAppDeps(),
    }),
    officeRepository,
  };
};

describe("GET /api/offices/search", () => {
  it("AC3: q가 없으면 400", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/offices/search");

    expect(res.status).toBe(400);
  });

  it("AC3: q가 빈 문자열이면 400", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/offices/search?q=");

    expect(res.status).toBe(400);
  });

  it("200과 계약 스키마에 맞는 본문을 반환하고, tagCounts는 항상 빈 배열이다", async () => {
    const { app } = buildApp([OFFICE]);

    const res = await app.request("/api/offices/search?q=분당");

    expect(res.status).toBe(200);
    const body = officeSearchResponseSchema.parse(await res.json());
    expect(body.offices[0]?.id).toBe(OFFICE.id);
    expect(body.offices[0]?.tagCounts).toEqual([]);
  });

  it("q와 상한을 repository.searchByQuery에 그대로 전달한다", async () => {
    const { app, officeRepository } = buildApp();

    await app.request("/api/offices/search?q=분당");

    expect(officeRepository.searchByQuery).toHaveBeenCalledWith("분당", 8);
  });

  it("매칭이 없으면 빈 배열을 반환한다(에러 아님)", async () => {
    const { app } = buildApp([]);

    const res = await app.request("/api/offices/search?q=없는사무소");

    expect(res.status).toBe(200);
    const body = officeSearchResponseSchema.parse(await res.json());
    expect(body.offices).toEqual([]);
  });

  it("'search'라는 id를 가진 사무소로 오인되지 않는다(라우트 등록 순서 회귀 확인)", async () => {
    const { app, officeRepository } = buildApp();

    const res = await app.request("/api/offices/search?q=분당");

    expect(res.status).toBe(200);
    expect(officeRepository.findById).not.toHaveBeenCalled();
  });
});
