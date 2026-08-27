import styles from "./ErrorState.module.css";

export interface IErrorStateProps {
  message: string;
}

/** 조회 실패 시 공통으로 쓰는 에러 문구(review-ux-consistency-and-draft AC2). */
export const ErrorState = ({ message }: IErrorStateProps) => (
  <p className={styles.message} role="alert">
    {message}
  </p>
);
