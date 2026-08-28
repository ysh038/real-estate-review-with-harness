import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef } from "react";
import { expect, fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
  title: "DesignSystem/Atoms/Button",
  component: Button,
  tags: ["autodocs"],
  args: { onClick: fn(), children: "버튼" },
} satisfies Meta<typeof Button>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Primary: TStory = { args: { variant: "primary", children: "등록" } };
export const Ghost: TStory = { args: { variant: "ghost", children: "취소" } };
export const Outline: TStory = { args: { variant: "outline", children: "새로 작성" } };
export const Danger: TStory = { args: { variant: "danger", children: "탈퇴" } };
export const Overlay: TStory = { args: { variant: "overlay", children: "×" } };

/** AC1: variant 5종이 서로 다른 클래스를 적용한다. */
export const AllVariantsHaveDistinctClasses: TStory = {
  render: (args) => (
    <>
      <Button {...args} variant="primary">
        primary
      </Button>
      <Button {...args} variant="ghost">
        ghost
      </Button>
      <Button {...args} variant="outline">
        outline
      </Button>
      <Button {...args} variant="danger">
        danger
      </Button>
      <Button {...args} variant="overlay">
        overlay
      </Button>
    </>
  ),
  play: async ({ canvas }) => {
    const names = ["primary", "ghost", "outline", "danger", "overlay"];
    const classNames = names.map(
      (name) => canvas.getByRole("button", { name }).className,
    );
    await expect(new Set(classNames).size).toBe(names.length);
  },
};

/** AC1: size 4종이 서로 다른 클래스를 적용한다. */
export const AllSizesHaveDistinctClasses: TStory = {
  render: (args) => (
    <>
      <Button {...args} size="sm">
        sm
      </Button>
      <Button {...args} size="md">
        md
      </Button>
      <Button {...args} size="lg">
        lg
      </Button>
      <Button {...args} size="icon">
        +
      </Button>
    </>
  ),
  play: async ({ canvas }) => {
    const names = ["sm", "md", "lg", "+"];
    const classNames = names.map(
      (name) => canvas.getByRole("button", { name }).className,
    );
    await expect(new Set(classNames).size).toBe(names.length);
  },
};

/** AC4: size=lg는 터치 타깃 44px를 확보한다. */
export const LargeMeetsTouchTarget: TStory = {
  args: { size: "lg", children: "등록" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "등록" });
    await expect(getComputedStyle(button).minHeight).toBe("44px");
  },
};

/** AC2: disabled면 클릭 핸들러가 호출되지 않는다. */
export const Disabled: TStory = {
  args: { disabled: true, children: "등록 중..." },
  play: async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole("button", { name: "등록 중..." });
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** AC5: type을 생략하면 기본값은 button이다(폼 안에서 의도치 않은 submit 방지). */
export const DefaultTypeIsButton: TStory = {
  args: { children: "클릭" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "클릭" });
    await expect(button).toHaveAttribute("type", "button");
  },
};

/** AC3: 키보드로 포커스 가능해야 focus-visible 아웃라인 검증의 전제가 성립한다. */
export const KeyboardFocusable: TStory = {
  args: { children: "포커스" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "포커스" });
    button.focus();
    await expect(button).toHaveFocus();
  },
};

const RefFocusHarness = () => {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={ref}>대상</Button>
      <button type="button" onClick={() => ref.current?.focus()}>
        ref로 포커스
      </button>
    </>
  );
};

/**
 * design-system-remaining-organisms AC4~5: ref를 넘기면 실제 <button> DOM 노드를
 * 가리킨다. OfficeDetailPanel이 마운트 시 닫기 버튼에 포커스를 옮기는 데 필요하다.
 */
export const RefAttachesToButtonElement: TStory = {
  render: () => <RefFocusHarness />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "ref로 포커스" }));
    await expect(canvas.getByRole("button", { name: "대상" })).toHaveFocus();
  },
};
