import type { TMyReview } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyReviewsPanel } from "../../components/MyReviewsPanel";

const { useMyReviews } = vi.hoisted(() => ({ useMyReviews: vi.fn() }));
vi.mock("../../hooks/useMyReviews", () => ({ useMyReviews }));

const REVIEW: TMyReview = {
  id: "00000000-0000-4000-8000-000000000001",
  officeId: "office-1",
  officeName: "분당공인중개사사무소",
  rating: 5,
  content: "친절하고 설명이 자세했어요",
  author: { nickname: "홍길동", profileImageUrl: null },
  createdAt: "2026-08-21T00:00:00.000Z",
  isHidden: false,
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  helpfulCount: 0,
  isHelpful: false,
};

const baseHookState = {
  reviews: [REVIEW],
  nextCursor: null as string | null,
  isLoading: false,
  error: null as Error | null,
  loadMore: vi.fn(),
};

describe("MyReviewsPanel", () => {
  beforeEach(() => {
    useMyReviews.mockReset().mockReturnValue({ ...baseHookState });
  });

  it("AC10: 사무소 이름·별점·본문이 보인다", () => {
    render(<MyReviewsPanel onClose={vi.fn()} />);

    expect(screen.getByText("분당공인중개사사무소")).toBeInTheDocument();
    expect(screen.getByText(REVIEW.content)).toBeInTheDocument();
    expect(screen.getByLabelText("5점")).toBeInTheDocument();
  });

  it("AC11: 리뷰가 없으면 빈 상태 문구가 보인다", () => {
    useMyReviews.mockReturnValue({ ...baseHookState, reviews: [] });

    render(<MyReviewsPanel onClose={vi.fn()} />);

    expect(screen.getByText(/아직 작성한 리뷰가 없습니다/)).toBeInTheDocument();
  });

  it("AC12: 숨겨진 리뷰는 숨김 표시가 함께 보인다", () => {
    useMyReviews.mockReturnValue({
      ...baseHookState,
      reviews: [{ ...REVIEW, isHidden: true }],
    });

    render(<MyReviewsPanel onClose={vi.fn()} />);

    expect(screen.getByText(/신고 누적으로 숨김/)).toBeInTheDocument();
  });

  it("AC13: nextCursor가 있으면 더보기 버튼이 보이고 누르면 loadMore가 호출된다", async () => {
    const loadMore = vi.fn();
    useMyReviews.mockReturnValue({
      ...baseHookState,
      nextCursor: "cursor-1",
      loadMore,
    });
    const user = userEvent.setup();

    render(<MyReviewsPanel onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "더보기" }));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("AC14: role=dialog·aria-modal이고 열리면 포커스가 닫기 버튼으로 이동한다", () => {
    render(<MyReviewsPanel onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
  });

  it("AC14: 닫기 버튼을 누르면 onClose가 호출된다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<MyReviewsPanel onClose={handleClose} />);

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AC14: ESC를 누르면 onClose가 호출된다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<MyReviewsPanel onClose={handleClose} />);

    await user.keyboard("{Escape}");

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AC14: 배경(백드롭)을 클릭하면 onClose가 호출된다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<MyReviewsPanel onClose={handleClose} />);

    // 패널(다이얼로그) 바깥, 백드롭 자체를 클릭한다.
    await user.click(screen.getByTestId("my-reviews-backdrop"));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AC14: 패널 안쪽을 클릭해도 onClose가 호출되지 않는다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<MyReviewsPanel onClose={handleClose} />);

    await user.click(screen.getByRole("dialog"));

    expect(handleClose).not.toHaveBeenCalled();
  });
});
