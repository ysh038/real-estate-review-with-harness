import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PhotoLightbox } from "../../components/PhotoLightbox";

const PHOTOS = [
  { storageKey: "uploads/a.jpg", url: "https://example.com/a.jpg" },
  { storageKey: "uploads/b.jpg", url: "https://example.com/b.jpg" },
  { storageKey: "uploads/c.jpg", url: "https://example.com/c.jpg" },
];

describe("PhotoLightbox", () => {
  it("AC19: startIndex가 가리키는 사진부터 보여준다", () => {
    render(<PhotoLightbox photos={PHOTOS} startIndex={1} onClose={vi.fn()} />);

    expect(screen.getByRole("img")).toHaveAttribute("src", PHOTOS[1]!.url);
  });

  it("AC20: 사진이 여러 장이면 'n / 총장수' 카운터가 보인다", () => {
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={vi.fn()} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("사진이 한 장이면 카운터가 보이지 않는다", () => {
    render(<PhotoLightbox photos={[PHOTOS[0]!]} startIndex={0} onClose={vi.fn()} />);

    expect(screen.queryByText(/1 \/ 1/)).not.toBeInTheDocument();
  });

  it("AC20: 다음 버튼을 누르면 다음 사진으로 이동한다", async () => {
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "다음 사진" }));

    expect(screen.getByRole("img")).toHaveAttribute("src", PHOTOS[1]!.url);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("AC20: 첫 사진에서는 이전 버튼이 없고, 마지막 사진에서는 다음 버튼이 없다", async () => {
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "이전 사진" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 사진" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다음 사진" }));
    await user.click(screen.getByRole("button", { name: "다음 사진" }));

    expect(screen.queryByRole("button", { name: "다음 사진" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 사진" })).toBeInTheDocument();
  });

  it("AC20: 화살표 키로 이동한다", async () => {
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={vi.fn()} />);

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("AC20: Esc를 누르면 onClose가 호출된다", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("AC22: 닫기 버튼을 누르면 onClose가 호출된다", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("AC22: 배경(dialog) 클릭 시 onClose가 호출된다", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={onClose} />);

    await user.click(screen.getByRole("dialog"));

    expect(onClose).toHaveBeenCalled();
  });

  it("AC22: 사진 자체를 클릭해도 onClose가 호출되지 않는다", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PhotoLightbox photos={PHOTOS} startIndex={0} onClose={onClose} />);

    await user.click(screen.getByRole("img"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("AC21: 열려 있는 동안 body 스크롤이 잠기고, 닫히면 복원된다", () => {
    const { unmount } = render(
      <PhotoLightbox photos={PHOTOS} startIndex={0} onClose={vi.fn()} />,
    );

    expect(document.body.style.overflow).toBe("hidden");

    unmount();

    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
