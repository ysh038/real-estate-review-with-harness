"use client";

import type { TOfficeSummary } from "@repo/types";
import { useCallback, useEffect, useRef, useState } from "react";

import { toBboxQuery } from "../lib/kakaoBounds";
import { addMapListener, removeMapListener } from "../lib/kakaoMapEvents";
import { createMarkerClusterer, createOfficeMarker } from "../lib/kakaoMarkers";
import { fetchOfficesByBbox } from "../lib/officesApi";

const DEBOUNCE_MS = 300;
const BOUNDS_CHANGED_EVENT = "bounds_changed";

export interface IUseOfficeMarkersResult {
  offices: TOfficeSummary[];
  isTruncated: boolean;
  selectedOffice: TOfficeSummary | null;
  clearSelection: () => void;
  /** 마커 클릭(토글)과 달리 항상 그 사무소를 연다 — 검색 결과 선택용(office-search-bar). */
  selectOffice: (office: TOfficeSummary) => void;
}

/**
 * 지도의 현재 bbox를 기준으로 오피스를 조회해 상태로 노출하고, 지도 위 마커를 동기화한다.
 * 지도 이동(bounds_changed)은 300ms debounce로 묶는다 — 명세: office-marker-bbox-sync.
 *
 * `initialSelectedOffice`는 `/?office=<id>` 딥링크로 들어왔을 때 마커 클릭 없이 패널을 바로
 * 열기 위한 값이다(office-detail-route-and-deeplink AC16·AC18).
 */
export const useOfficeMarkers = (
  map: kakao.maps.Map | null,
  initialSelectedOffice: TOfficeSummary | null = null,
): IUseOfficeMarkersResult => {
  const [offices, setOffices] = useState<TOfficeSummary[]>([]);
  const [isTruncated, setIsTruncated] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<TOfficeSummary | null>(
    initialSelectedOffice,
  );
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  // AC19: 최초 bbox 응답이 오기 전에는 딥링크로 미리 넣어둔 선택을 정리하지 않는다 —
  // 그 시점의 offices는 아직 빈 배열이라 "화면 밖" 판정과 구분이 안 되기 때문이다.
  const hasLoadedOnceRef = useRef(false);

  const clearSelection = useCallback(() => setSelectedOffice(null), []);
  const selectOffice = useCallback(
    (office: TOfficeSummary) => setSelectedOffice(office),
    [],
  );

  /** 같은 사무소를 다시 누르면 닫는다 (토글) — office-detail-panel AC3 */
  const handleMarkerClick = useCallback((office: TOfficeSummary) => {
    setSelectedOffice((current) =>
      current?.id === office.id ? null : office,
    );
  }, []);

  useEffect(() => {
    if (!map) return undefined;

    let isCancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const syncOffices = async () => {
      const bbox = toBboxQuery(map.getBounds());
      try {
        const response = await fetchOfficesByBbox(bbox);
        if (isCancelled) return;
        hasLoadedOnceRef.current = true;
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

    const markers = offices.map((office) =>
      createOfficeMarker(office, handleMarkerClick),
    );
    clusterer.addMarkers(markers);

    return () => {
      clusterer.removeMarkers(markers);
    };
  }, [offices, handleMarkerClick]);

  // AC5: 목록이 갱신돼 선택된 사무소가 화면 밖으로 나가면 패널을 남겨두지 않는다.
  // AC19: 단, 최초 bbox 응답이 오기 전(hasLoadedOnceRef=false)에는 정리하지 않는다 —
  // 이 시점의 offices=[]는 "화면 밖"이 아니라 "아직 모른다"이기 때문이다.
  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    setSelectedOffice((current) => {
      if (!current) return current;
      return offices.some((office) => office.id === current.id)
        ? current
        : null;
    });
  }, [offices]);

  return { offices, isTruncated, selectedOffice, clearSelection, selectOffice };
};
