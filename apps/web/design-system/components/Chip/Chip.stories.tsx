import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { Chip } from "./Chip";

const meta = {
  title: "DesignSystem/Atoms/Chip",
  component: Chip,
  tags: ["autodocs"],
  args: { onToggle: fn(), children: "친절함" },
} satisfies Meta<typeof Chip>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Unselected: TStory = { args: { selected: false } };
export const Selected: TStory = { args: { selected: true } };

/** AC10: aria-pressed가 selected 값과 일치한다. */
export const AriaPressedMatchesSelected: TStory = {
  args: { selected: true },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  },
};

/** AC12: pill 모양(border-radius: full)이다. */
export const IsPillShaped: TStory = {
  args: { selected: false },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    await expect(getComputedStyle(chip).borderRadius).toBe("9999px");
  },
};

/** AC13: 클릭하면 onToggle이 정확히 1회 호출된다. */
export const ClickCallsOnToggleOnce: TStory = {
  args: { selected: false },
  play: async ({ canvas, userEvent, args }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    await userEvent.click(chip);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};

/** AC11: selected 여부에 따라 클래스가 달라진다(배경·글자색 반전). */
export const SelectedAndUnselectedHaveDistinctClasses: TStory = {
  args: { selected: false },
  render: (args) => (
    <>
      <Chip {...args} selected={false}>
        미선택
      </Chip>
      <Chip {...args} selected={true}>
        선택됨
      </Chip>
    </>
  ),
  play: async ({ canvas }) => {
    const unselected = canvas.getByRole("button", { name: "미선택" }).className;
    const selected = canvas.getByRole("button", { name: "선택됨" }).className;
    await expect(unselected).not.toBe(selected);
  },
};

export const KeyboardFocusable: TStory = {
  args: { selected: false },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    chip.focus();
    await expect(chip).toHaveFocus();
  },
};

/**
 * design-system-remaining-organisms AC1~3: className을 넘기면 기본 클래스 뒤에
 * 이어 붙는다. OfficeSearchBar의 카테고리 칩처럼 소비처 전용 크기·그림자를
 * 오버라이드할 때 필요하다.
 */
export const CustomClassNameIsApplied: TStory = {
  args: { selected: false, className: "storyCustomChip" },
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    await expect(chip.className).toContain("storyCustomChip");
  },
};
