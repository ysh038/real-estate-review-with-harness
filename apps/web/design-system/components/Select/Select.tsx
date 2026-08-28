import styles from "./Select.module.css";

export interface ISelectOption {
  value: string;
  label: string;
}

export interface ISelectProps {
  /** aria-label로 쓰인다 — 시각적 라벨은 각 사용처(폼 레이아웃)가 따로 그린다. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ISelectOption[];
  /** "선택 안 함" 등 빈 값(value="")에 대응하는 문구. 첫 항목으로 렌더된다. */
  placeholder: string;
}

/**
 * atom (design-system-atoms 명세). value와 label이 다를 수 있다(방문 월:
 * value="3", label="3월") — 옵션을 문자열 배열이 아니라 {value,label} 쌍으로 받는다.
 */
export const Select = ({ label, value, onChange, options, placeholder }: ISelectProps) => (
  <select
    className={styles.select}
    aria-label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
