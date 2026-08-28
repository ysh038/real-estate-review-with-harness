import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { DealFieldSet } from "./DealFieldSet";

const EMPTY_VALUES = {
  dealType: "",
  dealResult: "",
  visitedYear: "",
  visitedMonth: "",
  expertise: "",
  defectResponse: "",
};

const meta = {
  title: "DesignSystem/Molecules/DealFieldSet",
  component: DealFieldSet,
  tags: ["autodocs"],
  args: {
    values: EMPTY_VALUES,
    onChange: fn(),
    dealTypeOptions: [
      { value: "전세", label: "전세" },
      { value: "월세", label: "월세" },
    ],
    dealResultOptions: [
      { value: "계약 완료", label: "계약 완료" },
      { value: "상담만", label: "상담만" },
    ],
    monthOptions: [
      { value: "1", label: "1월" },
      { value: "3", label: "3월" },
    ],
    expertiseOptions: [
      { value: "높음", label: "높음" },
      { value: "보통", label: "보통" },
    ],
    defectResponseOptions: [
      { value: "신속", label: "신속" },
      { value: "미흡", label: "미흡" },
    ],
  },
} satisfies Meta<typeof DealFieldSet>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};

/** AC16: 6개 필드가 각각 해당 aria-label로 쿼리된다. */
export const SixFieldsAreLabeled: TStory = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "거래유형" })).toBeInTheDocument();
    await expect(canvas.getByRole("combobox", { name: "거래결과" })).toBeInTheDocument();
    await expect(canvas.getByRole("spinbutton", { name: "방문 연도" })).toBeInTheDocument();
    await expect(canvas.getByRole("combobox", { name: "방문 월" })).toBeInTheDocument();
    await expect(canvas.getByRole("combobox", { name: "전문성" })).toBeInTheDocument();
    await expect(canvas.getByRole("combobox", { name: "하자 대응" })).toBeInTheDocument();
  },
};

/**
 * AC17: 방문 연도는 type=number 이고 폭이 6em.
 * getComputedStyle width는 px — 기본 16px 폰트 기준 6em = 96px.
 */
export const YearInputIsNarrowNumber: TStory = {
  play: async ({ canvas }) => {
    const year = canvas.getByRole("spinbutton", { name: "방문 연도" });
    await expect(year).toHaveAttribute("type", "number");
    await expect(getComputedStyle(year).width).toBe("96px");
  },
};

/** AC18: 거래유형 Select를 바꾸면 onChange("dealType", 새 값)이 1회 호출된다. */
export const ChangingDealTypeCallsOnChange: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    const select = canvas.getByRole("combobox", { name: "거래유형" });
    await userEvent.selectOptions(select, "월세");
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith("dealType", "월세");
  },
};

/** AC19: 내부 Select·Input은 키보드 포커스가 가능하다(청크 1 atom :focus-visible 전제). */
export const ControlsAreKeyboardFocusable: TStory = {
  play: async ({ canvas }) => {
    const type = canvas.getByRole("combobox", { name: "거래유형" });
    type.focus();
    await expect(type).toHaveFocus();
    const year = canvas.getByRole("spinbutton", { name: "방문 연도" });
    year.focus();
    await expect(year).toHaveFocus();
  },
};
