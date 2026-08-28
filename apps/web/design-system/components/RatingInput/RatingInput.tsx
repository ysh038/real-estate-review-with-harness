import styles from "./RatingInput.module.css";

const SCORES = [1, 2, 3, 4, 5] as const;

export interface IRatingInputProps {
  name: string;
  value: number;
  onChange: (value: number) => void;
}

/** molecule (design-system-molecules 명세). 1~5 숫자 radio 별점 입력. */
export const RatingInput = ({ name, value, onChange }: IRatingInputProps) => (
  <div className={styles.group} role="radiogroup" aria-label="별점">
    {SCORES.map((score) => (
      <label key={score} className={styles.label}>
        <input
          type="radio"
          name={name}
          value={score}
          checked={value === score}
          onChange={() => onChange(score)}
          aria-label={`${score}점`}
        />
        {score}
      </label>
    ))}
  </div>
);
