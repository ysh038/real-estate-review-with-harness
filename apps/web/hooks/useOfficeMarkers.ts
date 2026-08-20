"use client";

import type { TOfficeSummary } from "@repo/types";
import { useEffect, useRef, useState } from "react";

import { toBboxQuery } from "../lib/kakaoBounds";
import { addMapListener, removeMapListener } from "../lib/kakaoMapEvents";
import { createMarkerClusterer, createOfficeMarker } from "../lib/kakaoMarkers";
import { fetchOfficesByBbox } from "../lib/officesApi";

const DEBOUNCE_MS = 300;
const BOUNDS_CHANGED_EVENT = "bounds_changed";

export interface IUseOfficeMarkersResult {
  offices: TOfficeSummary[];
  isTruncated: boolean;
}

/**
 * 지도의 현재 bbox를 기준으로 오피스를 조회해 상태로 노출하고, 지도 위 마커를 동기화한다.
 * 지도 이동(bounds_changed)은 300ms debounce로 묶는다 — 명세: office-marker-bbox-sync.
 */
export const useOfficeMarkers = (
  map: kakao.maps.Map | null,
): IUseOfficeMarkersResult => {
  const [offices, setOffices] = useState<TOfficeSummary[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);

  useEffect(() => {
    if (!map) return undefined;

    let isCancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const syncOffices = async () => {
      const bbox = toBboxQuery(map.getBounds());
      try {
        const response = await fetchOfficesByBbox(bbox);
        if (isCancelled) return;
        setOffices(response.offices);
        setIsTruncated(response.isTruncated);
      } catch (error) {
        // AC3: 실패해도 직전 목록을 유지한다 — 상태를 건드리지 않고 로그만 남긴다.
        console.error("[useOfficeMarkers] bbox 오피스 조회 실패", error);
      }
    };

    const handleBoundsChanged = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void syncOffices();
      }, DEBOUNCE_MS);
    };

    void syncOffices(); // AC6: 초기 화면 bbox 기준으로 별도 이동 없이 조회한다
    addMapListener(map, BOUNDS_CHANGED_EVENT, handleBoundsChanged);

    return () => {
      isCancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      removeMapListener(map, BOUNDS_CHANGED_EVENT, handleBoundsChanged);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return undefined;

    // 클러스터러는 map당 1번만 만든다 — 오피스가 바뀔 때마다 재생성하면 클러스터 상태가 끊긴다.
    clustererRef.current = createMarkerClusterer(map);

    return () => {
      clustererRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer) return undefined;

    const markers = offices.map((office) => createOfficeMarker(office));
    clusterer.addMarkers(markers);

    return () => {
      clusterer.removeMarkers(markers);
    };
  }, [offices]);

  return { offices, isTruncated };
};
