import type { TOfficeSummary } from "@repo/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOfficeMarkers } from "../../hooks/useOfficeMarkers";

const { addMapListener, removeMapListener } = vi.hoisted(() => ({
  addMapListener: vi.fn(),
  removeMapListener: vi.fn(),
}));
vi.mock("../../lib/kakaoMapEvents", () => ({ addMapListener, removeMapListener }));

const { createOfficeMarker, createMarkerClusterer } = vi.hoisted(() => ({
  createOfficeMarker: vi.fn(),
  createMarkerClusterer: vi.fn(),
}));
vi.mock("../../lib/kakaoMarkers", () => ({
  createOfficeMarker,
  createMarkerClusterer,
}));

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
  tagCounts: [],
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

/**
 * createOfficeMarker(office, onClick) 로 넘어간 클릭 핸들러를 꺼낸다 —
 * 실제 마커 클릭을 흉내낸다 (office-detail-panel AC1~AC3).
 */
const clickMarkerOf = (officeId: string): void => {
  const call = createOfficeMarker.mock.calls.find(
    (args) => (args[0] as TOfficeSummary).id === officeId,
  );
  if (!call) throw new Error(`${officeId} 마커가 생성되지 않았습니다`);
  const onClick = call[1] as (office: TOfficeSummary) => void;
  onClick(call[0] as TOfficeSummary);
};

interface IFakeClusterer {
  addMarkers: ReturnType<typeof vi.fn>;
  removeMarkers: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

let fakeClusterer: IFakeClusterer;

describe("useOfficeMarkers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchOfficesByBbox.mockReset();
    addMapListener.mockReset();
    removeMapListener.mockReset();
    createOfficeMarker.mockReset().mockImplementation((office: TOfficeSummary) => ({
      __officeId: office.id,
    }));
    fakeClusterer = { addMarkers: vi.fn(), removeMarkers: vi.fn(), clear: vi.fn() };
    createMarkerClusterer.mockReset().mockReturnValue(fakeClusterer);
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

  it("AC2(marker-clustering): 클러스터러는 지도 마운트 시 1번만 생성된다", async () => {
    fetchOfficesByBbox.mockResolvedValueOnce({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(createMarkerClusterer).toHaveBeenCalledTimes(1);

    const OFFICE_B: TOfficeSummary = { ...OFFICE_A, id: "office-b" };
    fetchOfficesByBbox.mockResolvedValueOnce({ offices: [OFFICE_B], isTruncated: false });
    const handleBoundsChanged = getBoundsChangedHandler();
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(createMarkerClusterer).toHaveBeenCalledTimes(1);
  });

  it("AC3(marker-clustering): 오피스 목록이 바뀌면 클러스터러에 마커 전체를 추가하고, 개별 마커는 map을 받지 않는다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // office-detail-panel 이후 시그니처는 (office, onClick) 이다.
    expect(createOfficeMarker).toHaveBeenCalledWith(OFFICE_A, expect.any(Function));
    const lastCall = fakeClusterer.addMarkers.mock.calls.at(-1);
    expect(lastCall?.[0]).toHaveLength(1);
  });

  it("AC4(marker-clustering): 오피스 목록이 바뀌면 이전 마커 배치를 클러스터러에서 제거한다", async () => {
    fetchOfficesByBbox.mockResolvedValueOnce({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const firstBatch = fakeClusterer.addMarkers.mock.calls[0]?.[0];

    const OFFICE_B: TOfficeSummary = { ...OFFICE_A, id: "office-b" };
    fetchOfficesByBbox.mockResolvedValueOnce({ offices: [OFFICE_B], isTruncated: false });
    const handleBoundsChanged = getBoundsChangedHandler();
    act(() => {
      handleBoundsChanged();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(fakeClusterer.removeMarkers).toHaveBeenCalledWith(firstBatch);
  });

  it("AC4(marker-clustering): 언마운트되면 그 시점의 마커 배치가 클러스터러에서 제거된다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { unmount } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const batch = fakeClusterer.addMarkers.mock.calls[0]?.[0];

    unmount();

    expect(fakeClusterer.removeMarkers).toHaveBeenCalledWith(batch);
  });

  it("AC1(office-detail-panel): 마커를 클릭하면 그 사무소가 selectedOffice 가 된다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.selectedOffice).toBeNull();

    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });

    expect(result.current.selectedOffice).toEqual(OFFICE_A);
  });

  it("AC2(office-detail-panel): 다른 마커를 클릭하면 선택이 그 사무소로 교체된다", async () => {
    const OFFICE_B: TOfficeSummary = { ...OFFICE_A, id: "office-b", name: "나 공인중개사" };
    fetchOfficesByBbox.mockResolvedValue({
      offices: [OFFICE_A, OFFICE_B],
      isTruncated: false,
    });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });
    act(() => {
      clickMarkerOf(OFFICE_B.id);
    });

    expect(result.current.selectedOffice).toEqual(OFFICE_B);
  });

  it("AC3(office-detail-panel): 이미 선택된 마커를 다시 클릭하면 선택이 해제된다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });
    expect(result.current.selectedOffice).toEqual(OFFICE_A);

    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });

    expect(result.current.selectedOffice).toBeNull();
  });

  it("AC4(office-detail-panel): clearSelection() 을 호출하면 선택이 해제된다", async () => {
    fetchOfficesByBbox.mockResolvedValue({ offices: [OFFICE_A], isTruncated: false });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedOffice).toBeNull();
  });

  it("AC5(office-detail-panel): 목록이 갱신돼 선택된 사무소가 사라지면 선택이 해제된다", async () => {
    const OFFICE_B: TOfficeSummary = { ...OFFICE_A, id: "office-b", name: "나 공인중개사" };
    fetchOfficesByBbox.mockResolvedValueOnce({
      offices: [OFFICE_A],
      isTruncated: false,
    });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });
    expect(result.current.selectedOffice).toEqual(OFFICE_A);

    // 지도를 옮겨 OFFICE_A 가 화면 밖으로 나간 상황
    fetchOfficesByBbox.mockResolvedValueOnce({
      offices: [OFFICE_B],
      isTruncated: false,
    });
    act(() => {
      getBoundsChangedHandler()();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.selectedOffice).toBeNull();
  });

  it("AC5(office-detail-panel): 목록이 갱신돼도 선택된 사무소가 남아 있으면 선택이 유지된다", async () => {
    fetchOfficesByBbox.mockResolvedValueOnce({
      offices: [OFFICE_A],
      isTruncated: false,
    });
    const map = makeFakeMap();

    const { result } = renderHook(() => useOfficeMarkers(map));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    act(() => {
      clickMarkerOf(OFFICE_A.id);
    });

    fetchOfficesByBbox.mockResolvedValueOnce({
      offices: [OFFICE_A],
      isTruncated: false,
    });
    act(() => {
      getBoundsChangedHandler()();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.selectedOffice).toEqual(OFFICE_A);
  });
});
