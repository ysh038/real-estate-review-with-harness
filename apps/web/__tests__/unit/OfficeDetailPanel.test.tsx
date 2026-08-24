import type { TOfficeSummary } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OfficeDetailPanel } from "../../components/OfficeDetailPanel";

const OFFICE: TOfficeSummary = {
  id: "office-1",
  name: "분당공인중개사사무소",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구 판교로 1",
  phone: "031-000-0000",
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  tagCounts: [],
};

describe("OfficeDetailPanel", () => {
  it("AC6: 사무소명·대표자명·주소·전화번호가 보인다", () => {
    render(<OfficeDetailPanel office={OFFICE} onClose={vi.fn()} />);

    expect(screen.getByText("분당공인중개사사무소")).toBeInTheDocument();
    expect(screen.getByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("경기도 성남시 분당구 판교로 1")).toBeInTheDocument();
    expect(screen.getByText("031-000-0000")).toBeInTheDocument();
  });

  it("AC7: ownerName·phone 이 null 이면 '정보 없음'이 보인다", () => {
    render(
      <OfficeDetailPanel
        office={{ ...OFFICE, ownerName: null, phone: null }}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getAllByText("정보 없음")).toHaveLength(2);
  });

  it("AC8: role=dialog 이고 접근 가능한 이름이 사무소명이다", () => {
    render(<OfficeDetailPanel office={OFFICE} onClose={vi.fn()} />);

    expect(
      screen.getByRole("dialog", { name: "분당공인중개사사무소" }),
    ).toBeInTheDocument();
  });

  it("AC9: 열리면 포커스가 닫기 버튼으로 이동한다", () => {
    render(<OfficeDetailPanel office={OFFICE} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus();
  });

  it("AC10: 닫기 버튼을 클릭하면 onClose 가 호출된다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<OfficeDetailPanel office={OFFICE} onClose={handleClose} />);

    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AC11: ESC 를 누르면 onClose 가 호출된다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    render(<OfficeDetailPanel office={OFFICE} onClose={handleClose} />);

    await user.keyboard("{Escape}");

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("AC12: 언마운트된 뒤에는 ESC 를 눌러도 onClose 가 호출되지 않는다", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    const { unmount } = render(
      <OfficeDetailPanel office={OFFICE} onClose={handleClose} />,
    );

    unmount();
    await user.keyboard("{Escape}");

    expect(handleClose).not.toHaveBeenCalled();
  });
});
