"use client";

import type { TReviewTag } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

export interface IReviewDraft {
  rating: number;
  content: string;
  dealType: string;
  dealResult: string;
  visitedYear: string;
  visitedMonth: string;
  tags: TReviewTag[];
}

export interface IUseReviewDraftResult {
  /** 재진입 시 복원할 초안이 있으면 채워진다 — content가 비어 있는 초안은 배너를 띄우지 않는다. */
  draftBanner: IReviewDraft | null;
  /** 배너만 감추고 storage는 그대로 둔다(원본 ReviewForm.handleRestoreDraft와 동일). */
  restoreDraft: () => IReviewDraft | null;
  /** 배너를 감추고 storage도 지운다(원본 ReviewForm.handleDismissDraft와 동일). */
  dismissDraft: () => void;
  saveDraft: (draft: IReviewDraft) => void;
  clearDraft: () => void;
}

const getDraftKey = (officeId: string) => `review-draft-${officeId}`;

const isEmptyDraft = (draft: IReviewDraft) =>
  draft.rating === 0 &&
  draft.content.length === 0 &&
  draft.dealType === "" &&
  draft.dealResult === "" &&
  draft.visitedYear === "" &&
  draft.visitedMonth === "" &&
  draft.tags.length === 0;

const loadDraft = (officeId: string): IReviewDraft | null => {
  try {
    const raw = localStorage.getItem(getDraftKey(officeId));
    if (!raw) return null;
    return JSON.parse(raw) as IReviewDraft;
  } catch {
    return null;
  }
};

/**
 * 리뷰 작성 폼의 임시저장(review-ux-consistency-and-draft AC10-16). ReviewSection의
 * 필드별 useState는 그대로 두고, 이 훅은 localStorage 동기화·이탈 경고만 맡는다.
 */
export const useReviewDraft = (
  officeId: string,
  content: string,
): IUseReviewDraftResult => {
  const [draftBanner, setDraftBanner] = useState<IReviewDraft | null>(null);

  useEffect(() => {
    const draft = loadDraft(officeId);
    setDraftBanner(draft && draft.content.length > 0 ? draft : null);
  }, [officeId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (content.length > 0) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [content]);

  const saveDraft = useCallback(
    (draft: IReviewDraft) => {
      if (isEmptyDraft(draft)) {
        localStorage.removeItem(getDraftKey(officeId));
      } else {
        localStorage.setItem(getDraftKey(officeId), JSON.stringify(draft));
      }
    },
    [officeId],
  );

  const clearDraft = useCallback(() => {
    localStorage.removeItem(getDraftKey(officeId));
  }, [officeId]);

  const restoreDraft = useCallback((): IReviewDraft | null => {
    setDraftBanner(null);
    return draftBanner;
  }, [draftBanner]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setDraftBanner(null);
  }, [clearDraft]);

  return { draftBanner, restoreDraft, dismissDraft, saveDraft, clearDraft };
};
