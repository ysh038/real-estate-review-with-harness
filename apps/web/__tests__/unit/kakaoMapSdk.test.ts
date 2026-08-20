import { describe, expect, it } from "vitest";

import { buildKakaoMapScriptUrl } from "../../lib/kakaoMapSdk";

describe("buildKakaoMapScriptUrl", () => {
  it("AC1: appkey와 autoload=false 쿼리를 포함한 URL을 만든다", () => {
    const url = buildKakaoMapScriptUrl("test-app-key");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "https://dapi.kakao.com/v2/maps/sdk.js",
    );
    expect(parsed.searchParams.get("appkey")).toBe("test-app-key");
    expect(parsed.searchParams.get("autoload")).toBe("false");
  });

  it("AC2: 앱키가 빈 문자열이면 에러를 던진다", () => {
    expect(() => buildKakaoMapScriptUrl("")).toThrow();
  });

  it("AC2: 공백만 있는 앱키도 에러를 던진다", () => {
    expect(() => buildKakaoMapScriptUrl("   ")).toThrow();
  });
});
