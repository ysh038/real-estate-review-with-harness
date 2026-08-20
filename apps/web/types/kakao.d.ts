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
  }

  interface IKakaoNamespace {
    maps: {
      LatLng: typeof kakao.maps.LatLng;
      LatLngBounds: typeof kakao.maps.LatLngBounds;
      Map: typeof kakao.maps.Map;
      Marker: typeof kakao.maps.Marker;
      event: typeof kakao.maps.event;
      load: (callback: () => void) => void;
    };
  }

  interface Window {
    kakao: IKakaoNamespace;
  }
}
