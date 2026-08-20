import { describe, expect, it } from "vitest";

import { toBboxQuery } from "../../lib/kakaoBounds";

describe("toBboxQuery", () => {
  it("AC1: LatLngBounds의 남서/북동 좌표를 minLng/minLat/maxLng/maxLat 로 변환한다", () => {
    const bounds = {
      getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 127.1 }),
      getNorthEast: () => ({ getLat: () => 37.5, getLng: () => 127.2 }),
    };

    expect(toBboxQuery(bounds)).toEqual({
      minLng: 127.1,
      minLat: 37.4,
      maxLng: 127.2,
      maxLat: 37.5,
    });
  });
});
