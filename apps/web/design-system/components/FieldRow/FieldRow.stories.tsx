import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { FieldRow } from "./FieldRow";

const meta = {
  title: "DesignSystem/Atoms/FieldRow",
  component: FieldRow,
  tags: ["autodocs"],
  args: { label: "대표자명", value: "홍길동", fallback: "정보 없음" },
  // FieldRow는 <dt>/<dd>만 그린다 — 감싸는 <dl>은 사용하는 쪽 책임이다(설계 메모).
  // 스토리 단독 렌더에서는 그 전제가 깨져 axe가 "dt/dd는 dl 안에 있어야 한다"고
  // 잡으므로, 실제 사용 맥락과 같은 <dl> 컨테이너를 데코레이터로 제공한다.
  decorators: [(Story) => <dl>{Story()}</dl>],
} satisfies Meta<typeof FieldRow>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const WithValue: TStory = {};

/** AC19: label과 값이 한 줄로 보인다. */
export const RendersLabelAndValue: TStory = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("대표자명")).toBeInTheDocument();
    await expect(canvas.getByText("홍길동")).toBeInTheDocument();
  },
};

/** AC20: value가 null이면 fallback 문구가 보인다. */
export const NullValueShowsFallback: TStory = {
  args: { value: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("정보 없음")).toBeInTheDocument();
    await expect(canvas.queryByText("홍길동")).not.toBeInTheDocument();
  },
};

/** AC20: value가 빈 문자열이어도 fallback 문구가 보인다. */
export const EmptyStringValueShowsFallback: TStory = {
  args: { value: "" },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("정보 없음")).toBeInTheDocument();
  },
};

/** AC20: value가 undefined여도 fallback 문구가 보인다. */
export const UndefinedValueShowsFallback: TStory = {
  args: { value: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("정보 없음")).toBeInTheDocument();
  },
};
