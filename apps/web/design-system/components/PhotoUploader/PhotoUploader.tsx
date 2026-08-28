import { Button } from "../Button";
import styles from "./PhotoUploader.module.css";

export interface IPhotoItem {
  id: string;
  src: string;
  alt: string;
  /** 생략하면 `사진 ${index+1} 삭제`. 여러 리스트를 합쳐 렌더할 때(부모가
   *  전역 인덱스로는 만들 수 없는 라벨이 필요할 때) 직접 지정한다. */
  removeLabel?: string;
}

export interface IPhotoUploaderProps {
  items: IPhotoItem[];
  max: number;
  accept: string;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  addLabel?: string;
}

/** molecule (design-system-molecules 명세). 미리보기 + 추가 input. File/kept 구분은 부모. */
export const PhotoUploader = ({
  items,
  max,
  accept,
  onAdd,
  onRemove,
  addLabel = "+ 사진 추가",
}: IPhotoUploaderProps) => (
  <div className={styles.section}>
    {items.length > 0 ? (
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li key={item.id} className={styles.item}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt={item.alt} className={styles.image} />
            <Button
              size="icon"
              className={styles.removeButton}
              aria-label={item.removeLabel ?? `사진 ${index + 1} 삭제`}
              onClick={() => onRemove(item.id)}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>
    ) : null}
    {items.length < max ? (
      <label className={styles.addLabel}>
        {addLabel}
        <input
          type="file"
          aria-label="사진 추가"
          accept={accept}
          multiple
          className={styles.fileInput}
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            if (files.length > 0) {
              onAdd(files);
            }
            event.target.value = "";
          }}
        />
      </label>
    ) : null}
  </div>
);
