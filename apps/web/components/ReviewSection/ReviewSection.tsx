"use client";

import {
  DEAL_RESULTS,
  DEAL_TYPES,
  DEFECT_RESPONSES,
  EXPERTISE_LEVELS,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_PHOTOS_MAX,
  REVIEW_TAGS,
  type TReview,
  type TReviewSort,
  type TReviewTag,
} from "@repo/types";
import { useEffect, useState } from "react";

import styles from "./ReviewSection.module.css";
import { useOfficeReviews } from "../../hooks/useOfficeReviews";
import { useReviewDraft } from "../../hooks/useReviewDraft";
import { useSession } from "../../hooks/useSession";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { PhotoLightbox } from "../PhotoLightbox";
import { ReviewListSkeleton } from "../Skeleton";

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface ILightboxTarget {
  reviewId: string;
  index: number;
}

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const NOT_SELECTED = "";
const SORT_OPTIONS: { value: TReviewSort; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "oldest", label: "오래된순" },
];
const REVIEW_ANCHOR_PREFIX = "review-";
const COPY_CONFIRMATION_MS = 2000;
const HIGHLIGHT_MS = 2000;

/** 거래유형·거래결과·방문시기 중 있는 것만 "·"로 이어 붙인다. 전부 없으면 null. */
const formatDealInfo = (review: TReview): string | null => {
  const parts = [
    review.dealType,
    review.dealResult,
    review.visitedYear != null && review.visitedMonth != null
      ? `${review.visitedYear}년 ${review.visitedMonth}월`
      : null,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(" · ") : null;
};

export interface IReviewSectionProps {
  officeId: string;
}

/**
 * 사무소 상세 패널 안에 붙는 리뷰 목록 + 작성 폼. 세션(누가 로그인했는지)과 리뷰 데이터는
 * 서로 다른 관심사라 훅을 따로 쓴다 (근거: docs/specs/review-list-and-write-ui.md 설계 메모).
 */
export const ReviewSection = ({ officeId }: IReviewSectionProps) => {
  const { status } = useSession();
  const {
    detail,
    reviews,
    nextCursor,
    isLoading,
    error,
    isSubmitting,
    submitError,
    loadMore,
    submitReview,
    toggleHelpful,
    sort,
    setSort,
    reportedReviewIds,
    reportError,
    reportReview,
  } = useOfficeReviews(officeId);

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState("");
  const [dealType, setDealType] = useState<string>(NOT_SELECTED);
  const [dealResult, setDealResult] = useState<string>(NOT_SELECTED);
  const [expertise, setExpertise] = useState<string>(NOT_SELECTED);
  const [defectResponse, setDefectResponse] = useState<string>(NOT_SELECTED);
  const [visitedYear, setVisitedYear] = useState<string>("");
  const [visitedMonth, setVisitedMonth] = useState<string>(NOT_SELECTED);
  const [selectedTags, setSelectedTags] = useState<TReviewTag[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);
  const [highlightedReviewId, setHighlightedReviewId] = useState<
    string | null
  >(null);
  const [lightboxTarget, setLightboxTarget] = useState<ILightboxTarget | null>(
    null,
  );

  const { draftBanner, restoreDraft, dismissDraft, saveDraft, clearDraft } =
    useReviewDraft(officeId, content);

  // 필드가 하나라도 바뀌면 초안을 동기화한다(review-ux-consistency-and-draft AC10-11).
  useEffect(() => {
    saveDraft({
      rating,
      content,
      dealType,
      dealResult,
      expertise,
      defectResponse,
      visitedYear,
      visitedMonth,
      tags: selectedTags,
    });
  }, [
    saveDraft,
    rating,
    content,
    dealType,
    dealResult,
    expertise,
    defectResponse,
    visitedYear,
    visitedMonth,
    selectedTags,
  ]);

  const handleRestoreDraft = () => {
    const draft = restoreDraft();
    if (!draft) return;
    setRating(draft.rating);
    setContent(draft.content);
    setDealType(draft.dealType);
    setDealResult(draft.dealResult);
    setExpertise(draft.expertise);
    setDefectResponse(draft.defectResponse);
    setVisitedYear(draft.visitedYear);
    setVisitedMonth(draft.visitedMonth);
    setSelectedTags(draft.tags);
  };

  // 개별 리뷰 퍼머링크(review-permalink-report-and-sort AC12): 이미 로드된 목록
  // 안에 해시가 가리키는 리뷰가 있으면 스크롤 + 잠깐 강조한다.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith(`#${REVIEW_ANCHOR_PREFIX}`)) return undefined;
    const targetId = hash.slice(`#${REVIEW_ANCHOR_PREFIX}`.length);
    if (!reviews.some((review) => review.id === targetId)) return undefined;

    document
      .getElementById(`${REVIEW_ANCHOR_PREFIX}${targetId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedReviewId(targetId);
    const timer = setTimeout(() => setHighlightedReviewId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [reviews]);

  const handleCopyLink = async (reviewId: string) => {
    const url = `${window.location.origin}/offices/${officeId}#${REVIEW_ANCHOR_PREFIX}${reviewId}`;
    await navigator.clipboard.writeText(url);
    setCopiedReviewId(reviewId);
    setTimeout(
      () =>
        setCopiedReviewId((current) => (current === reviewId ? null : current)),
      COPY_CONFIRMATION_MS,
    );
  };

  const toggleTag = (tag: TReviewTag) => {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((selected) => selected !== tag)
        : [...current, tag],
    );
  };

  const handlePhotoFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const room = REVIEW_PHOTOS_MAX - photoFiles.length;
    setPhotoFiles((current) => [...current, ...selected.slice(0, room)]);
    // 같은 파일을 다시 선택해도 change가 발생하도록 초기화한다.
    event.target.value = "";
  };

  const removePhotoFile = (index: number) => {
    setPhotoFiles((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (rating < 1) {
      setFormError("별점을 선택해주세요");
      return;
    }
    if (content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
      setFormError(`본문은 ${REVIEW_CONTENT_MIN_LENGTH}자 이상 입력해주세요`);
      return;
    }
    // AC5(review-deal-and-visit-fields): 방문 연도와 월은 함께 있거나 함께 없어야 한다.
    if ((visitedYear === "") !== (visitedMonth === NOT_SELECTED)) {
      setFormError("방문 연도와 방문 월은 함께 입력하거나 함께 비워주세요");
      return;
    }
    setFormError(null);

    const reviewInput = {
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
    };
    // photoFiles가 비어 있으면 두 번째 인자를 아예 생략한다 — undefined를 명시적으로
    // 넘기는 것과 인자를 생략하는 것은 호출 형태가 달라(테스트의 toHaveBeenCalledWith가
    // 인자 개수까지 비교) 기존 사진 없는 흐름의 호출 시그니처를 그대로 지킨다.
    const wasSubmitted =
      photoFiles.length > 0
        ? await submitReview(reviewInput, photoFiles)
        : await submitReview(reviewInput);
    if (wasSubmitted) {
      setRating(0);
      setContent("");
      setDealType(NOT_SELECTED);
      setDealResult(NOT_SELECTED);
      setExpertise(NOT_SELECTED);
      setDefectResponse(NOT_SELECTED);
      setVisitedYear("");
      setVisitedMonth(NOT_SELECTED);
      setSelectedTags([]);
      setPhotoFiles([]);
      clearDraft();
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.summary}>
        {detail && detail.reviewCount > 0 ? (
          <p className={styles.summaryText}>
            ★ {detail.avgRating} · 리뷰 {detail.reviewCount}개
          </p>
        ) : (
          <EmptyState message="아직 리뷰가 없습니다" />
        )}
        {detail && detail.tagCounts.length > 0 ? (
          <ul className={styles.tagList}>
            {detail.tagCounts.map(({ tag, count }) => (
              <li key={tag} className={styles.tagBadge}>
                {tag} {count}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {isLoading ? <ReviewListSkeleton /> : null}
      {error ? <ErrorState message="리뷰를 불러오지 못했습니다" /> : null}
      {reportError ? (
        <p className={styles.statusError} role="alert">
          {reportError.message}
        </p>
      ) : null}

      {reviews.length > 0 ? (
        <div className={styles.sortToggle} role="group" aria-label="정렬">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={sort === option.value}
              className={
                sort === option.value
                  ? `${styles.sortButton} ${styles.sortButtonActive}`
                  : styles.sortButton
              }
              onClick={() => setSort(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <ul className={styles.list}>
        {reviews.map((review) => (
          <li
            key={review.id}
            id={`${REVIEW_ANCHOR_PREFIX}${review.id}`}
            className={
              review.id === highlightedReviewId
                ? `${styles.item} ${styles.itemHighlighted}`
                : styles.item
            }
          >
            <div className={styles.itemHeader}>
              <span className={styles.nickname}>{review.author.nickname}</span>
              <span className={styles.rating} aria-label={`${review.rating}점`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </span>
            </div>
            <p className={styles.content}>{review.content}</p>
            {formatDealInfo(review) ? (
              <p className={styles.dealInfo}>{formatDealInfo(review)}</p>
            ) : null}
            {review.expertise ? (
              <p className={styles.dealInfo}>전문성: {review.expertise}</p>
            ) : null}
            {review.defectResponse ? (
              <p className={styles.dealInfo}>하자 대응: {review.defectResponse}</p>
            ) : null}
            {review.tags.length > 0 ? (
              <ul className={styles.tagList}>
                {review.tags.map((tag) => (
                  <li key={tag} className={styles.tagBadge}>
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
            {review.photos.length > 0 ? (
              <ul className={styles.photoThumbnailList}>
                {review.photos.map((photo, index) => (
                  <li key={photo.storageKey}>
                    <button
                      type="button"
                      className={styles.photoThumbnailButton}
                      onClick={() =>
                        setLightboxTarget({ reviewId: review.id, index })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`리뷰 사진 ${index + 1}`}
                        className={styles.photoThumbnailImage}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className={styles.itemActions}>
              <button
                type="button"
                className={styles.helpfulButton}
                aria-pressed={review.isHelpful === true}
                disabled={status !== "authenticated"}
                onClick={() => void toggleHelpful(review.id)}
              >
                도움돼요 {review.helpfulCount}
              </button>
              <button
                type="button"
                className={styles.copyLinkButton}
                onClick={() => void handleCopyLink(review.id)}
              >
                {copiedReviewId === review.id ? "복사됨" : "링크 복사"}
              </button>
              {status === "authenticated" ? (
                <button
                  type="button"
                  className={styles.reportButton}
                  disabled={reportedReviewIds.has(review.id)}
                  onClick={() => void reportReview(review.id)}
                >
                  {reportedReviewIds.has(review.id) ? "신고됨" : "신고"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {nextCursor ? (
        <button
          type="button"
          className={styles.loadMoreButton}
          onClick={() => void loadMore()}
        >
          더보기
        </button>
      ) : null}

      {status === "authenticated" && draftBanner ? (
        <div className={styles.draftBanner}>
          <span>이어서 작성하시겠어요?</span>
          <div className={styles.draftBannerActions}>
            <button
              type="button"
              className={styles.draftBannerButton}
              onClick={handleRestoreDraft}
            >
              복원
            </button>
            <button
              type="button"
              className={styles.draftBannerButton}
              onClick={dismissDraft}
            >
              새로 작성
            </button>
          </div>
        </div>
      ) : null}

      {status === "authenticated" ? (
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <div className={styles.ratingInput} role="radiogroup" aria-label="별점">
            {RATING_OPTIONS.map((option) => (
              <label key={option} className={styles.ratingLabel}>
                <input
                  type="radio"
                  name="rating"
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
            placeholder="이용 경험을 10자 이상 남겨주세요"
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
              placeholder="방문 연도"
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
          <div className={styles.photoSection}>
            {photoFiles.length > 0 ? (
              <ul className={styles.photoPreviewList}>
                {photoFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`} className={styles.photoPreviewItem}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`첨부 사진 ${index + 1}`}
                      className={styles.photoPreviewImage}
                    />
                    <button
                      type="button"
                      className={styles.photoRemoveButton}
                      aria-label={`사진 ${index + 1} 삭제`}
                      onClick={() => removePhotoFile(index)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {photoFiles.length < REVIEW_PHOTOS_MAX ? (
              <label className={styles.photoAddLabel}>
                + 사진 추가
                <input
                  type="file"
                  aria-label="사진 추가"
                  accept={ALLOWED_PHOTO_TYPES.join(",")}
                  multiple
                  className={styles.photoFileInput}
                  onChange={handlePhotoFilesChange}
                />
              </label>
            ) : null}
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
              {submitError.message}
            </p>
          ) : null}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? photoFiles.length > 0
                ? "사진 업로드 중..."
                : "등록 중..."
              : "등록"}
          </button>
        </form>
      ) : (
        <p className={styles.loginPrompt}>로그인하면 리뷰를 남길 수 있어요</p>
      )}

      {lightboxTarget ? (
        <PhotoLightbox
          photos={
            reviews.find((review) => review.id === lightboxTarget.reviewId)
              ?.photos ?? []
          }
          startIndex={lightboxTarget.index}
          onClose={() => setLightboxTarget(null)}
        />
      ) : null}
    </section>
  );
};
