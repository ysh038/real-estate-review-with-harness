export {};

/**
 * 지도 렌더링(kakao-map-render) + bbox 마커 동기화(office-marker-bbox-sync)에 필요한
 * 최소 타입만 선언한다. 리뷰 시스템 등 이후 화면에서 필요해지면 그때 늘린다 (YAGNI).
 */
declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
      getLat(): number;
      getLng(): number;
    }

    class LatLngBounds {
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
    }

    interface IMapOptions {
      center: LatLng;
      level: number;
    }

    class Map {
      constructor(container: HTMLElement, options: IMapOptions);
      relayout(): void;
      getBounds(): LatLngBounds;
      /**
       * office-search-bar: 검색 결과 선택 시 그 위치로 지도를 즉시 이동한다.
       * `panTo`(애니메이션)는 쓰지 않는다 — 바로 뒤에 setLevel을 호출하면 애니메이션이
       * 끝나기 전에 잘려서 중심이 원래 위치 근처에 남는 경합이 생긴다(브라우저 검증으로
       * 확인).
       */
      setCenter(latlng: LatLng): void;
      /** office-search-bar: 선택한 사무소 단위로 확대한다. */
      setLevel(level: number): void;
    }

    interface IMarkerOptions {
      position: LatLng;
      map?: Map;
      title?: string;
    }

    class Marker {
      constructor(options: IMarkerOptions);
      setMap(map: Map | null): void;
    }

    interface IMarkerClustererOptions {
      map: Map;
      markers?: Marker[];
      averageCenter?: boolean;
      minLevel?: number;
    }

    class MarkerClusterer {
      constructor(options: IMarkerClustererOptions);
      addMarkers(markers: Marker[]): void;
      removeMarkers(markers: Marker[]): void;
      clear(): void;
    }

    namespace event {
      function addListener(
        target: object,
        type: string,
        handler: () => void,
      ): void;
      function removeListener(
        target: object,
        type: string,
        handler: () => void,
      ): void;
    }

    /** kakao-places-location-search: 지역명·장소 키워드 검색(클라이언트 직접 호출). */
    namespace services {
      enum Status {
        OK = "OK",
        ZERO_RESULT = "ZERO_RESULT",
        ERROR = "ERROR",
      }

      interface IPlacesSearchResultItem {
        id: string;
        place_name: string;
        address_name: string;
        road_address_name: string;
        /** 경도(문자열로 내려온다). */
        x: string;
        /** 위도(문자열로 내려온다). */
        y: string;
      }

      class Places {
        keywordSearch(
          keyword: string,
          callback: (data: IPlacesSearchResultItem[], status: Status) => void,
        ): void;
      }
    }
  }

  interface IKakaoNamespace {
    maps: {
      LatLng: typeof kakao.maps.LatLng;
      LatLngBounds: typeof kakao.maps.LatLngBounds;
      Map: typeof kakao.maps.Map;
      Marker: typeof kakao.maps.Marker;
      MarkerClusterer: typeof kakao.maps.MarkerClusterer;
      event: typeof kakao.maps.event;
      services: typeof kakao.maps.services;
      load: (callback: () => void) => void;
    };
  }

  interface Window {
    kakao: IKakaoNamespace;
  }
}
