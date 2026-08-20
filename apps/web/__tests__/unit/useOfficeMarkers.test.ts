import type { TOfficeSummary } from "@repo/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOfficeMarkers } from "../../hooks/useOfficeMarkers";

const { addMapListener, removeMapListener } = vi.hoisted(() => ({
  addMapListener: vi.fn(),
  removeMapListener: vi.fn(),
}));
vi.mock("../../lib/kakaoMapEvents", () => ({ addMapListener, removeMapListener }));

const { createOfficeMarker, removeMarker } = vi.hoisted(() => ({
  createOfficeMarker: vi.fn(),
  removeMarker: vi.fn(),
}));
vi.mock("../../lib/kakaoMarkers", () => ({ createOfficeMarker, removeMarker }));

const { fetchOfficesByBbox } = vi.hoisted(() => ({
  fetchOfficesByBbox: vi.fn(),
}));
vi.mock("../../lib/officesApi", () => ({ fetchOfficesByBbox }));

const OFFICE_A: TOfficeSummary = {
  id: "office-a",
  name: "가 공인중개사",
  ownerName: null,
  address: "성남시",
  phone: null,
  sigungu: "성남시",
  lat: 37.45,
  lng: 127.15,
};

const makeFakeMap = () =>
  ({
    getBounds: () => ({
      getSouthWest: () => ({ getLat: () => 37.4, getLng: () => 127.1 }),
      getNorthEast: () => ({ getLat: () => 37.5, getLng: () => 127.2 }),
    }),
  }) as unknown as kakao.maps.Map;

/** addMapListener 호출 인자에서 등록된 bounds_changed 핸들러를 꺼낸다 */
const getBoundsChangedHandler = (): (() => void) => {
  const call = addMapListener.mock.calls.find((args) => args[1] === "bounds_changed");
  if (!call) throw new Error("bounds_changed 리스너가 등록되지 않았습니다");
  return call[2] as () => void;
};

describe("useOfficeMarkers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchOfficesByBbox.mockReset();
    addMapListener.mockReset();
    removeMapListener.mockReset();
    createOfficeMarker.mockReset().mockReturnValue({ setMap: vi.fn() });
    removeMarker.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC2/AC6: 마운트 시(별도 이동 없이) 초기 bbox로 조회해 offices/isTruncated를 노출한다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.offices).toEqual([OFFICE_A]);
    expect(result.current.isTruncated).toBe(false);
    expect(fetchOfficesByBbox).toHaveBeenCalledTimes(1);
  });

  it("AC2: isTruncated:true 응답도 그대로 노출한다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: true });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.isTruncated).toBe(true);
  });

  it("AC3: 조회가 실패해도 예외를 던지지 않고 직전 offices를 유지한다", async () => {
    fetchOfficesByBbox.mockResolvedValueOnce({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.offices).toEqual([OFFICE_A]);

    fetchOfficesByBbox.mockRejectedValueOnce(new Error("network error"));
    const handleBoundsChanged = getBoundsChangedHandler();
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.offices).toEqual([OFFICE_A]);
  });

  it("AC4: 300ms 안에 bounds_changed가 연속으로 발생해도 추가 조회는 한 번만 일어난다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchOfficesByBbox).toHaveBeenCalledTimes(1);

    const handleBoundsChanged = getBoundsChangedHandler();
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchOfficesByBbox).toHaveBeenCalledTimes(2);
  });

  it("AC5: 언마운트되면 대기 중인 debounce 타이머가 취소되고 리스너가 해제된다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { unmount } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    fetchOfficesByBbox.mockClear();

    const handleBoundsChanged = getBoundsChangedHandler();
    act(() => {
      handleBoundsChanged();
    });
    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fetchOfficesByBbox).not.toHaveBeenCalled();
    expect(removeMapListener).toHaveBeenCalledWith(
      map,
      "bounds_changed",
      handleBoundsChanged,
    );
  });
});
