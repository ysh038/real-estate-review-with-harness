import { officesByBboxResponseSchema, type TOfficeSummary } from "@repo/types";
import { describe, expect, it } from "vitest";

import { createApp } from "../../app";
import { createFakeOfficeRepository } from "../helpers/fakeOfficeRepository";

const OFFICE: TOfficeSummary = {
  id: "41135-2020-00001",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
};

const buildApp = (rows: TOfficeSummary[] = [OFFICE]) => {
  const officeRepository = createFakeOfficeRepository(rows);
  return { app: createApp({ officeRepository }), officeRepository };
};

const VALID_BBOX = "127.0,37.3,127.2,37.5";

describe("GET /api/offices", () => {
  it("AC6: 유효한 bbox 면 200과 계약 스키마에 맞는 본문을 반환한다", async () => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices?bbox=${VALID_BBOX}`);

    expect(res.status).toBe(200);
    const parsed = officesByBboxResponseSchema.safeParse(await res.json());
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.offices[0]?.id).toBe(OFFICE.id);
  });

  it("AC6: bbox 를 minLng,minLat,maxLng,maxLat 순서로 해석한다", async () => {
    const { app, officeRepository } = buildApp();

    await app.request(`/api/offices?bbox=${VALID_BBOX}`);

    expect(officeRepository.findByBbox).toHaveBeenCalledWith(
      { minLng: 127.0, minLat: 37.3, maxLng: 127.2, maxLat: 37.5 },
      expect.any(Number),
    );
  });

  it("AC7: bbox 가 없으면 400", async () => {
    const { app } = buildApp();

    const res = await app.request("/api/offices");

    expect(res.status).toBe(400);
  });

  it.each([
    ["값이 3개", "127.0,37.3,127.2"],
    ["값이 5개", "127.0,37.3,127.2,37.5,1"],
    ["숫자가 아님", "127.0,37.3,127.2,동쪽"],
    ["빈 문자열", ""],
  ])("AC8: bbox 형식이 잘못되면 400 (%s)", async (_label, bbox) => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices?bbox=${encodeURIComponent(bbox)}`);

    expect(res.status).toBe(400);
  });

  it.each([
    ["경도가 뒤집힘", "127.2,37.3,127.0,37.5"],
    ["위도가 뒤집힘", "127.0,37.5,127.2,37.3"],
  ])("AC9: 뒤집힌 bbox 면 400 (%s)", async (_label, bbox) => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices?bbox=${bbox}`);

    expect(res.status).toBe(400);
  });

  it.each([
    ["위도 초과", "127.0,37.3,127.2,91"],
    ["위도 미만", "127.0,-91,127.2,37.5"],
    ["경도 초과", "127.0,37.3,181,37.5"],
    ["경도 미만", "-181,37.3,127.2,37.5"],
  ])("AC10: 좌표 범위를 벗어나면 400 (%s)", async (_label, bbox) => {
    const { app } = buildApp();

    const res = await app.request(`/api/offices?bbox=${bbox}`);

    expect(res.status).toBe(400);
  });

  it("잘못된 bbox 면 repository 를 호출하지 않는다", async () => {
    const { app, officeRepository } = buildApp();

    await app.request("/api/offices?bbox=nope");

    expect(officeRepository.findByBbox).not.toHaveBeenCalled();
  });
});
