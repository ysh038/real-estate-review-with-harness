export {};

/**
 * 이 화면(지도 렌더링만)에 필요한 최소 타입만 선언한다.
 * 마커·클러스터링에서 쓸 API는 그 명세에서 늘린다 (YAGNI).
 */
declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
    }

    interface IMapOptions {
      center: LatLng;
      level: number;
    }

    class Map {
      constructor(container: HTMLElement, options: IMapOptions);
      relayout(): void;
    }
  }

  interface IKakaoNamespace {
    maps: {
      LatLng: typeof kakao.maps.LatLng;
      Map: typeof kakao.maps.Map;
      load: (callback: () => void) => void;
    };
  }

  interface Window {
    kakao: IKakaoNamespace;
  }
}
