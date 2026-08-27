import { describe, expect, it } from "vitest";

import { buildKakaoMapScriptUrl } from "../../lib/kakaoMapSdk";

describe("buildKakaoMapScriptUrl", () => {
  it("AC1: appkey·autoload=false·libraries=clusterer,services 쿼리를 포함한 URL을 만든다", () => {
    const url = buildKakaoMapScriptUrl("test-app-key");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js",
    );
    expect(parsed.searchParams.get("appkey")).toBe("test-app-key");
    expect(parsed.searchParams.get("autoload")).toBe("false");
    // marker-clustering 명세: MarkerClusterer는 별도 SDK 라이브러리라 로드 시점에 선언해야 한다.
    // kakao-places-location-search AC1: services는 Places 키워드 검색에 필요하다.
    expect(parsed.searchParams.get("libraries")).toBe("clusterer,services");
  });

  it("kakao-places-location-search 설계 메모: libraries의 콤마가 %2C로 인코딩되지 않는다", () => {
    // 카카오 SDK 부트스트랩 코드가 자기 <script src>의 쿼리스트링을 디코딩 없이
    // 정규식으로 파싱해 콤마로 split한다 — %2C로 인코딩되면 두 번째 이후 라이브러리가
    // 조용히 로드 실패한다(실 브라우저 검증으로 발견). URL.searchParams.get()은
    // 다시 디코딩해버려 이 문제를 못 잡으므로 원본 문자열을 직접 검사한다.
    const url = buildKakaoMapScriptUrl("test-app-key");

    expect(url).toContain("libraries=clusterer,services");
    expect(url).not.toContain("%2C");
  });

  it("AC2: 앱키가 빈 문자열이면 에러를 던진다", () => {
    expect(() => buildKakaoMapScriptUrl("")).toThrow();
  });

  it("AC2: 공백만 있는 앱키도 에러를 던진다", () => {
    expect(() => buildKakaoMapScriptUrl("   ")).toThrow();
  });
});
