"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchCurrentUser, logoutRequest, type IAuthUser } from "../lib/authApi";

export type TSessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface IUseSessionResult {
  status: TSessionStatus;
  user: IAuthUser | null;
  logout: () => Promise<void>;
}

/** 앱 진입 시 `/api/me` 로 로그인 여부를 확인하고, 로그아웃을 노출한다. */
export const useSession = (): IUseSessionResult => {
  const [status, setStatus] = useState<TSessionStatus>("loading");
  const [user, setUser] = useState<IAuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus(currentUser ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        // 조회 자체가 실패(네트워크 등)해도 비로그인으로 취급한다 — 로그인 버튼을
        // 보여주는 쪽이 빈 화면보다 안전하다.
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return { status, user, logout };
};
