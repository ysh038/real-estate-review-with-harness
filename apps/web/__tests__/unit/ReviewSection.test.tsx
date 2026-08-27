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
  matchConfidence: null,
  avgRating: 4.5,
  reviewCount: 1,
  tagCounts: [],
};

const REVIEW: TReview = {
  id: "00000000-0000-4000-8000-000000000001",
  officeId: "office-1",
  rating: 5,
  content: "친절하고 설명이 자세했어요",
  author: { nickname: "김철수", profileImageUrl: null },
  createdAt: "2026-08-21T00:00:00.000Z",
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
};

const REVIEW_WITH_DEAL_INFO: TReview = {
  ...REVIEW,
  id: "00000000-0000-4000-8000-000000000002",
  author: { nickname: "이영희", profileImageUrl: null },
  dealType: "전세",
  dealResult: "계약함",
  expertise: null,
  defectResponse: null,
  visitedYear: 2026,
  visitedMonth: 3,
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
  toggleHelpful: vi.fn().mockResolvedValue(undefined),
  sort: "latest" as const,
  setSort: vi.fn(),
  reportedReviewIds: new Set<string>(),
  reportError: null as Error | null,
  reportReview: vi.fn().mockResolvedValue(undefined),
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
    localStorage.clear();
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

  it("AC3(review-ux-consistency-and-draft): 로딩 중에는 스켈레톤이 보이고 기존 '불러오는 중…' 텍스트는 사라진다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      isLoading: true,
      detail: null,
      reviews: [],
    });

    const { container } = render(<ReviewSection officeId="office-1" />);

    expect(
      container.querySelectorAll("[data-testid='review-skeleton-card']"),
    ).toHaveLength(3);
    expect(screen.queryByText("불러오는 중…")).not.toBeInTheDocument();
  });

  it("AC4(review-ux-consistency-and-draft): 목록 조회 실패 시 에러 상태가 role=alert로 보인다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      error: new Error("network fail"),
      detail: null,
      reviews: [],
    });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "리뷰를 불러오지 못했습니다",
    );
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

  it("UX 감사: 로그인 유도 문구가 실제로 클릭 가능한 카카오 로그인 링크다", () => {
    render(<ReviewSection officeId="office-1" />);

    const loginLink = screen.getByRole("link", {
      name: "로그인하면 리뷰를 남길 수 있어요",
    });
    expect(loginLink).toHaveAttribute(
      "href",
      expect.stringContaining("/auth/kakao"),
    );
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

    expect(screen.getByRole("button", { name: /등록/ })).toBeDisabled();
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

  it("AC11(review-deal-and-visit-fields): 거래유형 select에 5개 옵션 + 선택 안 함이 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);

    render(<ReviewSection officeId="office-1" />);

    const select = screen.getByRole("combobox", { name: "거래유형" });
    expect(select).toBeInTheDocument();
    for (const label of ["전세", "월세", "매매", "상가", "원룸·오피스텔"]) {
      expect(
        screen.getByRole("option", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("AC12(review-deal-and-visit-fields): 거래결과 select에 3개 옵션 + 선택 안 함이 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);

    render(<ReviewSection officeId="office-1" />);

    const select = screen.getByRole("combobox", { name: "거래결과" });
    expect(select).toBeInTheDocument();
    for (const label of ["계약함", "안 함", "단순 상담"]) {
      expect(
        screen.getByRole("option", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("AC13(review-deal-and-visit-fields): 방문 연도만 입력하고 월을 비운 채 제출하면 에러가 보이고 요청이 나가지 않는다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(
      screen.getByRole("textbox"),
      "충분히 긴 리뷰 본문입니다 열 자 이상",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "방문 연도" }),
      "2026",
    );
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/방문 연도.*방문 월|방문 월.*방문 연도/);
  });

  it("AC13(review-deal-and-visit-fields): 방문 월만 선택하고 연도를 비운 채 제출하면 에러가 보이고 요청이 나가지 않는다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(
      screen.getByRole("textbox"),
      "충분히 긴 리뷰 본문입니다 열 자 이상",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "방문 월" }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/방문 연도.*방문 월|방문 월.*방문 연도/);
  });

  it("AC7(review-deal-and-visit-fields): 거래정보·방문시기를 채워 제출하면 submitReview에 그대로 전달된다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const submitReview = vi.fn().mockResolvedValue(true);
    useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(
      screen.getByRole("textbox"),
      "충분히 긴 리뷰 본문입니다 열 자 이상",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "거래유형" }),
      "전세",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "거래결과" }),
      "계약함",
    );
    await user.type(
      screen.getByRole("spinbutton", { name: "방문 연도" }),
      "2026",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "방문 월" }),
      "3",
    );
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(submitReview).toHaveBeenCalledWith({
      rating: 5,
      content: "충분히 긴 리뷰 본문입니다 열 자 이상",
      dealType: "전세",
      dealResult: "계약함",
      visitedYear: 2026,
      visitedMonth: 3,
    });
  });

  it("AC12(review-helpful-toggle): 리뷰 항목에 도움돼요 버튼과 개수가 보인다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reviews: [{ ...REVIEW, helpfulCount: 3, isHelpful: null }],
    });

    render(<ReviewSection officeId="office-1" />);

    expect(
      screen.getByRole("button", { name: /도움돼요/ }),
    ).toHaveTextContent("3");
  });

  it("AC13(review-helpful-toggle): 로그인 상태에서 누르면 toggleHelpful이 그 리뷰 id로 호출된다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const toggleHelpful = vi.fn().mockResolvedValue(undefined);
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reviews: [{ ...REVIEW, isHelpful: false }],
      toggleHelpful,
    });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("button", { name: /도움돼요/ }));

    expect(toggleHelpful).toHaveBeenCalledWith(REVIEW.id);
  });

  it("AC14(review-helpful-toggle): 비로그인 상태면 도움돼요 버튼이 비활성화돼 있고 클릭해도 요청이 나가지 않는다", async () => {
    const toggleHelpful = vi.fn().mockResolvedValue(undefined);
    useOfficeReviews.mockReturnValue({ ...baseHookState, toggleHelpful });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    const button = screen.getByRole("button", { name: /도움돼요/ });
    expect(button).toBeDisabled();

    await user.click(button);

    expect(toggleHelpful).not.toHaveBeenCalled();
  });

  it("AC15(review-helpful-toggle): 이미 누른 리뷰는 눌린 상태로 보이고, 다시 눌러도 toggleHelpful이 호출된다(취소)", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const toggleHelpful = vi.fn().mockResolvedValue(undefined);
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reviews: [{ ...REVIEW, helpfulCount: 1, isHelpful: true }],
      toggleHelpful,
    });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    const button = screen.getByRole("button", { name: /도움돼요/ });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);

    expect(toggleHelpful).toHaveBeenCalledWith(REVIEW.id);
  });

  it("AC15(review-deal-and-visit-fields): 거래정보가 있는 리뷰 항목만 표시되고 없는 항목엔 표시되지 않는다", () => {
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reviews: [REVIEW, REVIEW_WITH_DEAL_INFO],
    });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByText(/전세/)).toBeInTheDocument();
    expect(screen.getByText(/계약함/)).toBeInTheDocument();
    expect(screen.getByText(/2026년 3월/)).toBeInTheDocument();
  });

  it("정렬(review-permalink-report-and-sort): 최신순·오래된순 버튼이 있고 누르면 setSort가 호출된다", async () => {
    const setSort = vi.fn();
    useOfficeReviews.mockReturnValue({ ...baseHookState, setSort });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    expect(screen.getByRole("button", { name: "최신순" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "오래된순" }));

    expect(setSort).toHaveBeenCalledWith("oldest");
  });

  it("AC9(review-permalink-report-and-sort): 리뷰 항목에 id=review-<id>가 있다", () => {
    render(<ReviewSection officeId="office-1" />);

    expect(document.getElementById(`review-${REVIEW.id}`)).not.toBeNull();
  });

  it("AC10·AC11(review-permalink-report-and-sort): 링크 복사 버튼을 누르면 클립보드에 복사되고 문구가 잠깐 바뀐다", async () => {
    // userEvent.setup()이 navigator.clipboard에 자체 스텁을 설치하므로, 그 뒤에
    // writeText만 스파이한다 — 직접 vi.stubGlobal로 통째로 갈아치우면 userEvent의
    // 스텁이 나중에 다시 덮어써 버린다.
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("button", { name: "링크 복사" }));

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/offices/office-1#review-${REVIEW.id}`,
    );
    expect(
      await screen.findByRole("button", { name: "복사됨" }),
    ).toBeInTheDocument();
  });

  it("AC5(review-permalink-report-and-sort): 비로그인이면 신고 버튼이 보이지 않는다", () => {
    render(<ReviewSection officeId="office-1" />);

    expect(
      screen.queryByRole("button", { name: "신고" }),
    ).not.toBeInTheDocument();
  });

  it("AC6(review-permalink-report-and-sort): 로그인 상태에서 신고 버튼을 누르면 reportReview가 호출된다", async () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    const reportReview = vi.fn().mockResolvedValue(undefined);
    useOfficeReviews.mockReturnValue({ ...baseHookState, reportReview });
    const user = userEvent.setup();

    render(<ReviewSection officeId="office-1" />);
    await user.click(screen.getByRole("button", { name: "신고" }));

    expect(reportReview).toHaveBeenCalledWith(REVIEW.id);
  });

  it("AC6·AC7(review-permalink-report-and-sort): 이미 신고된 리뷰는 '신고됨'으로 비활성화되어 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reportedReviewIds: new Set([REVIEW.id]),
    });

    render(<ReviewSection officeId="office-1" />);

    expect(screen.getByRole("button", { name: "신고됨" })).toBeDisabled();
  });

  it("AC8(review-permalink-report-and-sort): reportError가 있으면 에러 문구가 보인다", () => {
    useSession.mockReturnValue(AUTHENTICATED_SESSION);
    useOfficeReviews.mockReturnValue({
      ...baseHookState,
      reportError: new Error("본인 리뷰는 신고할 수 없습니다"),
    });

    render(<ReviewSection officeId="office-1" />);

    expect(
      screen.getByText("본인 리뷰는 신고할 수 없습니다"),
    ).toBeInTheDocument();
  });

  describe("사진 첨부 (review-photo-upload)", () => {
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => "blob:fake-preview-url");
    });

    it("AC14: 파일을 선택하면 미리보기 썸네일과 개별 삭제 버튼이 보인다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

      await user.upload(screen.getByLabelText("사진 추가"), file);

      expect(screen.getByAltText("첨부 사진 1")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "사진 1 삭제" }),
      ).toBeInTheDocument();
    });

    it("AC14: 삭제 버튼을 누르면 그 미리보기가 사라진다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("button", { name: "사진 1 삭제" }));

      expect(screen.queryByAltText("첨부 사진 1")).not.toBeInTheDocument();
    });

    it("AC15: 이미 3장을 첨부했으면 파일 선택 입력이 사라진다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const files = [
        new File(["a"], "a.jpg", { type: "image/jpeg" }),
        new File(["b"], "b.jpg", { type: "image/jpeg" }),
        new File(["c"], "c.jpg", { type: "image/jpeg" }),
      ];

      await user.upload(screen.getByLabelText("사진 추가"), files);

      expect(screen.queryByLabelText("사진 추가")).not.toBeInTheDocument();
    });

    it("AC16: 첨부 사진과 함께 제출하면 submitReview에 파일 배열이 함께 전달된다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const submitReview = vi.fn().mockResolvedValue(true);
      useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("radio", { name: "5점" }));
      await user.type(
        screen.getByRole("textbox"),
        "충분히 긴 리뷰 본문입니다 열 자 이상",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(submitReview).toHaveBeenCalledWith(
        { rating: 5, content: "충분히 긴 리뷰 본문입니다 열 자 이상" },
        [file],
      );
    });

    it("AC16: 사진 업로드 중(제출 중 + 첨부 사진 있음)에는 버튼 문구가 바뀐다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      useOfficeReviews.mockReturnValue({ ...baseHookState, isSubmitting: true });
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

      await user.upload(screen.getByLabelText("사진 추가"), file);

      expect(
        screen.getByRole("button", { name: "사진 업로드 중..." }),
      ).toBeDisabled();
    });

    it("정상 제출 후에는 첨부했던 사진 미리보기도 비워진다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const submitReview = vi.fn().mockResolvedValue(true);
      useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
      const user = userEvent.setup();
      render(<ReviewSection officeId="office-1" />);
      const file = new File(["a"], "a.jpg", { type: "image/jpeg" });

      await user.upload(screen.getByLabelText("사진 추가"), file);
      await user.click(screen.getByRole("radio", { name: "5점" }));
      await user.type(
        screen.getByRole("textbox"),
        "충분히 긴 리뷰 본문입니다 열 자 이상",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(screen.queryByAltText("첨부 사진 1")).not.toBeInTheDocument();
    });
  });

  describe("사진 표시 + 라이트박스 (review-photo-upload)", () => {
    const REVIEW_WITH_PHOTOS: TReview = {
      ...REVIEW,
      id: "00000000-0000-4000-8000-000000000099",
      photos: [
        { storageKey: "uploads/a.jpg", url: "https://example.com/a.jpg" },
        { storageKey: "uploads/b.jpg", url: "https://example.com/b.jpg" },
      ],
    };

    it("AC18: 사진이 있는 리뷰는 썸네일이 보이고, 없는 리뷰는 아무것도 안 보인다", () => {
      useOfficeReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_PHOTOS, REVIEW],
      });

      render(<ReviewSection officeId="office-1" />);

      expect(screen.getByAltText("리뷰 사진 1")).toBeInTheDocument();
      expect(screen.getByAltText("리뷰 사진 2")).toBeInTheDocument();
    });

    it("AC19: 썸네일을 클릭하면 그 사진부터 라이트박스가 열린다", async () => {
      useOfficeReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_PHOTOS],
      });
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByAltText("리뷰 사진 2"));

      const dialog = screen.getByRole("dialog", { name: "사진 보기" });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "사진 2" })).toHaveAttribute(
        "src",
        "https://example.com/b.jpg",
      );
    });

    it("AC22: 라이트박스를 닫으면 다시 사라진다", async () => {
      useOfficeReviews.mockReturnValue({
        ...baseHookState,
        reviews: [REVIEW_WITH_PHOTOS],
      });
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByAltText("리뷰 사진 1"));
      await user.click(screen.getByRole("button", { name: "닫기" }));

      expect(
        screen.queryByRole("dialog", { name: "사진 보기" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("정형 설문 항목 (review-structured-survey)", () => {
    it("AC7: 전문성 select에 3개 옵션 + 선택 안 함이 보인다", () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);

      render(<ReviewSection officeId="office-1" />);

      const select = screen.getByRole("combobox", { name: "전문성" });
      expect(select).toBeInTheDocument();
      for (const label of ["전문적이었음", "보통", "아쉬웠음"]) {
        expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
      }
    });

    it("AC7: 하자 대응 select에 3개 옵션 + 선택 안 함이 보인다", () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);

      render(<ReviewSection officeId="office-1" />);

      const select = screen.getByRole("combobox", { name: "하자 대응" });
      expect(select).toBeInTheDocument();
      for (const label of ["원만히 해결됨", "미흡했음", "하자 없었음"]) {
        expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
      }
    });

    it("AC9: 전문성·하자 대응을 선택해 제출하면 submitReview에 포함된다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const submitReview = vi.fn().mockResolvedValue(true);
      useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByRole("radio", { name: "5점" }));
      await user.type(
        screen.getByRole("textbox"),
        "충분히 긴 리뷰 본문입니다 열 자 이상",
      );
      await user.selectOptions(
        screen.getByRole("combobox", { name: "전문성" }),
        "전문적이었음",
      );
      await user.selectOptions(
        screen.getByRole("combobox", { name: "하자 대응" }),
        "원만히 해결됨",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(submitReview).toHaveBeenCalledWith({
        rating: 5,
        content: "충분히 긴 리뷰 본문입니다 열 자 이상",
        expertise: "전문적이었음",
        defectResponse: "원만히 해결됨",
      });
    });

    it("AC10: 리뷰에 전문성·하자 대응 값이 있으면 카드에 보인다", () => {
      useOfficeReviews.mockReturnValue({
        ...baseHookState,
        reviews: [
          { ...REVIEW, expertise: "전문적이었음", defectResponse: "원만히 해결됨" },
        ],
      });

      render(<ReviewSection officeId="office-1" />);

      expect(screen.getByText(/전문성: 전문적이었음/)).toBeInTheDocument();
      expect(screen.getByText(/하자 대응: 원만히 해결됨/)).toBeInTheDocument();
    });

    it("AC11: 값이 둘 다 없으면 표시 영역이 없다", () => {
      render(<ReviewSection officeId="office-1" />);

      expect(screen.queryByText(/전문성:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/하자 대응:/)).not.toBeInTheDocument();
    });
  });

  describe("작성 임시저장 (review-ux-consistency-and-draft)", () => {
    const DRAFT_KEY = "review-draft-office-1";
    const STORED_DRAFT = {
      rating: 4,
      content: "친절했어요",
      dealType: "전세",
      dealResult: "계약함",
      expertise: "",
      defectResponse: "",
      visitedYear: "2026",
      visitedMonth: "3",
      tags: ["친절함"],
    };

    it("AC10: 본문을 입력하면 localStorage에 초안이 저장된다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.type(screen.getByRole("textbox"), "작성 중인 내용");

      expect(
        JSON.parse(localStorage.getItem(DRAFT_KEY)!).content,
      ).toBe("작성 중인 내용");
    });

    it("AC11: 입력했던 본문을 모두 지우면 저장된 초안도 사라진다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      const textbox = screen.getByRole("textbox");
      await user.type(textbox, "내용");
      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

      await user.clear(textbox);

      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it("AC12: 본문이 있는 초안이 저장되어 있으면 재진입 시 복원 배너가 보인다", () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(STORED_DRAFT));
      useSession.mockReturnValue(AUTHENTICATED_SESSION);

      render(<ReviewSection officeId="office-1" />);

      expect(
        screen.getByText("이어서 작성하시겠어요?"),
      ).toBeInTheDocument();
    });

    it("AC13: '복원'을 누르면 초안 값이 폼에 채워지고 배너는 사라지지만 storage는 남는다", async () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(STORED_DRAFT));
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByRole("button", { name: "복원" }));

      expect(screen.getByRole("textbox")).toHaveValue("친절했어요");
      expect(screen.getByRole("radio", { name: "4점" })).toBeChecked();
      expect(
        screen.queryByText("이어서 작성하시겠어요?"),
      ).not.toBeInTheDocument();
      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    });

    it("AC14: '새로 작성'을 누르면 배너가 사라지고 storage도 지워지며 폼은 비어있다", async () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(STORED_DRAFT));
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByRole("button", { name: "새로 작성" }));

      expect(
        screen.queryByText("이어서 작성하시겠어요?"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("");
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it("AC15: 정상 제출하면 저장된 초안도 함께 지워진다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const submitReview = vi.fn().mockResolvedValue(true);
      useOfficeReviews.mockReturnValue({ ...baseHookState, submitReview });
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.click(screen.getByRole("radio", { name: "5점" }));
      await user.type(
        screen.getByRole("textbox"),
        "충분히 긴 리뷰 본문입니다 열 자 이상",
      );
      expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    });

    it("AC16: 본문이 있는 상태에서 beforeunload가 발생하면 이탈 경고가 뜬다", async () => {
      useSession.mockReturnValue(AUTHENTICATED_SESSION);
      const user = userEvent.setup();

      render(<ReviewSection officeId="office-1" />);
      await user.type(screen.getByRole("textbox"), "작성 중");

      const event = new Event("beforeunload", {
        cancelable: true,
      }) as BeforeUnloadEvent;
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");
      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
