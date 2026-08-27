import { afterEach, describe, expect, it, vi } from "vitest";

import { createKakaoGeocoder } from "../../lib/kakaoGeocoder";

const REST_API_KEY = "fake-rest-api-key";

const buildDoc = (addressName: string, x = "127.1", y = "37.4") => ({
  x,
  y,
  address_name: addressName,
  road_address_name: addressName,
});

const mockKakaoResponse = (documents: ReturnType<typeof buildDoc>[]) => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ documents }),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("kakaoGeocoder.geocodeOffice — 매칭 신뢰도 (geocoding-match-confidence)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("AC2: 0번째(첫) 후보가 매칭되면 matchConfidence는 1이다", async () => {
    mockKakaoResponse([buildDoc("경기 성남시 분당구 판교로 1")]);
    const geocoder = createKakaoGeocoder(REST_API_KEY);

    const result = await geocoder.geocodeOffice({
      name: "테스트공인중개사",
      legalDong: "경기도 성남시 분당구",
    });

    expect(result).toEqual({ lat: 37.4, lng: 127.1, matchConfidence: 1 });
  });

  it("AC2: 2번째(index 1) 후보가 매칭되면 matchConfidence는 0.5다", async () => {
    mockKakaoResponse([
      buildDoc("경기 수원시 팔달구 다른동"), // legalDong 불일치 — 스킵
      buildDoc("경기 성남시 분당구 판교로 1"), // 매칭
    ]);
    const geocoder = createKakaoGeocoder(REST_API_KEY);

    const result = await geocoder.geocodeOffice({
      name: "테스트공인중개사",
      legalDong: "경기도 성남시 분당구",
    });

    expect(result?.matchConfidence).toBe(0.5);
  });

  it("AC2: 3번째(index 2) 후보가 매칭되면 matchConfidence는 1/3이다", async () => {
    mockKakaoResponse([
      buildDoc("경기 수원시 팔달구 다른동"),
      buildDoc("경기 용인시 기흥구 또다른동"),
      buildDoc("경기 성남시 분당구 판교로 1"),
    ]);
    const geocoder = createKakaoGeocoder(REST_API_KEY);

    const result = await geocoder.geocodeOffice({
      name: "테스트공인중개사",
      legalDong: "경기도 성남시 분당구",
    });

    expect(result?.matchConfidence).toBeCloseTo(1 / 3);
  });

  it("AC3: 매칭되는 후보가 없으면 null을 반환한다(신뢰도 없음과 낮은 신뢰도는 다르다)", async () => {
    mockKakaoResponse([buildDoc("경기 수원시 팔달구 다른동")]);
    const geocoder = createKakaoGeocoder(REST_API_KEY);

    const result = await geocoder.geocodeOffice({
      name: "테스트공인중개사",
      legalDong: "경기도 성남시 분당구",
    });

    expect(result).toBeNull();
  });
});
