import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";

import { PhotoUploader } from "./PhotoUploader";

/** 1×1 투명 GIF — 네트워크 없이 img를 렌더하기 위한 픽스처. */
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const TWO_ITEMS = [
  { id: "kept-1", src: PIXEL, alt: "첨부 사진 1" },
  { id: "new-2", src: PIXEL, alt: "첨부 사진 2" },
];

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const meta = {
  title: "DesignSystem/Molecules/PhotoUploader",
  component: PhotoUploader,
  tags: ["autodocs"],
  args: {
    items: TWO_ITEMS,
    max: 3,
    accept: ACCEPT,
    onAdd: fn(),
    onRemove: fn(),
  },
} satisfies Meta<typeof PhotoUploader>;

export default meta;
type TStory = StoryObj<typeof meta>;

export const Default: TStory = {};
export const Full: TStory = {
  args: {
    items: [
      ...TWO_ITEMS,
      { id: "new-3", src: PIXEL, alt: "첨부 사진 3" },
    ],
    max: 3,
  },
};

/** AC20: items 개수만큼 미리보기가 있고 삭제 버튼 이름은 "사진 N 삭제". */
export const PreviewsAndRemoveLabels: TStory = {
  play: async ({ canvas }) => {
    await expect(canvas.getByAltText("첨부 사진 1")).toBeInTheDocument();
    await expect(canvas.getByAltText("첨부 사진 2")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "사진 1 삭제" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "사진 2 삭제" })).toBeInTheDocument();
  },
};

/** AC21: 삭제 버튼을 클릭하면 onRemove(item.id)가 1회 호출된다. */
export const RemoveCallsOnRemoveWithId: TStory = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "사진 1 삭제" }));
    await expect(args.onRemove).toHaveBeenCalledTimes(1);
    await expect(args.onRemove).toHaveBeenCalledWith("kept-1");
  },
};

/** AC22: items.length < max이면 사진 추가 file input이 accept·multiple을 갖는다. */
export const AddInputPresentWhenBelowMax: TStory = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("사진 추가") as HTMLInputElement;
    await expect(input).toHaveAttribute("type", "file");
    await expect(input).toHaveAttribute("accept", ACCEPT);
    await expect(input.multiple).toBe(true);
  },
};

/** AC23: items.length >= max이면 사진 추가 file input이 없다. */
export const AddInputHiddenWhenAtMax: TStory = {
  args: {
    items: [
      ...TWO_ITEMS,
      { id: "new-3", src: PIXEL, alt: "첨부 사진 3" },
    ],
    max: 3,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText("사진 추가")).not.toBeInTheDocument();
  },
};

/** AC24: 삭제 버튼은 Button size=icon(18×18). item은 relative, 버튼 top/right -6px. */
export const RemoveButtonIsIconPositioned: TStory = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "사진 1 삭제" });
    const buttonStyle = getComputedStyle(button);
    await expect(buttonStyle.width).toBe("18px");
    await expect(buttonStyle.height).toBe("18px");
    await expect(buttonStyle.top).toBe("-6px");
    await expect(buttonStyle.right).toBe("-6px");
    const item = button.parentElement;
    await expect(item).not.toBeNull();
    await expect(getComputedStyle(item as HTMLElement).position).toBe("relative");
  },
};

/**
 * design-system-review-organisms AC1~3: item.removeLabel을 넘기면 인덱스 기반
 * 기본 라벨("사진 N 삭제") 대신 그 값이 삭제 버튼 접근 이름이 된다. MyReviewItem이
 * 기존/새 사진 두 리스트를 하나로 합칠 때 전역 인덱스로는 "새 사진 1 삭제"를 만들
 * 수 없어서 필요해진 확장이다.
 */
export const RemoveLabelOverride: TStory = {
  args: {
    items: [
      { id: "kept-1", src: PIXEL, alt: "기존 사진 1", removeLabel: "기존 사진 1 삭제" },
      { id: "new-1", src: PIXEL, alt: "새 사진 1", removeLabel: "새 사진 1 삭제" },
    ],
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "기존 사진 1 삭제" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "새 사진 1 삭제" }),
    ).toBeInTheDocument();
  },
};
