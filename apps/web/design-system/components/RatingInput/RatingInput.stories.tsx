import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";

import { RatingInput } from "./RatingInput";

const meta = {
  title: "DesignSystem/Molecules/RatingInput",
  component: RatingInput,
  tags: ["autodocs"],
  args: { name: "rating", value: 3, onChange: fn() },
} satisfies Meta<typeof RatingInput>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};

/** AC5: role="radiogroup"이고 aria-label이 "별점"이다. */
export const IsNamedRadiogroup: TStory = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole("radiogroup", { name: "별점" });
    await expect(group).toBeInTheDocument();
  },
};

/** AC6: radio 5개가 있고 각 aria-label이 "1점"…"5점"이다. */
export const HasFiveRadiosLabeledByScore: TStory = {
  play: async ({ canvas }) => {
    const radios = canvas.getAllByRole("radio");
    await expect(radios).toHaveLength(5);
    for (const score of [1, 2, 3, 4, 5]) {
      await expect(canvas.getByRole("radio", { name: `${score}점` })).toBeInTheDocument();
    }
  },
};

/** AC7: value=3이면 3점 radio만 checked이다. */
export const ValueThreeChecksOnlyThree: TStory = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "3점" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "1점" })).not.toBeChecked();
    await expect(canvas.getByRole("radio", { name: "5점" })).not.toBeChecked();
  },
};

/** AC8: 4점 radio를 클릭하면 onChange(4)가 1회 호출된다. */
export const ClickFourCallsOnChange: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "4점" }));
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(4);
  },
};

/** AC9: name이 다른 두 그룹은 서로 독립적으로 checked 상태를 유지한다. */
export const SeparateNamesDoNotInterfere: TStory = {
  render: () => (
    <>
      <RatingInput name="rating-a" value={2} onChange={fn()} />
      <RatingInput name="rating-b" value={5} onChange={fn()} />
    </>
  ),
  play: async ({ canvas }) => {
    const groups = canvas.getAllByRole("radiogroup", { name: "별점" });
    await expect(groups).toHaveLength(2);
    const first = within(groups[0] as HTMLElement);
    const second = within(groups[1] as HTMLElement);
    await expect(first.getByRole("radio", { name: "2점" })).toBeChecked();
    await expect(first.getByRole("radio", { name: "5점" })).not.toBeChecked();
    await expect(second.getByRole("radio", { name: "5점" })).toBeChecked();
    await expect(second.getByRole("radio", { name: "2점" })).not.toBeChecked();
  },
};
