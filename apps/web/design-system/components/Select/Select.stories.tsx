import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { Select } from "./Select";

const DEAL_TYPE_OPTIONS = [
  { value: "전세", label: "전세" },
  { value: "월세", label: "월세" },
  { value: "매매", label: "매매" },
];

const MONTH_OPTIONS = [
  { value: "1", label: "1월" },
  { value: "2", label: "2월" },
];

const meta = {
  title: "DesignSystem/Atoms/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    label: "거래유형",
    value: "",
    onChange: fn(),
    options: DEAL_TYPE_OPTIONS,
    placeholder: "선택 안 함",
  },
} satisfies Meta<typeof Select>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};

/** AC14: placeholder가 첫 항목(빈 문자열 value)으로 렌더된다. */
export const PlaceholderIsFirstOption: TStory = {
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "거래유형" }) as HTMLSelectElement;
    await expect(select.options[0]?.value).toBe("");
    await expect(select.options[0]?.textContent).toBe("선택 안 함");
  },
};

/** value와 label이 다를 수 있다(월 선택: value="3", label="3월"). */
export const ValueAndLabelCanDiffer: TStory = {
  args: { label: "방문 월", options: MONTH_OPTIONS, value: "1" },
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "방문 월" });
    await expect(select).toHaveValue("1");
    await expect(canvas.getByRole("option", { name: "1월" })).toBeInTheDocument();
  },
};

/** 값을 바꾸면 onChange가 새 값으로 호출된다. */
export const ChangeCallsOnChange: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    const select = canvas.getByRole("combobox", { name: "거래유형" });
    await userEvent.selectOptions(select, "월세");
    await expect(args.onChange).toHaveBeenCalledWith("월세");
  },
};

/** AC17: focus-visible 아웃라인을 위해 키보드 포커스가 가능해야 한다. */
export const KeyboardFocusable: TStory = {
  play: async ({ canvas }) => {
    const select = canvas.getByRole("combobox", { name: "거래유형" });
    select.focus();
    await expect(select).toHaveFocus();
  },
};
