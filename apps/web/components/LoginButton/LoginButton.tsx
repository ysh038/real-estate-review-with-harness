"use client";

import styles from "./LoginButton.module.css";
import { useSession } from "../../hooks/useSession";
import { buildKakaoLoginUrl } from "../../lib/authApi";

/**
 * 지도 화면 위에 얹는 로그인/로그아웃 위젯. 로딩 중엔 깜빡임을 피하려고 아무것도
 * 그리지 않는다 — "비로그인" 상태를 잠깐 보여줬다가 로그인으로 바뀌는 게 더 어색하다.
 */
export const LoginButton = () => {
  const { status, user, logout } = useSession();

  if (status === "loading") return null;

  if (status === "unauthenticated") {
    return (
      <div className={styles.wrapper}>
        <a className={styles.link} href={buildKakaoLoginUrl()}>
          카카오 로그인
        </a>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <span className={styles.nickname}>{user?.nickname}</span>
      <button type="button" className={styles.logoutButton} onClick={logout}>
        로그아웃
      </button>
    </div>
  );
};
