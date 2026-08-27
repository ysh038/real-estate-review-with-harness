import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReviewDraft, type IReviewDraft } from "../../hooks/useReviewDraft";

const OFFICE_ID = "office-1";
const DRAFT_KEY = `review-draft-${OFFICE_ID}`;

const EMPTY_DRAFT: IReviewDraft = {
  rating: 0,
  content: "",
  dealType: "",
  dealResult: "",
  expertise: "",
  defectResponse: "",
  visitedYear: "",
  visitedMonth: "",
  tags: [],
};

const FILLED_DRAFT: IReviewDraft = {
  rating: 4,
  content: "친절했어요",
  dealType: "전세",
  dealResult: "계약함",
  expertise: "전문적이었음",
  defectResponse: "원만히 해결됨",
  visitedYear: "2026",
  visitedMonth: "3",
  tags: ["친절함"],
};

describe("useReviewDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC10: 값이 있는 필드가 하나라도 있으면 saveDraft 호출 시 localStorage에 저장한다", () => {
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    act(() => {
      result.current.saveDraft(FILLED_DRAFT);
    });

    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!)).toEqual(FILLED_DRAFT);
  });

  it("AC10(review-structured-survey): 전문성·하자 대응만 값이 있어도 저장된다", () => {
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    act(() => {
      result.current.saveDraft({
        ...EMPTY_DRAFT,
        expertise: "전문적이었음",
        defectResponse: "하자 없었음",
      });
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY)!);
    expect(stored.expertise).toBe("전문적이었음");
    expect(stored.defectResponse).toBe("하자 없었음");
  });

  it("AC11: 모든 필드가 빈 값으로 돌아오면 저장된 키를 완전히 지운다", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(FILLED_DRAFT));
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    act(() => {
      result.current.saveDraft(EMPTY_DRAFT);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("AC12: content가 있는 초안이 있으면 재진입 시 draftBanner로 노출된다", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(FILLED_DRAFT));

    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    expect(result.current.draftBanner).toEqual(FILLED_DRAFT);
  });

  it("AC12: content가 빈 초안은 재진입해도 draftBanner로 노출되지 않는다", () => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...FILLED_DRAFT, content: "" }),
    );

    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    expect(result.current.draftBanner).toBeNull();
  });

  it("AC13: restoreDraft는 배너를 감추지만 storage는 그대로 둔다", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(FILLED_DRAFT));
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    let restored: IReviewDraft | null = null;
    act(() => {
      restored = result.current.restoreDraft();
    });

    expect(restored).toEqual(FILLED_DRAFT);
    expect(result.current.draftBanner).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
  });

  it("AC14: dismissDraft는 배너를 감추고 storage도 지운다", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(FILLED_DRAFT));
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    act(() => {
      result.current.dismissDraft();
    });

    expect(result.current.draftBanner).toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("AC15: clearDraft를 호출하면 storage의 초안이 삭제된다", () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(FILLED_DRAFT));
    const { result } = renderHook(() => useReviewDraft(OFFICE_ID, ""));

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("AC16: content가 있으면 beforeunload에서 preventDefault가 호출된다", () => {
    renderHook(() => useReviewDraft(OFFICE_ID, "작성 중인 내용"));

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("AC16: content가 비어 있으면 beforeunload에서 preventDefault가 호출되지 않는다", () => {
    renderHook(() => useReviewDraft(OFFICE_ID, ""));

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
