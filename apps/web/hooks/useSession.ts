"use client";

import type { TAuthUser } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import {
  deleteAccountRequest,
  fetchCurrentUser,
  logoutRequest,
  updateNickname as updateNicknameRequest,
} from "../lib/authApi";

export type TSessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface IUseSessionResult {
  status: TSessionStatus;
  user: TAuthUser | null;
  logout: () => Promise<void>;
  /** 성공하면 로컬 user.nickname을 즉시 갱신한다 — 재조회 없이 (mypage-shell-and-profile AC22). */
  updateNickname: (nickname: string) => Promise<void>;
  /** 회원 탈퇴. 성공하면 logout과 동일하게 로컬 상태를 비운다 (member-account-deletion AC16). */
  deleteAccount: () => Promise<void>;
}

/** 앱 진입 시 `/api/me` 로 로그인 여부를 확인하고, 로그아웃을 노출한다. */
export const useSession = (): IUseSessionResult => {
  const [status, setStatus] = useState<TSessionStatus>("loading");
  const [user, setUser] = useState<TAuthUser | null>(null);

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

  const updateNickname = useCallback(async (nickname: string) => {
    const updated = await updateNicknameRequest(nickname);
    setUser(updated);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteAccountRequest();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return { status, user, logout, updateNickname, deleteAccount };
};
