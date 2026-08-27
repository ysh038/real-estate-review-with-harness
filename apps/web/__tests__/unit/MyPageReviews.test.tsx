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
  expertise: null,
  defectResponse: null,
  visitedYear: null,
  visitedMonth: null,
  tags: [],
  photos: [],
  helpfulCount: 0,
  isHelpful: null,
  isHidden: false,
};

const baseHookState = {
  reviews: [] as TMyReview[],
  nextCursor: null as string | null,
  isLoading: false,
  error: null as Error | null,
  loadMore: vi.fn(),
  updateReview: vi.fn().mockResolvedValue(undefined),
  deleteReview: vi.fn().mockResolvedValue(undefined),
};

describe("MyPageReviewsPage", () => {
  beforeEach(() => {
    useMyReviews.mockReset().mockReturnValue({ ...baseHookState });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("AC17: 사무소 이름·별점·본문이 보인다", () => {
    useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW] });

    render(<MyPageReviewsPage />);

    expect(screen.getByText("분당공인중개사사무소")).toBeInTheDocument();
    expect(screen.getByText("친절하고 꼼꼼하게 설명해주셨어요")).toBeInTheDocument();
    expect(screen.getByLabelText("4점")).toBeInTheDocument();
  });

  it("AC17: 숨겨진 리뷰는 숨김 표시가 함께 보인다", () => {
    useMyReviews.mockReturnValue({
      ...baseHookState,
      reviews: [{ ...REVIEW, isHidden: true }],
    });

    render(<MyPageReviewsPage />);

    expect(screen.getByText("신고 누적으로 숨김")).toBeInTheDocument();
  });

  it("AC18: 리뷰가 없으면 빈 상태 문구가 보인다", () => {
    render(<MyPageReviewsPage />);

    expect(screen.getByText("아직 작성한 리뷰가 없습니다")).toBeInTheDocument();
  });

  it("AC6(review-ux-consistency-and-draft): 로딩 중에는 스켈레톤이 보인다", () => {
    useMyReviews.mockReturnValue({ ...baseHookState, isLoading: true });

    const { container } = render(<MyPageReviewsPage />);

    expect(
      container.querySelectorAll("[data-testid='review-skeleton-card']"),
    ).toHaveLength(3);
  });

  it("AC6(review-ux-consistency-and-draft): 조회 실패 시 에러 상태가 role=alert로 보인다", () => {
    useMyReviews.mockReturnValue({
      ...baseHookState,
      error: new Error("network fail"),
    });

    render(<MyPageReviewsPage />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "리뷰를 불러오지 못했습니다",
    );
  });

  it("AC17: nextCursor가 있으면 더보기 버튼이 있고 누르면 loadMore가 호출된다", async () => {
    const loadMore = vi.fn();
    useMyReviews.mockReturnValue({
      ...baseHookState,
      reviews: [REVIEW],
      nextCursor: "cursor-1",
      loadMore,
    });
    const user = userEvent.setup();

    render(<MyPageReviewsPage />);
    await user.click(screen.getByRole("button", { name: "더보기" }));

    expect(loadMore).toHaveBeenCalled();
  });

  describe("수정·삭제 (review-edit-and-delete-ui)", () => {
    it("AC5: 리뷰 항목마다 수정·삭제 버튼이 보인다", () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW] });

      render(<MyPageReviewsPage />);

      expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    });

    it("AC13: 숨겨진 리뷰도 수정·삭제 버튼이 동일하게 보인다", () => {
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [{ ...REVIEW, isHidden: true }],
      });

      render(<MyPageReviewsPage />);

      expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    });

    it("AC6: 삭제 확인 승인 시 deleteReview가 호출된다", async () => {
      const deleteReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        deleteReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "삭제" }));

      expect(deleteReview).toHaveBeenCalledWith("review-1");
    });

    it("AC6: 삭제 확인을 취소하면 deleteReview가 호출되지 않는다", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const deleteReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        deleteReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "삭제" }));

      expect(deleteReview).not.toHaveBeenCalled();
    });

    it("AC7: 삭제 요청이 실패하면 에러 문구가 보이고 목록은 유지된다", async () => {
      const deleteReview = vi.fn().mockRejectedValue(new Error("삭제 실패"));
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        deleteReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "삭제" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("삭제 실패");
      expect(screen.getByText("분당공인중개사사무소")).toBeInTheDocument();
    });

    it("AC8: 수정 클릭 시 기존 값이 채워진 편집 폼이 보인다", async () => {
      const REVIEW_WITH_VALUES: TMyReview = {
        ...REVIEW,
        dealType: "전세",
        dealResult: "계약함",
        expertise: "전문적이었음",
        defectResponse: "원만히 해결됨",
        visitedYear: 2026,
        visitedMonth: 3,
        tags: ["친절함"],
      };
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_VALUES],
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));

      expect(screen.getByRole("textbox")).toHaveValue(
        REVIEW.content,
      );
      expect(screen.getByRole("radio", { name: "4점" })).toBeChecked();
      expect(
        screen.getByRole("combobox", { name: "거래유형" }),
      ).toHaveValue("전세");
      expect(
        screen.getByRole("combobox", { name: "거래결과" }),
      ).toHaveValue("계약함");
      expect(screen.getByRole("combobox", { name: "전문성" })).toHaveValue(
        "전문적이었음",
      );
      expect(
        screen.getByRole("combobox", { name: "하자 대응" }),
      ).toHaveValue("원만히 해결됨");
      expect(
        screen.getByRole("spinbutton", { name: "방문 연도" }),
      ).toHaveValue(2026);
      expect(screen.getByRole("combobox", { name: "방문 월" })).toHaveValue(
        "3",
      );
      expect(
        screen.getByRole("button", { name: "친절함", pressed: true }),
      ).toBeInTheDocument();
    });

    it("AC9: 취소를 누르면 원래 표시로 돌아가고 updateReview는 호출되지 않는다", async () => {
      const updateReview = vi.fn();
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(screen.getByText(REVIEW.content)).toBeInTheDocument();
      expect(updateReview).not.toHaveBeenCalled();
    });

    it("AC10: 본문을 10자 미만으로 바꾸고 저장하면 에러가 보이고 요청이 안 나간다", async () => {
      const updateReview = vi.fn();
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      const textbox = screen.getByRole("textbox");
      await user.clear(textbox);
      await user.type(textbox, "짧음");
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(updateReview).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/10자/);
    });

    it("AC11: 값을 바꾸고 저장하면 새 값으로 updateReview가 호출되고 편집 모드가 닫힌다", async () => {
      const updateReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("radio", { name: "5점" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(updateReview).toHaveBeenCalledWith("review-1", {
        rating: 5,
        content: REVIEW.content,
        photoKeys: [],
      });
      expect(
        await screen.findByRole("button", { name: "수정" }),
      ).toBeInTheDocument();
    });

    it("AC11: 사진이 있던 리뷰를 저장하면 photoKeys에 기존 사진이 그대로 실려간다", async () => {
      const REVIEW_WITH_PHOTOS: TMyReview = {
        ...REVIEW,
        photos: [{ storageKey: "reviews/existing.jpg", url: "https://example.com/existing.jpg" }],
      };
      const updateReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_PHOTOS],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(updateReview).toHaveBeenCalledWith(
        "review-1",
        expect.objectContaining({ photoKeys: ["reviews/existing.jpg"] }),
      );
    });

    it("AC12: 저장이 실패하면 에러가 보이고 편집 폼은 입력값을 유지한 채 열려 있다", async () => {
      const updateReview = vi.fn().mockRejectedValue(new Error("이미 신고된 리뷰입니다"));
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "이미 신고된 리뷰입니다",
      );
      expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    });
  });

  describe("사진 변경 (review-edit-photo-changes)", () => {
    const REVIEW_WITH_PHOTOS: TMyReview = {
      ...REVIEW,
      photos: [
        { storageKey: "reviews/existing-1.jpg", url: "https://example.com/existing-1.jpg" },
        { storageKey: "reviews/existing-2.jpg", url: "https://example.com/existing-2.jpg" },
      ],
    };

    it("AC4: 편집 진입 시 기존 사진이 각각 제거 버튼과 함께 썸네일로 보인다", async () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW_WITH_PHOTOS] });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));

      expect(screen.getByAltText("기존 사진 1")).toHaveAttribute(
        "src",
        "https://example.com/existing-1.jpg",
      );
      expect(screen.getByAltText("기존 사진 2")).toHaveAttribute(
        "src",
        "https://example.com/existing-2.jpg",
      );
      expect(
        screen.getByRole("button", { name: "기존 사진 1 삭제" }),
      ).toBeInTheDocument();
    });

    it("AC5: 기존 사진의 제거 버튼을 누르면 미리보기에서 사라진다", async () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW_WITH_PHOTOS] });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "기존 사진 1 삭제" }));

      // 삭제 후 남은 한 장만 보인다(라벨은 다시 1번부터 매겨지므로 src로 식별).
      const remainingImages = screen.getAllByRole("img");
      expect(remainingImages).toHaveLength(1);
      expect(remainingImages[0]).toHaveAttribute(
        "src",
        "https://example.com/existing-2.jpg",
      );
    });

    it("AC6: 파일을 새로 선택하면 로컬 미리보기가 제거 버튼과 함께 추가된다", async () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW] });
      const user = userEvent.setup();
      const file = new File(["a"], "new.jpg", { type: "image/jpeg" });

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.upload(screen.getByLabelText("사진 추가"), file);

      expect(screen.getByAltText("새 사진 1")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "새 사진 1 삭제" }),
      ).toBeInTheDocument();
    });

    it("AC7: 기존+신규 합이 3장이 되면 '사진 추가' 입력이 사라진다", async () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW_WITH_PHOTOS] });
      const user = userEvent.setup();
      const file = new File(["a"], "new.jpg", { type: "image/jpeg" });

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      expect(screen.getByLabelText("사진 추가")).toBeInTheDocument();

      await user.upload(screen.getByLabelText("사진 추가"), file);

      expect(screen.queryByLabelText("사진 추가")).not.toBeInTheDocument();
    });

    it("AC8: 저장 시 새 파일을 업로드하고 photoKeys가 '남은 기존 + 신규' 순서로 채워진다", async () => {
      const updateReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_PHOTOS],
        updateReview,
      });
      const user = userEvent.setup();
      const file = new File(["a"], "new.jpg", { type: "image/jpeg" });

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "기존 사진 1 삭제" }));
      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(updateReview).toHaveBeenCalledWith(
        "review-1",
        expect.objectContaining({ photoKeys: ["reviews/existing-2.jpg"] }),
        [file],
      );
    });

    it("AC9: 취소를 누르면 사진 변경 내역도 원래대로 되돌아간다", async () => {
      useMyReviews.mockReturnValue({ ...baseHookState, reviews: [REVIEW_WITH_PHOTOS] });
      const user = userEvent.setup();
      const file = new File(["a"], "new.jpg", { type: "image/jpeg" });

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.click(screen.getByRole("button", { name: "기존 사진 1 삭제" }));
      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("button", { name: "취소" }));

      await user.click(screen.getByRole("button", { name: "수정" }));
      expect(screen.getByAltText("기존 사진 1")).toBeInTheDocument();
      expect(screen.queryByAltText("새 사진 1")).not.toBeInTheDocument();
    });

    it("AC10: 사진이 없던 리뷰는 기존 썸네일 없이 저장하면 photoKeys: []로 PATCH된다", async () => {
      const updateReview = vi.fn().mockResolvedValue(undefined);
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));

      expect(screen.queryByAltText(/기존 사진/)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(updateReview).toHaveBeenCalledWith("review-1", {
        rating: REVIEW.rating,
        content: REVIEW.content,
        photoKeys: [],
      });
    });

    it("AC11: 업로드가 실패하면 에러가 보이고 편집 폼이 사진 변경 내역을 유지한 채 열려 있다", async () => {
      const updateReview = vi.fn().mockRejectedValue(new Error("사진 업로드에 실패했습니다"));
      useMyReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW],
        updateReview,
      });
      const user = userEvent.setup();
      const file = new File(["a"], "new.jpg", { type: "image/jpeg" });

      render(<MyPageReviewsPage />);
      await user.click(screen.getByRole("button", { name: "수정" }));
      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByAltText("새 사진 1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
    });
  });
});
