"use client";

import { useEffect, useState } from "react";

const DEBOUNCE_MS = 300;
const MAX_PLACE_RESULTS = 3;

export interface IKakaoPlace {
  id: string;
  placeName: string;
  addressName: string;
  lat: number;
  lng: number;
}

export interface IUseKakaoPlacesSearchResult {
  places: IKakaoPlace[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * 카카오 Places.keywordSearch()로 지역명·장소를 찾는다(kakao-places-location-search
 * 명세). 백엔드를 거치지 않고 브라우저에서 카카오 SDK를 직접 호출한다는 점만 빼면
 * useOfficeSearch와 디바운스 정책이 같다.
 */
export const useKakaoPlacesSearch = (query: string): IUseKakaoPlacesSearchResult => {
  const [places, setPlaces] = useState<IKakaoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setPlaces([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    // 검색바는 지도 SDK 로드(services 라이브러리 포함) 완료 후에만 마운트되므로
    // 실제로는 거의 발생하지 않지만, 방어적으로 조용히 건너뛴다.
    if (typeof window === "undefined" || !window.kakao?.maps?.services) {
      return undefined;
    }

    let isCancelled = false;
    setIsLoading(true);
    const placesService = new window.kakao.maps.services.Places();

    const timer = setTimeout(() => {
      placesService.keywordSearch(trimmed, (data, status) => {
        if (isCancelled) return;
        setIsLoading(false);

        if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
          setPlaces([]);
          setError(null);
          return;
        }
        if (status !== window.kakao.maps.services.Status.OK) {
          setError(new Error("장소 검색에 실패했습니다"));
          return;
        }

        setError(null);
        setPlaces(
          data.slice(0, MAX_PLACE_RESULTS).map((item) => ({
            id: item.id,
            placeName: item.place_name,
            addressName: item.road_address_name || item.address_name,
            lat: Number(item.y),
            lng: Number(item.x),
          })),
        );
      });
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { places, isLoading, error };
};
