import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { LinkButton } from "./LinkButton";

const meta = {
  title: "DesignSystem/Atoms/LinkButton",
  component: LinkButton,
  tags: ["autodocs"],
  args: { href: "https://example.com", children: "링크 버튼" },
} satisfies Meta<typeof LinkButton>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Primary: TStory = { args: { variant: "primary", children: "이메일로 문의" } };
export const Ghost: TStory = { args: { variant: "ghost", children: "GitHub Issues 열기" } };

/** AC7: <a href>로 렌더된다. */
export const RendersAsAnchor: TStory = {
  args: { children: "링크" },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "링크" });
    await expect(link.tagName).toBe("A");
    await expect(link).toHaveAttribute("href", "https://example.com");
  },
};

/** AC8: external이면 target=_blank와 rel=noopener noreferrer가 함께 붙는다. */
export const ExternalSetsTargetAndRel: TStory = {
  args: { external: true, children: "새 창으로 열기" },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "새 창으로 열기" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  },
};

/** external을 안 주면 target/rel이 없어야 한다(같은 탭 이동, mailto: 등). */
export const NotExternalHasNoTargetOrRel: TStory = {
  args: { children: "같은 탭" },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "같은 탭" });
    await expect(link).not.toHaveAttribute("target");
    await expect(link).not.toHaveAttribute("rel");
  },
};

/** AC1과 같은 규칙: variant가 다르면 클래스도 다르다. */
export const VariantsHaveDistinctClasses: TStory = {
  render: (args) => (
    <>
      <LinkButton {...args} variant="primary">
        primary
      </LinkButton>
      <LinkButton {...args} variant="ghost">
        ghost
      </LinkButton>
    </>
  ),
  play: async ({ canvas }) => {
    const primary = canvas.getByRole("link", { name: "primary" }).className;
    const ghost = canvas.getByRole("link", { name: "ghost" }).className;
    await expect(primary).not.toBe(ghost);
  },
};

export const KeyboardFocusable: TStory = {
  args: { children: "포커스" },
  play: async ({ canvas }) => {
    const link = canvas.getByRole("link", { name: "포커스" });
    link.focus();
    await expect(link).toHaveFocus();
  },
};
