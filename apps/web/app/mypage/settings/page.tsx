"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./page.module.css";
import { useSession } from "../../../hooks/useSession";

/** RequireAuth가 이미 걸러주지만, `user`는 여전히 `null` 가능한 타입이라 좁혀야 한다. */
const MyPageSettingsPage = () => {
  const { logout, deleteAccount } = useSession();
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    // LoginButton과 같은 이유 — useSession은 컴포넌트마다 독립된 로컬 상태라
    // RequireAuth가 곧바로 반응하지 않는다. 보호된 화면에 남지 않도록 직접 보낸다.
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      router.push("/");
    } catch {
      setError("탈퇴 처리에 실패했습니다. 다시 시도해주세요.");
      setIsDeleting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>설정</h1>

      <div className={styles.field}>
        <span className={styles.label}>계정</span>
        <div className={styles.actionRow}>
          <button type="button" onClick={() => void handleLogout()}>
            로그아웃
          </button>
          <button
            type="button"
            className={styles.dangerButton}
            onClick={() => setIsConfirmOpen(true)}
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {isConfirmOpen ? (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-labelledby="delete-confirm-title">
            <h2 id="delete-confirm-title" className={styles.modalTitle}>
              회원 탈퇴
            </h2>
            <p className={styles.modalBody}>
              탈퇴하면 계정이 즉시 삭제됩니다. 작성하신 리뷰는 삭제되지 않고 작성자만
              익명으로 처리됩니다.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={() => void handleDeleteAccount()}
                disabled={isDeleting}
              >
                {isDeleting ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MyPageSettingsPage;
