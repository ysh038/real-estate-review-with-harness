import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewListSkeleton, Skeleton } from "../../components/Skeleton";

describe("Skeleton", () => {
  it("AC1: aria-hidden 처리된 자리표시자를 그린다(스크린리더에 노출 안 함)", () => {
    const { container } = render(<Skeleton />);

    const el = container.firstElementChild;
    expect(el).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ReviewListSkeleton", () => {
  it("AC1: count만큼 리뷰 카드 모양 자리표시자를 그린다", () => {
    const { container } = render(<ReviewListSkeleton count={3} />);

    expect(container.querySelectorAll("[data-testid='review-skeleton-card']")).toHaveLength(3);
  });

  it("AC1: count를 생략하면 기본 3개를 그린다", () => {
    const { container } = render(<ReviewListSkeleton />);

    expect(container.querySelectorAll("[data-testid='review-skeleton-card']")).toHaveLength(3);
  });

  it("AC1: 스크린리더에는 '불러오는 중' 상태만 알린다", () => {
    render(<ReviewListSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  });
});
