import { Input } from "../Input";
import { Select, type ISelectOption } from "../Select";
import styles from "./DealFieldSet.module.css";

export interface IDealFieldSetValues {
  dealType: string;
  dealResult: string;
  visitedYear: string;
  visitedMonth: string;
  expertise: string;
  defectResponse: string;
}

export type TDealField = keyof IDealFieldSetValues;

export interface IDealFieldSetProps {
  values: IDealFieldSetValues;
  onChange: (field: TDealField, value: string) => void;
  dealTypeOptions: ISelectOption[];
  dealResultOptions: ISelectOption[];
  monthOptions: ISelectOption[];
  expertiseOptions: ISelectOption[];
  defectResponseOptions: ISelectOption[];
}

const PLACEHOLDER = "선택 안 함";

/** molecule (design-system-molecules 명세). 거래·방문·전문성 6필드. 옵션은 호출자 책임. */
export const DealFieldSet = ({
  values,
  onChange,
  dealTypeOptions,
  dealResultOptions,
  monthOptions,
  expertiseOptions,
  defectResponseOptions,
}: IDealFieldSetProps) => (
  <div className={styles.fields}>
    <Select
      label="거래유형"
      value={values.dealType}
      onChange={(value) => onChange("dealType", value)}
      options={dealTypeOptions}
      placeholder={PLACEHOLDER}
    />
    <Select
      label="거래결과"
      value={values.dealResult}
      onChange={(value) => onChange("dealResult", value)}
      options={dealResultOptions}
      placeholder={PLACEHOLDER}
    />
    <Input
      label="방문 연도"
      type="number"
      width="narrow"
      value={values.visitedYear}
      onChange={(value) => onChange("visitedYear", value)}
      placeholder="방문 연도"
    />
    <Select
      label="방문 월"
      value={values.visitedMonth}
      onChange={(value) => onChange("visitedMonth", value)}
      options={monthOptions}
      placeholder={PLACEHOLDER}
    />
    <Select
      label="전문성"
      value={values.expertise}
      onChange={(value) => onChange("expertise", value)}
      options={expertiseOptions}
      placeholder={PLACEHOLDER}
    />
    <Select
      label="하자 대응"
      value={values.defectResponse}
      onChange={(value) => onChange("defectResponse", value)}
      options={defectResponseOptions}
      placeholder={PLACEHOLDER}
    />
  </div>
);
