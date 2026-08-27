import type { TOfficeSummary } from "@repo/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOfficeSearch } from "../../hooks/useOfficeSearch";

const { searchOffices } = vi.hoisted(() => ({ searchOffices: vi.fn() }));
vi.mock("../../lib/officesApi", () => ({ searchOffices }));

const OFFICE: TOfficeSummary = {
  id: "office-1",
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

describe("useOfficeSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchOffices.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC10: 입력 후 300ms 안에 추가 입력이 없어야 검색을 요청한다(디바운스)", async () => {
    searchOffices.mockResolvedValue({ offices: [OFFICE] });
    const { rerender } = renderHook(({ query }) => useOfficeSearch(query), {
      initialProps: { query: "분" },
    });

    rerender({ query: "분당" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(searchOffices).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(searchOffices).toHaveBeenCalledTimes(1);
    expect(searchOffices).toHaveBeenCalledWith("분당");
  });

  it("AC10: 결과가 오면 results에 반영된다", async () => {
    searchOffices.mockResolvedValue({ offices: [OFFICE] });
    const { result } = renderHook(() => useOfficeSearch("분당"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.results).toEqual([OFFICE]);
    expect(result.current.isLoading).toBe(false);
  });

  it("AC11: 검색어를 지우면(빈 문자열) 요청 없이 결과가 비워진다", async () => {
    searchOffices.mockResolvedValue({ offices: [OFFICE] });
    const { result, rerender } = renderHook(
      ({ query }) => useOfficeSearch(query),
      { initialProps: { query: "분당" } },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.results).toEqual([OFFICE]);

    searchOffices.mockClear();
    rerender({ query: "" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(searchOffices).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
  });

  it("AC12: 조회가 실패해도 예외를 던지지 않고 에러 상태로만 남는다", async () => {
    searchOffices.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useOfficeSearch("분당"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
