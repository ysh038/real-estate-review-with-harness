const SDK_BASE_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

/**
 * autoload=false로 받는다 — 스크립트 로드 완료 후 kakao.maps.load()를 직접 호출해
 * 초기화 타이밍을 우리가 제어해야 로딩 상태를 정확히 추적할 수 있다.
 */
export const buildKakaoMapScriptUrl = (appKey: string): string => {
  if (!appKey.trim()) {
    throw new Error("카카오 지도 앱키가 비어 있습니다 (NEXT_PUBLIC_KAKAO_JS_KEY)");
  }

  const url = new URL(SDK_BASE_URL);
  url.searchParams.set("appkey", appKey);
  url.searchParams.set("autoload", "false");

  // marker-clustering 명세: MarkerClusterer는 코어 SDK에 없는 별도 라이브러리다.
  // kakao-places-location-search 명세: services는 Places 키워드 검색에 필요하다.
  // libraries는 URLSearchParams로 넣지 않는다 — 카카오 SDK 부트스트랩 코드가 자기
  // <script src>의 쿼리스트링을 decodeURIComponent 없이 정규식으로 직접 파싱해
  // 콤마로 split하는데, URLSearchParams.set은 콤마를 %2C로 인코딩해버려 두 번째
  // 이후 라이브러리가 조용히 로드 실패하고 kakao.maps.load()의 콜백이 영영 안
  // 불린다(실 브라우저 검증으로 발견 — 유닛 테스트는 URL.searchParams.get이 다시
  // 디코딩해서 통과시켜버려 못 잡는다). 리터럴 콤마를 유지하려 직접 이어붙인다.
  return `${url.toString()}&libraries=clusterer,services`;
};
