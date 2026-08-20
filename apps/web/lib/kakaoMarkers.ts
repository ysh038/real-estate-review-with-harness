import type { TOfficeSummary } from "@repo/types";

/** window.kakao.maps.Marker 를 얇게 감싼다 — 훅 테스트에서 실제 SDK 없이 모킹하기 위함. */
export const createOfficeMarker = (
  map: kakao.maps.Map,
  office: TOfficeSummary,
): kakao.maps.Marker =>
  new window.kakao.maps.Marker({
    position: new window.kakao.maps.LatLng(office.lat, office.lng),
    map,
    title: office.name,
  });

export const removeMarker = (marker: kakao.maps.Marker): void => {
  marker.setMap(null);
};
