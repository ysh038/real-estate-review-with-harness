import type { TOfficeSummary } from "@repo/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OfficeSearchBar } from "../../components/OfficeSearchBar";
import type { IKakaoPlace } from "../../hooks/useKakaoPlacesSearch";

const { useOfficeSearch } = vi.hoisted(() => ({ useOfficeSearch: vi.fn() }));
vi.mock("../../hooks/useOfficeSearch", () => ({ useOfficeSearch }));

const { useKakaoPlacesSearch } = vi.hoisted(() => ({
  useKakaoPlacesSearch: vi.fn(),
}));
vi.mock("../../hooks/useKakaoPlacesSearch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../hooks/useKakaoPlacesSearch")>();
  return { ...actual, useKakaoPlacesSearch };
});

const PLACES_IDLE = {
  places: [] as IKakaoPlace[],
  isLoading: false,
  error: null as Error | null,
};

const PLACE_A: IKakaoPlace = {
  id: "place-a",
  placeName: "역삼동",
  addressName: "서울 강남구 역삼동",
  lat: 37.5,
  lng: 127.03,
};

const PLACE_B: IKakaoPlace = {
  id: "place-b",
  placeName: "역삼역",
  addressName: "서울 강남구 테헤란로",
  lat: 37.501,
  lng: 127.036,
};

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
    useKakaoPlacesSearch.mockReset().mockReturnValue(PLACES_IDLE);
  });

  it("AC18: role=combobox 이고 초기엔 aria-expanded=false 다", () => {
    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("AC13: 결과가 있으면 목록이 드롭다운으로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /수정공인중개사/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  });

  it("AC14: 결과가 없고 검색어가 있으면 '검색 결과가 없습니다' 문구가 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "없는사무소");

    expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("AC15: 방향키로 하이라이트가 이동하고 끝에서 순환하지 않는다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
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

    render(<OfficeSearchBar onSelect={onSelect} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(OFFICE_B);
  });

  it("AC17: Escape를 누르면 드롭다운이 닫힌다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
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

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByText("검색 중…")).toBeInTheDocument();
  });

  it("AC8(review-ux-consistency-and-draft): 검색 실패 시 에러 상태가 role=alert로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, error: new Error("network fail") });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");

    expect(screen.getByRole("alert")).toHaveTextContent("검색에 실패했습니다");
  });

  it("AC19: 항목을 클릭하면 그 사무소로 onSelect가 호출된다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A, OFFICE_B] });
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={onSelect} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "공인");
    await user.click(screen.getByRole("option", { name: /수정공인중개사/ }));

    expect(onSelect).toHaveBeenCalledWith(OFFICE_B);
  });

  it("AC8(kakao-places-location-search): 사무소·장소 결과가 모두 있으면 두 섹션 라벨로 나뉘어 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "역삼");

    expect(screen.getByText("사무소")).toBeInTheDocument();
    expect(screen.getByText("장소")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /역삼동/ })).toBeInTheDocument();
  });

  it("AC9(kakao-places-location-search): 장소 결과만 있으면 섹션 라벨 없이 단일 목록으로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "역삼");

    expect(screen.queryByText("사무소")).not.toBeInTheDocument();
    expect(screen.queryByText("장소")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /역삼동/ })).toBeInTheDocument();
  });

  it("AC10(kakao-places-location-search): 방향키가 사무소 목록에서 장소 목록으로 이어서 순회한다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A] });
    useKakaoPlacesSearch.mockReturnValue({
      ...PLACES_IDLE,
      places: [PLACE_A, PLACE_B],
    });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "역삼");

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /분당공인중개사/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /역삼동/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /역삼역/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // 마지막(장소) 항목에서 더 내려도 순환하지 않는다.
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /역삼역/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("AC11(kakao-places-location-search): 장소 항목을 클릭하면 onSelectPlace가 그 장소로 호출된다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const onSelectPlace = vi.fn();
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={onSelect} onSelectPlace={onSelectPlace} />);
    await user.type(screen.getByRole("combobox"), "역삼");
    await user.click(screen.getByRole("option", { name: /역삼동/ }));

    expect(onSelectPlace).toHaveBeenCalledWith(PLACE_A);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("AC11(kakao-places-location-search): 장소 항목에서 Enter를 눌러도 onSelectPlace가 호출된다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [OFFICE_A] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const onSelectPlace = vi.fn();
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={onSelectPlace} />);
    await user.type(screen.getByRole("combobox"), "역삼");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSelectPlace).toHaveBeenCalledWith(PLACE_A);
  });

  it("AC12(kakao-places-location-search): 사무소·장소 결과가 모두 없으면 '검색 결과가 없습니다'가 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "없는지역명");

    expect(screen.getByText("검색 결과가 없습니다")).toBeInTheDocument();
  });

  it("AC12(kakao-places-location-search): 장소 결과만 있으면 '검색 결과가 없습니다'가 보이지 않는다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, results: [] });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "역삼");

    expect(screen.queryByText("검색 결과가 없습니다")).not.toBeInTheDocument();
  });

  it("AC13(kakao-places-location-search): 사무소 검색 에러여도 장소 결과는 그대로 보인다", async () => {
    useOfficeSearch.mockReturnValue({ ...IDLE, error: new Error("network fail") });
    useKakaoPlacesSearch.mockReturnValue({ ...PLACES_IDLE, places: [PLACE_A] });
    const user = userEvent.setup();

    render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "역삼");

    expect(screen.getByRole("alert")).toHaveTextContent("검색에 실패했습니다");
    expect(screen.getByRole("option", { name: /역삼동/ })).toBeInTheDocument();
  });

  describe("장소 카테고리 필터 (kakao-places-category-filter)", () => {
    it("칩 4개(중개업소/지하철역/학교/은행)가 항상 보이고 초기엔 전부 선택 안 됨이다", () => {
      render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);

      for (const label of ["중개업소", "지하철역", "학교", "은행"]) {
        expect(
          screen.getByRole("button", { name: label, pressed: false }),
        ).toBeInTheDocument();
      }
    });

    it("칩을 누르면 선택되고 useKakaoPlacesSearch에 그 카테고리 코드가 전달된다", async () => {
      const user = userEvent.setup();
      render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "중개업소" }));

      expect(
        screen.getByRole("button", { name: "중개업소", pressed: true }),
      ).toBeInTheDocument();
      expect(useKakaoPlacesSearch).toHaveBeenLastCalledWith("", "AG2");
    });

    it("선택된 칩을 다시 누르면 해제되고 categoryCode가 다시 null이 된다", async () => {
      const user = userEvent.setup();
      render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);

      const chip = screen.getByRole("button", { name: "중개업소" });
      await user.click(chip);
      await user.click(chip);

      expect(screen.getByRole("button", { name: "중개업소", pressed: false }));
      expect(useKakaoPlacesSearch).toHaveBeenLastCalledWith("", null);
    });

    it("다른 칩을 누르면 이전 선택은 해제되고 새 칩만 선택된다(단일 선택)", async () => {
      const user = userEvent.setup();
      render(<OfficeSearchBar onSelect={vi.fn()} onSelectPlace={vi.fn()} />);

      await user.click(screen.getByRole("button", { name: "중개업소" }));
      await user.click(screen.getByRole("button", { name: "지하철역" }));

      expect(
        screen.getByRole("button", { name: "중개업소", pressed: false }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "지하철역", pressed: true }),
      ).toBeInTheDocument();
      expect(useKakaoPlacesSearch).toHaveBeenLastCalledWith("", "SW8");
    });
  });
});
