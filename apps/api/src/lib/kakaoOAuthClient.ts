const TOKEN_ENDPOINT = "https://kauth.kakao.com/oauth/token";
const PROFILE_ENDPOINT = "https://kapi.kakao.com/v2/user/me";

/**
 * fetchProfile 이 실제로 읽는 필드(닉네임·프로필 사진)만 명시적으로 요청한다.
 * scope를 생략하면 카카오 콘솔의 "필수 동의" 설정에 조용히 기대게 되는데, 그 항목이
 * "선택 동의"거나 아예 비어 있으면 kakao_account.profile 이 통째로 빠져 nickname이
 * fallback("카카오 사용자")으로만 나온다 — 실제로 겪은 문제다.
 */
const REQUESTED_SCOPES = ["profile_nickname", "profile_image"];

export interface IKakaoProfile {
  kakaoId: string;
  nickname: string;
  profileImageUrl: string | null;
}

export interface IKakaoOAuthClientConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface IKakaoOAuthClient {
  buildAuthorizeUrl: (state: string) => string;
  exchangeCodeForToken: (code: string) => Promise<string>;
  fetchProfile: (accessToken: string) => Promise<IKakaoProfile>;
}

interface IKakaoTokenResponse {
  access_token: string;
}

interface IKakaoUserResponse {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

/**
 * 토큰 교환·프로필 조회 어댑터. 실제 네트워크 호출이라 gyeonggiClient·kakaoGeocoder 와
 * 같은 패턴 — 단위 테스트는 이 어댑터를 인터페이스로 주입받는 authService 쪽에서 한다.
 */
export const createKakaoOAuthClient = (
  config: IKakaoOAuthClientConfig,
): IKakaoOAuthClient => ({
  buildAuthorizeUrl: (state: string): string => {
    const url = new URL("https://kauth.kakao.com/oauth/authorize");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", REQUESTED_SCOPES.join(","));
    return url.toString();
  },

  exchangeCodeForToken: async (code: string): Promise<string> => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      throw new Error(`카카오 토큰 교환 실패: HTTP ${res.status}`);
    }

    const json = (await res.json()) as IKakaoTokenResponse;
    return json.access_token;
  },

  fetchProfile: async (accessToken: string): Promise<IKakaoProfile> => {
    const res = await fetch(PROFILE_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`카카오 프로필 조회 실패: HTTP ${res.status}`);
    }

    const json = (await res.json()) as IKakaoUserResponse;
    const profile = json.kakao_account?.profile;

    return {
      kakaoId: String(json.id),
      nickname: profile?.nickname ?? "카카오 사용자",
      profileImageUrl: profile?.profile_image_url ?? null,
    };
  },
});
