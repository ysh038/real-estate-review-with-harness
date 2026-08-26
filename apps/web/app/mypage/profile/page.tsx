"use client";

import { useState } from "react";

import styles from "./page.module.css";
import { useSession } from "../../../hooks/useSession";

const formatJoinDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 가입`;
};

/** RequireAuth가 이미 걸러주지만, `user`는 여전히 `null` 가능한 타입이라 좁혀야 한다. */
const MyPageProfilePage = () => {
  const { user, updateNickname } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [draftNickname, setDraftNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const handleEdit = () => {
    setDraftNickname(user.nickname);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmed = draftNickname.trim();
    if (trimmed.length === 0) {
      setError("닉네임을 입력해주세요");
      return;
    }
    await updateNickname(trimmed);
    setIsEditing(false);
  };

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>프로필</h1>

      <div className={styles.field}>
        <span className={styles.label}>닉네임</span>
        {isEditing ? (
          <div className={styles.editRow}>
            <input
              className={styles.input}
              value={draftNickname}
              onChange={(event) => setDraftNickname(event.target.value)}
            />
            <button type="button" onClick={() => void handleSave()}>
              저장
            </button>
            <button type="button" onClick={() => setIsEditing(false)}>
              취소
            </button>
          </div>
        ) : (
          <div className={styles.editRow}>
            <span className={styles.value}>{user.nickname}</span>
            <button type="button" onClick={handleEdit}>
              수정
            </button>
          </div>
        )}
        {error ? <p className={styles.error}>{error}</p> : null}
      </div>

      <div className={styles.field}>
        <span className={styles.label}>가입일</span>
        <span className={styles.value}>{formatJoinDate(user.createdAt)}</span>
      </div>

      <p className={styles.kakaoBadge}>카카오 계정으로 로그인됨</p>
    </section>
  );
};

export default MyPageProfilePage;
