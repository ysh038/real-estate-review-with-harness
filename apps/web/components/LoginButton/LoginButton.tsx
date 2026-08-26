"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./LoginButton.module.css";
import { useSession } from "../../hooks/useSession";
import { buildKakaoLoginUrl } from "../../lib/authApi";

/**
 * 모든 페이지에 뜨는 로그인/로그아웃 위젯(루트 레이아웃에서 렌더). 로딩 중엔 깜빡임을
 * 피하려고 아무것도 그리지 않는다 — "비로그인" 상태를 잠깐 보여줬다가 로그인으로
 * 바뀌는 게 더 어색하다.
 */
export const LoginButton = () => {
  const { status, user, logout } = useSession();
  const router = useRouter();

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

  const handleLogout = async () => {
    await logout();
    // useSession은 컴포넌트마다 독립된 로컬 상태라, 여기서 로그아웃해도 /mypage를
    // 지키는 RequireAuth의 상태는 갱신되지 않는다. 보호된 화면에 남지 않도록 항상
    // 홈으로 보낸다 (근거: mypage-shell-and-profile 설계 메모).
    router.push("/");
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.nickname}>{user?.nickname}</span>
      <Link className={styles.myPageLink} href="/mypage">
        마이페이지
      </Link>
      <button
        type="button"
        className={styles.logoutButton}
        onClick={() => void handleLogout()}
      >
        로그아웃
      </button>
    </div>
  );
};
