"use client";

import {
  DEAL_RESULTS,
  DEAL_TYPES,
  DEFECT_RESPONSES,
  EXPERTISE_LEVELS,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_TAGS,
  type TMyReview,
  type TReviewTag,
  type TUpdateReviewRequest,
} from "@repo/types";
import { useState } from "react";

import styles from "./MyReviewItem.module.css";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const NOT_SELECTED = "";

export interface IMyReviewItemProps {
  review: TMyReview;
  onUpdate: (reviewId: string, input: TUpdateReviewRequest) => Promise<void>;
  onDelete: (reviewId: string) => Promise<void>;
}

/**
 * 마이페이지 "내 리뷰" 목록의 항목 하나 — 표시 + 수정(인라인 폼) + 삭제
 * (근거: docs/specs/review-edit-and-delete-ui.md). 항목별 편집 상태가 서로
 * 독립적이어야 해서 리스트가 아니라 이 컴포넌트 자신이 폼 상태를 들고 있다.
 */
export const MyReviewItem = ({ review, onUpdate, onDelete }: IMyReviewItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState(review.rating);
  const [content, setContent] = useState(review.content);
  const [dealType, setDealType] = useState<string>(review.dealType ?? NOT_SELECTED);
  const [dealResult, setDealResult] = useState<string>(review.dealResult ?? NOT_SELECTED);
  const [expertise, setExpertise] = useState<string>(review.expertise ?? NOT_SELECTED);
  const [defectResponse, setDefectResponse] = useState<string>(
    review.defectResponse ?? NOT_SELECTED,
  );
  const [visitedYear, setVisitedYear] = useState<string>(
    review.visitedYear != null ? String(review.visitedYear) : "",
  );
  const [visitedMonth, setVisitedMonth] = useState<string>(
    review.visitedMonth != null ? String(review.visitedMonth) : NOT_SELECTED,
  );
  const [selectedTags, setSelectedTags] = useState<TReviewTag[]>(review.tags);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFieldsFromReview = () => {
    setRating(review.rating);
    setContent(review.content);
    setDealType(review.dealType ?? NOT_SELECTED);
    setDealResult(review.dealResult ?? NOT_SELECTED);
    setExpertise(review.expertise ?? NOT_SELECTED);
    setDefectResponse(review.defectResponse ?? NOT_SELECTED);
    setVisitedYear(review.visitedYear != null ? String(review.visitedYear) : "");
    setVisitedMonth(
      review.visitedMonth != null ? String(review.visitedMonth) : NOT_SELECTED,
    );
    setSelectedTags(review.tags);
    setFormError(null);
    setSubmitError(null);
  };

  const handleStartEdit = () => {
    resetFieldsFromReview();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    resetFieldsFromReview();
    setIsEditing(false);
  };

  const toggleTag = (tag: TReviewTag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selected) => selected !== tag)
        : [...current, tag],
    );
  };

  const handleDelete = async () => {
    if (!window.confirm("이 리뷰를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleteError(null);
    try {
      await onDelete(review.id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleSave = async () => {
    if (content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
      setFormError(`본문은 ${REVIEW_CONTENT_MIN_LENGTH}자 이상 입력해주세요`);
      return;
    }
    setFormError(null);
    setSubmitError(null);
    setIsSubmitting(true);

    // 사진 편집 UI는 이번 범위 밖(review-edit-and-delete-ui 범위 밖) — PATCH는
    // 전체교체라 photoKeys를 생략하면 기존 사진이 지워지므로 그대로 실어 보낸다.
    const input: TUpdateReviewRequest = {
      rating,
      content,
      ...(dealType !== NOT_SELECTED && {
        dealType: dealType as (typeof DEAL_TYPES)[number],
      }),
      ...(dealResult !== NOT_SELECTED && {
        dealResult: dealResult as (typeof DEAL_RESULTS)[number],
      }),
      ...(expertise !== NOT_SELECTED && {
        expertise: expertise as (typeof EXPERTISE_LEVELS)[number],
      }),
      ...(defectResponse !== NOT_SELECTED && {
        defectResponse: defectResponse as (typeof DEFECT_RESPONSES)[number],
      }),
      ...(visitedYear !== "" && { visitedYear: Number(visitedYear) }),
      ...(visitedMonth !== NOT_SELECTED && { visitedMonth: Number(visitedMonth) }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
      photoKeys: review.photos.map((photo) => photo.storageKey),
    };

    try {
      await onUpdate(review.id, input);
      setIsSubmitting(false);
      setIsEditing(false);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : String(error));
    }
  };

  if (isEditing) {
    return (
      <li className={styles.item}>
        <div className={styles.ratingInput} role="radiogroup" aria-label="별점">
          {RATING_OPTIONS.map((option) => (
            <label key={option} className={styles.ratingLabel}>
              <input
                type="radio"
                name={`rating-${review.id}`}
                value={option}
                checked={rating === option}
                onChange={() => setRating(option)}
                aria-label={`${option}점`}
              />
              {option}
            </label>
          ))}
        </div>
        <textarea
          className={styles.textarea}
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className={styles.dealFields}>
          <select
            className={styles.dealSelect}
            aria-label="거래유형"
            value={dealType}
            onChange={(event) => setDealType(event.target.value)}
          >
            <option value={NOT_SELECTED}>선택 안 함</option>
            {DEAL_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className={styles.dealSelect}
            aria-label="거래결과"
            value={dealResult}
            onChange={(event) => setDealResult(event.target.value)}
          >
            <option value={NOT_SELECTED}>선택 안 함</option>
            {DEAL_RESULTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={styles.yearInput}
            aria-label="방문 연도"
            value={visitedYear}
            onChange={(event) => setVisitedYear(event.target.value)}
          />
          <select
            className={styles.dealSelect}
            aria-label="방문 월"
            value={visitedMonth}
            onChange={(event) => setVisitedMonth(event.target.value)}
          >
            <option value={NOT_SELECTED}>선택 안 함</option>
            {MONTH_OPTIONS.map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </select>
          <select
            className={styles.dealSelect}
            aria-label="전문성"
            value={expertise}
            onChange={(event) => setExpertise(event.target.value)}
          >
            <option value={NOT_SELECTED}>선택 안 함</option>
            {EXPERTISE_LEVELS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className={styles.dealSelect}
            aria-label="하자 대응"
            value={defectResponse}
            onChange={(event) => setDefectResponse(event.target.value)}
          >
            <option value={NOT_SELECTED}>선택 안 함</option>
            {DEFECT_RESPONSES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.tagChipGroup} role="group" aria-label="태그">
          {REVIEW_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={
                selectedTags.includes(tag)
                  ? `${styles.tagChip} ${styles.tagChipSelected}`
                  : styles.tagChip
              }
              aria-pressed={selectedTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}
        {!formError && submitError ? (
          <p className={styles.formError} role="alert">
            {submitError}
          </p>
        ) : null}
        <div className={styles.editActions}>
          <button
            type="button"
            className={styles.saveButton}
            disabled={isSubmitting}
            onClick={() => void handleSave()}
          >
            저장
          </button>
          <button type="button" className={styles.cancelButton} onClick={handleCancelEdit}>
            취소
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.officeName}>{review.officeName}</span>
        <span className={styles.rating} aria-label={`${review.rating}점`}>
          {"★".repeat(review.rating)}
          {"☆".repeat(5 - review.rating)}
        </span>
      </div>
      <p className={styles.content}>{review.content}</p>
      {review.isHidden ? (
        <p className={styles.hiddenNotice}>신고 누적으로 숨김</p>
      ) : null}
      {deleteError ? (
        <p className={styles.formError} role="alert">
          {deleteError}
        </p>
      ) : null}
      <div className={styles.itemActions}>
        <button type="button" className={styles.editButton} onClick={handleStartEdit}>
          수정
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => void handleDelete()}
        >
          삭제
        </button>
      </div>
    </li>
  );
};
