"use client";

import { useState, type FormEvent } from "react";

import styles from "./ExampleForm.module.css";

const MIN_LENGTH = 10;

export interface IExampleFormProps {
  /** 검증을 통과한 값으로 호출된다. reject하면 폼이 에러 문구를 보여준다. */
  onSubmit: (message: string) => Promise<void>;
}

/**
 * 디자인시스템 참조 구현 — 라벨·입력·인라인 에러·제출 버튼을 토큰만으로 조립한
 * 최소 폼이다. 실제 문의 폼(apps/web/app/contact)의 축약판이 아니라 "이
 * 저장소에서 폼은 이렇게 짠다"는 살아있는 예제 코드다. 렌더되고 컴파일되는
 * 실제 컴포넌트라 tokens.css나 이 파일이 쓰는 API가 바뀌면 그대로 깨진다.
 */
export const ExampleForm = ({ onSubmit }: IExampleFormProps) => {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (message.trim().length < MIN_LENGTH) {
      setError(`${MIN_LENGTH}자 이상 입력해주세요`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(message);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
      <label className={styles.label} htmlFor="example-form-message">
        문의 내용
      </label>
      <textarea
        id="example-form-message"
        className={styles.textarea}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? "보내는 중…" : "보내기"}
      </button>
    </form>
  );
};
