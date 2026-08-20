export interface IAuthUser {
  id: string;
  nickname: string;
  profileImageUrl: string | null;
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** 세션 쿠키가 api(다른 origin)로 실리려면 credentials: 'include' 가 필수다. */
export const fetchCurrentUser = async (
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<IAuthUser | null> => {
  const response = await fetch(`${baseUrl}/api/me`, { credentials: "include" });
  // 401은 "로그인 안 함"이라는 정상 상태다 — 에러로 취급하지 않는다 (AC6).
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`내 정보 조회 실패 (status ${response.status})`);
  }
  return (await response.json()) as IAuthUser;
};

export const logoutRequest = async (baseUrl: string = DEFAULT_BASE_URL): Promise<void> => {
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`로그아웃 실패 (status ${response.status})`);
  }
};

export const buildKakaoLoginUrl = (baseUrl: string = DEFAULT_BASE_URL): string =>
  `${baseUrl}/auth/kakao`;
