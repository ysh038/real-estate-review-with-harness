import type { TBbox } from "@repo/types";

export interface ILatLngPoint {
  getLat(): number;
  getLng(): number;
}

export interface IBoundsLike {
  getSouthWest(): ILatLngPoint;
  getNorthEast(): ILatLngPoint;
}

/** 카카오 LatLngBounds(남서/북동 좌표)를 bbox 조회 API용 쿼리 객체로 바꾼다. */
export const toBboxQuery = (bounds: IBoundsLike): TBbox => {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return {
    minLng: southWest.getLng(),
    minLat: southWest.getLat(),
    maxLng: northEast.getLng(),
    maxLat: northEast.getLat(),
  };
};
