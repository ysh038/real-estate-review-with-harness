import { describe, expect, it } from "vitest";

import { createKakaoOAuthClient } from "../../lib/kakaoOAuthClient";

describe("kakaoOAuthClient.buildAuthorizeUrl", () => {
  it("client_id·redirect_uri·response_type·state 쿼리를 포함한다", () => {
    const client = createKakaoOAuthClient({
      clientId: "test-client-id",
      clientSecret: "test-secret",
      redirectUri: "http://localhost:8788/auth/kakao/callback",
    });

    const url = new URL(client.buildAuthorizeUrl("test-state"));

    expect(url.origin + url.pathname).toBe(
      "https://kauth.kakao.com/oauth/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:8788/auth/kakao/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("test-state");
  });

  it("닉네임·프로필 사진 동의항목을 scope로 명시적으로 요청한다 — 콘솔의 '필수 동의' 기본값에 기대지 않는다", () => {
    const client = createKakaoOAuthClient({
      clientId: "test-client-id",
      clientSecret: "test-secret",
      redirectUri: "http://localhost:8788/auth/kakao/callback",
    });

    const url = new URL(client.buildAuthorizeUrl("test-state"));

    expect(url.searchParams.get("scope")).toBe("profile_nickname,profile_image");
  });
});
