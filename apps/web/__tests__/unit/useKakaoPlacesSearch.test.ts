import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useKakaoPlacesSearch } from "../../hooks/useKakaoPlacesSearch";

const keywordSearch = vi.fn();

const PLACE_ITEM = (overrides: Partial<kakao.maps.services.IPlacesSearchResultItem> = {}) => ({
  id: "place-1",
  place_name: "역삼동",
  address_name: "서울 강남구 역삼동",
  road_address_name: "",
  x: "127.036",
  y: "37.500",
  ...overrides,
});

describe("useKakaoPlacesSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    keywordSearch.mockReset();
    window.kakao = {
      maps: {
        services: {
          Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
          Places: vi.fn().mockImplementation(function PlacesMock(this: {
            keywordSearch: typeof keywordSearch;
          }) {
            this.keywordSearch = keywordSearch;
          }),
        },
      },
    } as unknown as typeof window.kakao;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC2: 입력 후 300ms 안에 추가 입력이 없어야 keywordSearch를 호출한다(디바운스)", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM()], "OK");
    });
    const { rerender } = renderHook(({ query }) => useKakaoPlacesSearch(query), {
      initialProps: { query: "역" },
    });

    rerender({ query: "역삼" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(keywordSearch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(keywordSearch).toHaveBeenCalledTimes(1);
    expect(keywordSearch).toHaveBeenCalledWith("역삼", expect.any(Function));
  });

  it("AC3: 검색어를 지우면(빈 문자열) 호출 없이 결과가 비워진다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM()], "OK");
    });
    const { result, rerender } = renderHook(
      ({ query }) => useKakaoPlacesSearch(query),
      { initialProps: { query: "역삼동" } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.places).toHaveLength(1);

    keywordSearch.mockClear();
    rerender({ query: "" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(keywordSearch).not.toHaveBeenCalled();
    expect(result.current.places).toEqual([]);
  });

  it("AC4: 응답이 3건을 넘어도 최대 3건까지만 담는다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback(
        [
          PLACE_ITEM({ id: "1" }),
          PLACE_ITEM({ id: "2" }),
          PLACE_ITEM({ id: "3" }),
          PLACE_ITEM({ id: "4" }),
        ],
        "OK",
      );
    });
    const { result } = renderHook(() => useKakaoPlacesSearch("역삼동"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.places).toHaveLength(3);
  });

  it("AC5: ZERO_RESULT면 에러가 아니라 빈 배열로 처리한다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([], "ZERO_RESULT");
    });
    const { result } = renderHook(() => useKakaoPlacesSearch("존재하지않는지역명"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.places).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("AC6: ERROR 상태면 예외를 던지지 않고 에러 상태로만 남는다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([], "ERROR");
    });
    const { result } = renderHook(() => useKakaoPlacesSearch("역삼동"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("AC7: 응답의 y(위도)·x(경도) 문자열을 숫자로 변환한다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM({ x: "127.036", y: "37.5" })], "OK");
    });
    const { result } = renderHook(() => useKakaoPlacesSearch("역삼동"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.places[0]).toMatchObject({ lat: 37.5, lng: 127.036 });
  });

  it("kakao-places-category-filter: categoryCode를 넘기면 keywordSearch 3번째 인자로 전달된다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM()], "OK");
    });
    renderHook(() => useKakaoPlacesSearch("역삼동", "AG2"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(keywordSearch).toHaveBeenCalledWith(
      "역삼동",
      expect.any(Function),
      { category_group_code: "AG2" },
    );
  });

  it("kakao-places-category-filter: categoryCode가 없으면(null) 기존처럼 2개 인자로만 호출한다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM()], "OK");
    });
    renderHook(() => useKakaoPlacesSearch("역삼동", null));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // 인자 개수까지 비교되므로(toHaveBeenCalledWith), categoryCode가 없을 때
    // 3번째 인자를 아예 생략해야 기존 AC2~AC7의 2개 인자 호출 형태와 호환된다.
    expect(keywordSearch).toHaveBeenCalledWith("역삼동", expect.any(Function));
  });

  it("kakao-places-category-filter: categoryCode만 바뀌어도(같은 query) 디바운스 후 다시 검색한다", async () => {
    keywordSearch.mockImplementation((_keyword, callback) => {
      callback([PLACE_ITEM()], "OK");
    });
    const { rerender } = renderHook(
      ({ categoryCode }: { categoryCode: "AG2" | "SW8" | null }) =>
        useKakaoPlacesSearch("역삼동", categoryCode),
      { initialProps: { categoryCode: null as "AG2" | "SW8" | null } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    keywordSearch.mockClear();

    rerender({ categoryCode: "SW8" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(keywordSearch).toHaveBeenCalledWith(
      "역삼동",
      expect.any(Function),
      { category_group_code: "SW8" },
    );
  });
});
