import type { TOfficeDetailResponse, TReview } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewSection } from "../../components/ReviewSection";

const { useOfficeReviews } = vi.hoisted(() => ({
  useOfficeReviews: vi.fn(),
}));
vi.mock("../../hooks/useOfficeReviews", () => ({ useOfficeReviews }));

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("../../hooks/useSession", () => ({ useSession }));

const DETAIL: TOfficeDetailResponse = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  avgRating: 4.5,
  reviewCount: 1,
};

const REVIEW: TReview = {
  id: "00000000-0000-4000-8000-000000000001",
  officeId: "office-1",
  rating: 5,
  content: "친절하고 설명이 자세했어요",
  author: { nickname: "김철수", profileImageUrl: null },
  createdAt: "2026-08-21T00:00:00.000Z",
};

const baseHookState = {
  detail: DETAIL,
  reviews: [REVIEW],
  nextCursor: null as string | null,
  isLoading: false,
  error: null as Error | null,
  isSubmitting: false,
  submitError: null as Error | null,
  loadMore: vi.fn(),
  submitReview: vi.fn().mockResolvedValue(true),
};

const UNAUTHENTICATED_SESSION = {
  status: "unauthenticated" as const,
  user: null,
  logout: vi.fn(),
};

const AUTHENTICATED_SESSION = {
  status: "authenticated" as const,
  user: { id: "u-1", nickname: "홍길동", profileImageUrl: null },
  logout: vi.fn(),
};

describe("ReviewSection", () => {
  beforeEach(() => {
    useOfficeReviews.mockReset().mockReturnValue({ ...baseHookState });
    useSession.mockReset().mockReturnValue(UNAUTHENTICATED_SESSION);
  });

  it("AC8: 집계 헤더에 평균 평점과 리뷰 개수가 보인다", () => {
    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/1개/)).toBeInTheDocument();
  });

  it("AC9: 리뷰가 0건이면 빈 상태 문구가 보이고 평점 숫자는 없다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      detail: { ...DETAIL, avgRating: null, reviewCount: 0 },
      reviews: [],
    });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByText(/아직 리뷰가 없습니다/)).toBeInTheDocument();
  });

  it("AC10: 리뷰 항목에 작성자·별점·본문이 보인다", () => {
    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByText("김철수")).toBeInTheDocument();
    expect(screen.getByText(REVIEW.content)).toBeInTheDocument();
  });

  it("AC11: 로딩 중에는 로딩 상태가 보인다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      isLoading: true,
      detail: null,
      reviews: [],
    });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByText(/불러오는 중/)).toBeInTheDocument();
  });

  it("AC12: nextCursor가 있으면 더보기 버튼이 보이고 누르면 loadMore가 호출된다", async () => {
    const loadMore = vi.fn();
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      nextCursor: "cursor-1",
      loadMore,
    });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("button", { name: "더보기" }));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("AC13: 비로그인이면 작성 폼 대신 로그인 유도 문구가 보인다", () => {
    render(<ReviewSection officeId="office-1" />);

    expect(screen.queryByRole("button", { name: "등록" })).not.toBeInTheDocument();
    expect(screen.getByText(/로그인하면 리뷰를 남길 수 있어요/)).toBeInTheDocument();
  });

  it("AC14: 로그인 상태면 별점 라디오 5개와 본문 입력이 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);

    render(<ReviewSection officeId="office-1" />);

    for (let n = 1; n <= 5; n += 1) {
      expect(screen.getByRole("radio", { name: `${n}점` })).toBeInTheDocument();
    }
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("AC15: 본문이 10자 미만이면 제출 시 에러가 보이고 요청이 나가지 않는다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(screen.getByRole("textbox"), "짧음");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/10자/);
  });

  it("AC16: 별점을 선택하지 않고 제출하면 에러가 보이고 요청이 나가지 않는다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.type(
      screen.getByRole("textbox"),
      "충분히 긴 리뷰 본문입니다 열 자 이상",
    );
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/별점/);
  });

  it("AC17: 정상 제출하면 폼이 비워진다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "충분히 긴 리뷰 본문입니다 열 자 이상");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).toHaveBeenCalledWith({
      rating: 5,
      content: "충분히 긴 리뷰 본문입니다 열 자 이상",
    });
    expect(textbox).toHaveValue("");
    expect(
      screen.getByRole("radio", { name: "5점" }),
    ).not.toBeChecked();
  });

  it("AC18: 제출 중에는 제출 버튼이 비활성화된다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    useOfficeReviews.mockReturnValue({ ...baseHookState, isSubmitting: true });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByRole("button", { name: "등록" })).toBeDisabled();
  });

  it("AC19: 서버 실패면 에러 문구가 보이고 입력값은 유지된다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(false);
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      submitReview,
      submitError: new Error("이미 작성했습니다"),
    });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "충분히 긴 리뷰 본문입니다 열 자 이상");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByRole("alert")).toHaveTextContent("이미 작성했습니다");
    expect(textbox).toHaveValue("충분히 긴 리뷰 본문입니다 열 자 이상");
  });
});
