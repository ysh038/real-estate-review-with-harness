import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { TextArea } from "./TextArea";

const meta = {
  title: "DesignSystem/Atoms/TextArea",
  component: TextArea,
  tags: ["autodocs"],
  args: {
    value: "",
    onChange: fn(),
    placeholder: "이용 경험을 10자 이상 남겨주세요",
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};
export const Filled: TStory = { args: { value: "친절하고 꼼꼼했어요" } };

/** AC15: resize: vertical과 최소 높이를 갖는다. */
export const HasVerticalResizeAndMinHeight: TStory = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox");
    const style = getComputedStyle(textarea);
    await expect(style.resize).toBe("vertical");
    await expect(Number.parseInt(style.minHeight, 10)).toBeGreaterThan(0);
  },
};

/** 입력하면 onChange가 호출된다. */
export const TypingCallsOnChange: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    const textarea = canvas.getByRole("textbox");
    await userEvent.type(textarea, "a");
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const KeyboardFocusable: TStory = {
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox");
    textarea.focus();
    await expect(textarea).toHaveFocus();
  },
};
