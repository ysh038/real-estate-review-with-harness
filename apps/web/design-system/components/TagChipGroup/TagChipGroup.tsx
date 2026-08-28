import { Chip } from "../Chip";
import styles from "./TagChipGroup.module.css";

export interface ITagChipGroupProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  label?: string;
}

/** molecule (design-system-molecules 명세). Chip atom을 묶는 선택 그룹. */
export const TagChipGroup = ({
  options,
  selected,
  onToggle,
  label = "태그",
}: ITagChipGroupProps) => (
  <div className={styles.group} role="group" aria-label={label}>
    {options.map((option) => (
      <Chip
        key={option}
        selected={selected.includes(option)}
        onToggle={() => onToggle(option)}
      >
        {option}
      </Chip>
    ))}
  </div>
);
