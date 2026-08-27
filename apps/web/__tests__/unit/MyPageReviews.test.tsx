import type { TMyReview } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MyPageReviewsPage from "../../app/mypage/reviews/page";

const { useMyReviews } = vi.hoisted(() => ({ useMyReviews: vi.fn() }));
vi.mock("../../hooks/useMyReviews", () => ({ useMyReviews }));

const REVIEW: TMyReview = {
  id: "review-1",
  officeId: "office-1",
  officeName: "분당공인중개사사무소",
  rating: 4,
  content: "친절하고 꼼꼼하게 설명해주셨어요",
  author: { nickname: "홍길동", profileImageUrl: null },
  createdAt: "2026-08-01T00:00:00.000Z",
  dealType: null,
  dealResult: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
  helpfulCount: 0,
  isHelpful: null,
  isHidden: false,
};

describe("MyPageReviewsPage", () => {
  beforeEach(() => {
    useMyReviews.mockReset();
  });

  it("AC17: 사무소 이름·별점·본문이 보인다", () => {
    useMyReviews.mockReturnValue({
      reviews: [REVIEW],
      nextCursor: null,
      isLoading: false,
      error: null,
      loadMore: vi.fn(),
    });

    render(<MyPageReviewsPage />);

    expect(screen.getByText("분당공인중개사사무소")).toBeInTheDocument();
    expect(screen.getByText("친절하고 꼼꼼하게 설명해주셨어요")).toBeInTheDocument();
    expect(screen.getByLabelText("4점")).toBeInTheDocument();
  });

  it("AC17: 숨겨진 리뷰는 숨김 표시가 함께 보인다", () => {
    useMyReviews.mockReturnValue({
      reviews: [{ ...REVIEW, isHidden: true }],
      nextCursor: null,
      isLoading: false,
      error: null,
      loadMore: vi.fn(),
    });

    render(<MyPageReviewsPage />);

    expect(screen.getByText("신고 누적으로 숨김")).toBeInTheDocument();
  });

  it("AC18: 리뷰가 없으면 빈 상태 문구가 보인다", () => {
    useMyReviews.mockReturnValue({
      reviews: [],
      nextCursor: null,
      isLoading: false,
      error: null,
      loadMore: vi.fn(),
    });

    render(<MyPageReviewsPage />);

    expect(screen.getByText("아직 작성한 리뷰가 없습니다")).toBeInTheDocument();
  });

  it("AC17: nextCursor가 있으면 더보기 버튼이 있고 누르면 loadMore가 호출된다", async () => {
    const loadMore = vi.fn();
    useMyReviews.mockReturnValue({
      reviews: [REVIEW],
      nextCursor: "cursor-1",
      isLoading: false,
      error: null,
      loadMore,
    });
    const user = userEvent.setup();

    render(<MyPageReviewsPage />);
    await user.click(screen.getByRole("button", { name: "더보기" }));

    expect(loadMore).toHaveBeenCalled();
  });
});
