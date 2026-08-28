import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { RatingDisplay } from "./RatingDisplay";

const meta = {
  title: "DesignSystem/Molecules/RatingDisplay",
  component: RatingDisplay,
  tags: ["autodocs"],
  args: { value: 4 },
} satisfies Meta<typeof RatingDisplay>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};
export const Full: TStory = { args: { value: 5 } };
export const Empty: TStory = { args: { value: 1 } };

/** AC10: value=4이면 접근 이름이 "4점"이고 ★4 + ☆1. */
export const FourStarsAccessibleName: TStory = {
  play: async ({ canvas }) => {
    const display = canvas.getByLabelText("4점");
    await expect(display).toHaveTextContent("★★★★☆");
  },
};

/** AC11: 글자색이 --color-rating (#8a5a0f → rgb(138, 90, 15)). */
export const UsesRatingColor: TStory = {
  play: async ({ canvas }) => {
    const display = canvas.getByLabelText("4점");
    await expect(getComputedStyle(display).color).toBe("rgb(138, 90, 15)");
  },
};
