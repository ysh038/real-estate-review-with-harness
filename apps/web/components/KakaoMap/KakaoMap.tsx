"use client";

import type { TOfficeDetailResponse } from "@repo/types";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import styles from "./KakaoMap.module.css";
import { useOfficeMarkers } from "../../hooks/useOfficeMarkers";
import { addMapListener, removeMapListener } from "../../lib/kakaoMapEvents";
import { buildKakaoMapScriptUrl } from "../../lib/kakaoMapSdk";
import { OfficeDetailPanel } from "../OfficeDetailPanel";

const SEONGNAM_CITY_HALL = { lat: 37.4201, lng: 127.1265 };
const DEFAULT_LEVEL = 8;
// office-detail-route-and-deeplink AC15: 딥링크로 들어오면 사무소 단위로 확대해 보여준다.
const DEEPLINK_LEVEL = 3;

type TSdkStatus = "loading" | "loaded" | "error";

export interface IKakaoMapProps {
  /** `/?office=<id>` 딥링크로 들어왔을 때 초기 중심·선택으로 쓸 사무소 (없으면 기본 화면). */
  initialOffice?: TOfficeDetailResponse | null;
}

/**
 * SDK 로드 + 빈 지도 렌더링까지만 담당한다. 마커·bbox 연동은 다음 명세.
 * next/script 의 afterInteractive 전략이 스크립트 중복 삽입을 막아준다.
 */
export const KakaoMap = ({ initialOffice = null }: IKakaoMapProps = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const [status, setStatus] = useState<TSdkStatus>("loading");
  const appKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  const map = status === "loaded" ? mapRef.current : null;
  const { isTruncated, selectedOffice, clearSelection } = useOfficeMarkers(
    map,
    initialOffice,
  );

  // AC15: 백드롭 대신 지도 클릭으로 닫는다 — 패널이 열려 있어도 지도 조작이 살아 있어야
  // 하기 때문이다 (근거: docs/specs/office-detail-panel.md 설계 메모).
  useEffect(() => {
    if (!map) return undefined;

    addMapListener(map, "click", clearSelection);
    return () => removeMapListener(map, "click", clearSelection);
  }, [map, clearSelection]);

  const handleLoad = () => {
    window.kakao.maps.load(() => {
      if (!containerRef.current) return;

      const center = initialOffice
        ? { lat: initialOffice.lat, lng: initialOffice.lng }
        : SEONGNAM_CITY_HALL;
      const level = initialOffice ? DEEPLINK_LEVEL : DEFAULT_LEVEL;

      mapRef.current = new window.kakao.maps.Map(containerRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level,
      });
      setStatus("loaded");
    });
  };

  useEffect(() => {
    if (!containerRef.current) return undefined;

    // CSS 모듈 청크는 스크립트와 별도로 비동기 로드된다 — 지도 생성 시점에
    // 컨테이너가 아직 최종 크기(100vw/100vh)가 아니었을 수 있다. 카카오 SDK는
    // 컨테이너 크기 변화를 스스로 감지하지 못해 relayout()을 직접 불러야 한다.
    const observer = new ResizeObserver(() => {
      mapRef.current?.relayout();
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.wrapper}>
      <Script
        src={buildKakaoMapScriptUrl(appKey)}
        strategy="afterInteractive"
        onLoad={handleLoad}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? (
        <p className={styles.status}>지도를 불러오는 중입니다…</p>
      ) : null}
      {status === "error" ? (
        <p className={styles.statusError}>
          지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      ) : null}
      {isTruncated ? (
        <p className={styles.truncatedNotice}>
          결과가 많아 일부만 표시됩니다. 지도를 확대해보세요.
        </p>
      ) : null}
      <div ref={containerRef} className={styles.mapContainer} />
      {selectedOffice ? (
        <OfficeDetailPanel office={selectedOffice} onClose={clearSelection} />
      ) : null}
    </div>
  );
};
