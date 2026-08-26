"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../../hooks/useSession";

export interface IRequireAuthProps {
  children: ReactNode;
}

/**
 * `/mypage/*` 같은 로그인 전용 화면을 감싼다. 세션이 쿠키 기반 + 다른 오리진이라
 * 서버 컴포넌트에서 판별하려면 요청의 Cookie 헤더를 API로 전달하는 배선이 새로
 * 필요한데, 클라이언트의 `useSession`이 이미 이 문제를 풀어뒀으므로 재사용한다
 * (근거: mypage-shell-and-profile 설계 메모).
 */
export const RequireAuth = ({ children }: IRequireAuthProps) => {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (status !== "authenticated") return null;
  return <>{children}</>;
};
