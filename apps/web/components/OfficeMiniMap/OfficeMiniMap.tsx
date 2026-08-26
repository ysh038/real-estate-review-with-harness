"use client";

import Script from "next/script";
import { useRef, useState } from "react";

import styles from "./OfficeMiniMap.module.css";
import { buildKakaoMapScriptUrl } from "../../lib/kakaoMapSdk";

const MINIMAP_LEVEL = 4;

type TSdkStatus = "loading" | "loaded" | "error";

export interface IOfficeMiniMapProps {
  lat: number;
  lng: number;
  name: string;
}

/**
 * `/offices/[id]` 전용 경량 지도 — 마커 1개만 찍는다. `KakaoMap`과 달리 bbox 조회·
 * 클러스터링·마커 클릭 선택 로직이 전혀 없다(office-detail-route-and-deeplink AC10·AC11).
 */
export const OfficeMiniMap = ({ lat, lng, name }: IOfficeMiniMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<TSdkStatus>("loading");
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

  const handleLoad = () => {
    window.kakao.maps.load(() => {
      if (!containerRef.current) return;

      const center = new window.kakao.maps.LatLng(lat, lng);
      const map = new window.kakao.maps.Map(containerRef.current, {
        center,
        level: MINIMAP_LEVEL,
      });
      const marker = new window.kakao.maps.Marker({ position: center, title: name });
      marker.setMap(map);
      setStatus("loaded");
    });
  };

  return (
    <div className={styles.wrapper}>
      <Script
        src={buildKakaoMapScriptUrl(appKey)}
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={() => setStatus("error")}
      />
      {status === "error" ? (
        <p className={styles.statusError}>지도를 불러오지 못했습니다.</p>
      ) : null}
      <div ref={containerRef} className={styles.mapContainer} />
    </div>
  );
};
