import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { ExampleTable, type IExampleTableRow } from "./ExampleTable";

const ROWS: IExampleTableRow[] = [
  { id: "1", name: "성남시 시딩", status: "success", updatedAt: "2026-08-15" },
  { id: "2", name: "판교 지역 지오코딩", status: "warning", updatedAt: "2026-08-20" },
  { id: "3", name: "전국 데이터 소스", status: "error", updatedAt: "2026-08-27" },
  // 청기와 팔레트로 --color-info 대비비 미달을 해소해 다시 렌더한다(design-system 감사).
  { id: "4", name: "카카오 Places 카테고리 필터", status: "info", updatedAt: "2026-08-28" },
];

const meta = {
  title: "DesignSystem/Examples/ExampleTable",
  component: ExampleTable,
  tags: ["autodocs"],
} satisfies Meta<typeof ExampleTable>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {
  args: {
    caption: "시딩 작업 현황",
    rows: ROWS,
    emptyMessage: "표시할 항목이 없습니다",
  },
};

export const Empty: TStory = {
  args: {
    caption: "시딩 작업 현황",
    rows: [],
    emptyMessage: "표시할 항목이 없습니다",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("표시할 항목이 없습니다")).toBeInTheDocument();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
  },
};

export const Interaction: TStory = {
  args: {
    caption: "시딩 작업 현황",
    rows: ROWS,
    emptyMessage: "표시할 항목이 없습니다",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const table = canvas.getByRole("table", { name: "시딩 작업 현황" });
    const headers = within(table).getAllByRole("columnheader");

    await expect(headers.map((cell) => cell.textContent)).toEqual([
      "이름",
      "상태",
      "갱신일",
    ]);
    await expect(canvas.getByText("오류")).toBeInTheDocument();
    await expect(canvas.getByText("안내")).toBeInTheDocument();
  },
};
