import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { FormError } from "./FormError";

const meta = {
  title: "DesignSystem/Molecules/FormError",
  component: FormError,
  tags: ["autodocs"],
  args: { children: "내용을 10자 이상 입력해 주세요" },
} satisfies Meta<typeof FormError>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};

/** AC25: role="alert"인 문단으로 children을 그대로 보여준다. */
export const HasAlertRole: TStory = {
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert.tagName).toBe("P");
    await expect(alert).toHaveTextContent("내용을 10자 이상 입력해 주세요");
  },
};

/** AC26: 글자색이 --color-error (#b3261e → rgb(179, 38, 30)). */
export const UsesErrorColor: TStory = {
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(getComputedStyle(alert).color).toBe("rgb(179, 38, 30)");
  },
};
