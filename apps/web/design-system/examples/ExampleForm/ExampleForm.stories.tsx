import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";

import { ExampleForm } from "./ExampleForm";

const meta = {
  title: "DesignSystem/Examples/ExampleForm",
  component: ExampleForm,
  tags: ["autodocs"],
} satisfies Meta<typeof ExampleForm>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {
  args: {
    onSubmit: async () => {},
  },
};

export const Interaction: TStory = {
  args: {
    onSubmit: async () => {},
  },
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByLabelText("문의 내용");
    const button = canvas.getByRole("button", { name: "보내기" });

    // 짧은 입력은 거부된다.
    await userEvent.click(button);
    await expect(canvas.getByRole("alert")).toHaveTextContent("10자");

    // 키보드로 도달 가능해야 한다.
    textarea.focus();
    await expect(textarea).toHaveFocus();

    await userEvent.type(textarea, "충분히 긴 문의 내용입니다");
    await userEvent.click(button);
    await waitFor(() =>
      expect(canvas.queryByRole("alert")).not.toBeInTheDocument(),
    );
  },
};

export const SubmitFails: TStory = {
  args: {
    onSubmit: async () => {
      throw new Error("잠시 후 다시 시도해주세요");
    },
  },
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByLabelText("문의 내용");
    await userEvent.type(textarea, "충분히 긴 문의 내용입니다");
    await userEvent.click(canvas.getByRole("button", { name: "보내기" }));

    await waitFor(() =>
      expect(canvas.getByRole("alert")).toHaveTextContent(
        "잠시 후 다시 시도해주세요",
      ),
    );
  },
};
