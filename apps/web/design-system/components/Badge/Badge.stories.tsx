import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { Badge } from "./Badge";

const meta = {
  title: "DesignSystem/Atoms/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "친절함" },
} satisfies Meta<typeof Badge>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Tag: TStory = { args: { variant: "tag" } };
export const Warning: TStory = {
  args: { variant: "warning", children: "위치 정보 정확도가 낮을 수 있어요" },
};

/** AC1: tag / warning variant가 서로 다른 클래스를 적용한다. */
export const VariantsHaveDistinctClasses: TStory = {
  render: () => (
    <>
      <Badge variant="tag">tag</Badge>
      <Badge variant="warning">warning</Badge>
    </>
  ),
  play: async ({ canvas }) => {
    const tag = canvas.getByText("tag").className;
    const warning = canvas.getByText("warning").className;
    await expect(tag).not.toBe(warning);
  },
};

/** AC2: variant="tag"는 pill(border-radius 9999px)이다. */
export const TagIsPillShaped: TStory = {
  args: { variant: "tag" },
  play: async ({ canvas }) => {
    const badge = canvas.getByText("친절함");
    await expect(getComputedStyle(badge).borderRadius).toBe("9999px");
  },
};

/** AC3: variant="warning"의 글자색은 --color-rating (#8a5a0f → rgb(138, 90, 15)). */
export const WarningUsesRatingColor: TStory = {
  args: { variant: "warning", children: "위치 정보 정확도가 낮을 수 있어요" },
  play: async ({ canvas }) => {
    const badge = canvas.getByText("위치 정보 정확도가 낮을 수 있어요");
    await expect(getComputedStyle(badge).color).toBe("rgb(138, 90, 15)");
  },
};

/** AC4: Badge는 버튼이 아니다 — role=button / aria-pressed 없음. */
export const IsNotAButton: TStory = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
    const badge = canvas.getByText("친절함");
    await expect(badge).not.toHaveAttribute("aria-pressed");
  },
};
