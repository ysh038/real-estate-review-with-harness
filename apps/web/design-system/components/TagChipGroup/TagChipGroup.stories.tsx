import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { TagChipGroup } from "./TagChipGroup";

const OPTIONS = ["친절함", "응답 빠름", "설명 꼼꼼"];

const meta = {
  title: "DesignSystem/Molecules/TagChipGroup",
  component: TagChipGroup,
  tags: ["autodocs"],
  args: {
    options: OPTIONS,
    selected: ["친절함"],
    onToggle: fn(),
    label: "태그",
  },
} satisfies Meta<typeof TagChipGroup>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};

/** AC12: role="group"이고 label prop이 aria-label이 된다. */
export const IsNamedGroup: TStory = {
  args: { label: "리뷰 태그" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "리뷰 태그" })).toBeInTheDocument();
  },
};

/** AC13: options 개수만큼 Chip이 있고 selected만 aria-pressed=true. */
export const SelectedChipsArePressed: TStory = {
  play: async ({ canvas }) => {
    const chips = canvas.getAllByRole("button");
    await expect(chips).toHaveLength(OPTIONS.length);
    await expect(canvas.getByRole("button", { name: "친절함" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "응답 빠름" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  },
};

/** AC14: 미선택 Chip을 클릭하면 onToggle이 그 옵션 문자열로 1회 호출된다. */
export const ClickUnselectedCallsOnToggle: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "응답 빠름" }));
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
    await expect(args.onToggle).toHaveBeenCalledWith("응답 빠름");
  },
};

/** AC15: 내부 토글이 Chip과 같은 pill(9999px)이다. */
export const ChipsArePillShaped: TStory = {
  play: async ({ canvas }) => {
    const chip = canvas.getByRole("button", { name: "친절함" });
    await expect(getComputedStyle(chip).borderRadius).toBe("9999px");
  },
};
