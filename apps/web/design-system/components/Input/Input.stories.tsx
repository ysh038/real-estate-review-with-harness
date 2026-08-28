import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { Input } from "./Input";

const meta = {
  title: "DesignSystem/Atoms/Input",
  component: Input,
  tags: ["autodocs"],
  args: { label: "방문 연도", value: "", onChange: fn() },
} satisfies Meta<typeof Input>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Text: TStory = { args: { type: "text", label: "사무소 이름·주소 검색" } };
export const Number: TStory = { args: { type: "number", label: "방문 연도" } };

/**
 * AC16: width="narrow"면 yearInput과 같은 6em 폭을 갖는다.
 * getComputedStyle은 항상 계산값(px)을 돌려준다 — 기본 16px 폰트 기준
 * 6em = 96px(브라우저 계산 결과, "6em" 문자열이 아니다).
 */
export const NarrowWidthMatchesYearInput: TStory = {
  args: { type: "number", width: "narrow" },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "방문 연도" });
    await expect(getComputedStyle(input).width).toBe("96px");
  },
};

/** width를 안 주면(기본 auto) 6em(96px)으로 좁아지지 않는다. */
export const DefaultWidthIsNotNarrow: TStory = {
  args: { type: "number" },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "방문 연도" });
    await expect(getComputedStyle(input).width).not.toBe("96px");
  },
};

/** 값을 입력하면 onChange가 호출된다. */
export const TypingCallsOnChange: TStory = {
  args: { type: "text", label: "사무소 이름·주소 검색" },
  play: async ({ canvas, userEvent, args }) => {
    const input = canvas.getByRole("textbox", { name: "사무소 이름·주소 검색" });
    await userEvent.type(input, "a");
    await expect(args.onChange).toHaveBeenCalled();
  },
};

export const KeyboardFocusable: TStory = {
  args: { type: "number" },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("spinbutton", { name: "방문 연도" });
    input.focus();
    await expect(input).toHaveFocus();
  },
};
