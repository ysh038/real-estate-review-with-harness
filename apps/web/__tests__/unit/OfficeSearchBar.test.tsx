import type { TOfficeSummary } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeSearchBar } from "../../components/OfficeSearchBar";

const { useOfficeSearch } = vi.hoisted(() => ({ useOfficeSearch: vi.fn() }));
vi.mock("../../hooks/useOfficeSearch", () => ({ useOfficeSearch }));

const OFFICE_A: TOfficeSummary = {
  id: "office-a",
  name: "분당공인중개사",
  ownerName: "홍길동",
  address: "경기도 성남시 분당구",
  phone: null,
  sigungu: "성남시",
  lat: 37.4,
  lng: 127.1,
  matchConfidence: null,
  tagCounts: [],
};

const OFFICE_B: TOfficeSummary = {
  ...OFFICE_A,
  id: "office-b",
  name: "수정공인중개사",
  address: "경기도 성남시 수정구",
};

const IDLE = { results: [] as TOfficeSummary[], isLoading: false, error: null as Error | null };

describe("OfficeSearchBar", () => {
  beforeEach(() => {
    useOfficeSearch.mockReset().mockReturnValue(IDLE);
  });

  it("AC18: role=combobox 이고 초기엔 aria-expanded=false 다", () => {
    render(<OfficeSearchBar onSelect={vi.fn()} />);

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("AC13: 결과가 있으면 목록이 드롭다운으로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /수정공인중개사/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("AC14: 결과가 없고 검색어가 있으면 '검색 결과가 없습니다' 문구가 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "없는사무소");

    expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("AC15: 방향키로 하이라이트가 이동하고 끝에서 순환하지 않는다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "공인");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /수정공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 마지막 항목에서 더 내려도 순환하지 않고 그대로 마지막에 머문다.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /수정공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 첫 항목에서 더 올려도 순환하지 않는다.
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("AC16: Enter를 누르면 하이라이트된 항목으로 onSelect가 호출된다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={onSelect} />);
    await user.type(screen.getByRole("combobox"), "공인");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(OFFICE_B);
  });

  it("AC17: Escape를 누르면 드롭다운이 닫힌다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    const input = screen.getByRole("combobox");
    await user.type(input, "공인");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("AC7(review-ux-consistency-and-draft): 로딩 중에는 로딩 문구가 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, isLoading: true });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByText("검색 중…")).toBeInTheDocument();
  });

  it("AC8(review-ux-consistency-and-draft): 검색 실패 시 에러 상태가 role=alert로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, error: new Error("network fail") });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByRole("alert")).toHaveTextContent("검색에 실패했습니다");
  });

  it("AC19: 항목을 클릭하면 그 사무소로 onSelect가 호출된다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={onSelect} />);
    await user.type(screen.getByRole("combobox"), "공인");
    await user.click(screen.getByRole("option", { name: /수정공인중개사/ }));

    expect(onSelect).toHaveBeenCalledWith(OFFICE_B);
  });
});
