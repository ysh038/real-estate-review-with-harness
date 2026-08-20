import type { TOfficeSummary } from "@repo/types";

import { addMapListener } from "./kakaoMapEvents";

/** 클러스터러가 지도 부착을 전담한다 — 마커 자체는 map을 받지 않는다 (marker-clustering 명세). */
export const createOfficeMarker = (
  office: TOfficeSummary,
  onClick: (office: TOfficeSummary) => void,
): kakao.maps.Marker => {
  const marker = new window.kakao.maps.Marker({
    position: new window.kakao.maps.LatLng(office.lat, office.lng),
    title: office.name,
  });
  // 마커는 클러스터러가 지도에서 떼면 함께 사라지므로 리스너를 따로 해제하지 않는다.
  addMapListener(marker, "click", () => onClick(office));
  return marker;
};

/** 카카오 예제가 흔히 쓰는 minLevel(6)에서 시작 — 실제 밀도로 브라우저 확인 후 조정. */
const CLUSTER_MIN_LEVEL = 6;

export const createMarkerClusterer = (
  map: kakao.maps.Map,
): kakao.maps.MarkerClusterer =>
  new window.kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    minLevel: CLUSTER_MIN_LEVEL,
  });
