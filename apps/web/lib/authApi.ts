import type { TAuthUser } from "@repo/types";

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** 세션 쿠키가 api(다른 origin)로 실리려면 credentials: 'include' 가 필수다. */
export const fetchCurrentUser = async (
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TAuthUser | null> => {
  const response = await fetch(`${baseUrl}/api/me`, { credentials: "include" });
  // 401은 "로그인 안 함"이라는 정상 상태다 — 에러로 취급하지 않는다 (AC6).
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`내 정보 조회 실패 (status ${response.status})`);
  }
  return (await response.json()) as TAuthUser;
};

/** 닉네임을 수정하고 갱신된 사용자 정보를 반환한다 (mypage-shell-and-profile AC5). */
export const updateNickname = async (
  nickname: string,
  baseUrl: string = DEFAULT_BASE_URL,
): Promise<TAuthUser> => {
  const response = await fetch(`${baseUrl}/api/users/me`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });
  if (!response.ok) {
    throw new Error(`닉네임 수정 실패 (status ${response.status})`);
  }
  return (await response.json()) as TAuthUser;
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
