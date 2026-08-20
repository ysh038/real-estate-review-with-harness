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
  return url.toString();
};
