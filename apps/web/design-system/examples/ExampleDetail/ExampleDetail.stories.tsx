import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { ExampleDetail } from "./ExampleDetail";

const FIELDS = [
  { label: "대표자명", value: "홍길동" },
  { label: "주소", value: "경기도 성남시 분당구" },
  { label: "전화번호", value: "정보 없음" },
];

const meta = {
  title: "DesignSystem/Examples/ExampleDetail",
  component: ExampleDetail,
  tags: ["autodocs"],
} satisfies Meta<typeof ExampleDetail>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {
  args: {
    title: "분당공인중개사사무소",
    fields: FIELDS,
    onClose: fn(),
  },
};

export const WithStatus: TStory = {
  args: {
    title: "분당공인중개사사무소",
    status: { label: "위치 정확도 낮음", tone: "warning" },
    fields: FIELDS,
    onClose: fn(),
  },
};

// 청기와 팔레트로 --color-info 대비비 미달을 해소해 다시 렌더한다(design-system 감사).
export const WithInfoStatus: TStory = {
  args: {
    title: "정자동 하나공인중개사",
    status: { label: "개설등록 확인", tone: "info" },
    fields: FIELDS,
    onClose: fn(),
  },
};

export const Interaction: TStory = {
  args: {
    title: "분당공인중개사사무소",
    fields: FIELDS,
    onClose: fn(),
  },
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByText("대표자명")).toBeInTheDocument();
    await expect(canvas.getByText("홍길동")).toBeInTheDocument();

    const closeButton = canvas.getByRole("button", { name: "닫기" });
    await userEvent.tab();
    await expect(closeButton).toHaveFocus();

    await userEvent.click(closeButton);
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};
