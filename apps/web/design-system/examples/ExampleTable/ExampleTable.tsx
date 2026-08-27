import styles from "./ExampleTable.module.css";

export type TExampleStatus = "success" | "warning" | "error" | "info";

const STATUS_LABEL: Record<TExampleStatus, string> = {
  success: "정상",
  warning: "주의",
  error: "오류",
  info: "안내",
};

export interface IExampleTableRow {
  id: string;
  name: string;
  status: TExampleStatus;
  updatedAt: string;
}

export interface IExampleTableProps {
  caption: string;
  rows: readonly IExampleTableRow[];
  /** rows가 빈 배열일 때 표 대신 보여줄 문구. */
  emptyMessage: string;
}

/**
 * 디자인시스템 참조 구현 — 상태 배지가 있는 목록 테이블을 토큰만으로 조립한
 * 예제다. 실제 화면(예: 관리자 숨김 리뷰 목록)의 축약판이 아니라 "상태 있는
 * 표는 이렇게 짠다"는 살아있는 예제 코드다.
 */
export const ExampleTable = ({ caption, rows, emptyMessage }: IExampleTableProps) => {
  if (rows.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <table className={styles.table}>
      <caption className={styles.caption}>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">이름</th>
          <th scope="col">상태</th>
          <th scope="col">갱신일</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.name}</td>
            <td>
              <span className={`${styles.badge} ${styles[row.status]}`}>
                {STATUS_LABEL[row.status]}
              </span>
            </td>
            <td className={styles.date}>{row.updatedAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
