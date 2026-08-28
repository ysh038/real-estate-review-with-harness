"use client";

import {
  DEAL_RESULTS,
  DEAL_TYPES,
  DEFECT_RESPONSES,
  EXPERTISE_LEVELS,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_PHOTOS_MAX,
  REVIEW_TAGS,
  type TMyReview,
  type TReviewPhoto,
  type TReviewTag,
  type TUpdateReviewRequest,
} from "@repo/types";
import { useState } from "react";

import styles from "./MyReviewItem.module.css";
import { Button } from "../../design-system/components/Button";
import { DealFieldSet, type TDealField } from "../../design-system/components/DealFieldSet";
import { FormError } from "../../design-system/components/FormError";
import { PhotoUploader, type IPhotoItem } from "../../design-system/components/PhotoUploader";
import { RatingDisplay } from "../../design-system/components/RatingDisplay";
import { RatingInput } from "../../design-system/components/RatingInput";
import { TagChipGroup } from "../../design-system/components/TagChipGroup";
import { TextArea } from "../../design-system/components/TextArea";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const NOT_SELECTED = "";
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// design-system-review-organisms: DealFieldSet은 도메인 옵션을 모른다 — ReviewSection과
// 같은 매핑을 이 파일에도 둔다(옵션 자체가 4~5줄이라 공용 유틸로 뺄 이득이 작다).
const DEAL_TYPE_OPTIONS = DEAL_TYPES.map((option) => ({ value: option, label: option }));
const DEAL_RESULT_OPTIONS = DEAL_RESULTS.map((option) => ({ value: option, label: option }));
const EXPERTISE_OPTIONS = EXPERTISE_LEVELS.map((option) => ({ value: option, label: option }));
const DEFECT_RESPONSE_OPTIONS = DEFECT_RESPONSES.map((option) => ({
  value: option,
  label: option,
}));
const MONTH_SELECT_OPTIONS = MONTH_OPTIONS.map((month) => ({
  value: String(month),
  label: `${month}월`,
}));

const KEPT_ID_PREFIX = "kept-";
const NEW_ID_PREFIX = "new-";

export interface IMyReviewItemProps {
  review: TMyReview;
  /**
   * newPhotoFiles가 있으면 훅(useMyReviews)이 먼저 업로드해 photoKeys 뒤에
   * 이어붙인다(review-edit-photo-changes AC8).
   */
  onUpdate: (
    reviewId: string,
    input: TUpdateReviewRequest,
    newPhotoFiles?: File[],
  ) => Promise<void>;
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
  const [keptPhotos, setKeptPhotos] = useState<TReviewPhoto[]>(review.photos);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
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
    setKeptPhotos(review.photos);
    setNewPhotoFiles([]);
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

  const handleDealFieldChange = (field: TDealField, value: string) => {
    switch (field) {
      case "dealType":
        setDealType(value);
        break;
      case "dealResult":
        setDealResult(value);
        break;
      case "visitedYear":
        setVisitedYear(value);
        break;
      case "visitedMonth":
        setVisitedMonth(value);
        break;
      case "expertise":
        setExpertise(value);
        break;
      case "defectResponse":
        setDefectResponse(value);
        break;
    }
  };

  const removeKeptPhoto = (index: number) => {
    setKeptPhotos((current) => current.filter((_, i) => i !== index));
  };

  const addNewPhotoFiles = (files: File[]) => {
    setNewPhotoFiles((current) => {
      const room = REVIEW_PHOTOS_MAX - keptPhotos.length - current.length;
      return [...current, ...files.slice(0, room)];
    });
  };

  const removeNewPhotoFile = (index: number) => {
    setNewPhotoFiles((current) => current.filter((_, i) => i !== index));
  };

  // design-system-review-organisms: 기존 사진 + 새 파일 두 리스트를 PhotoUploader
  // 하나가 받는 평평한 items로 합친다. id 접두사로 삭제 시 어느 리스트인지 구분하고,
  // removeLabel은 각자의 로컬 인덱스로 미리 계산해 둔다(합친 뒤의 전역 인덱스로는
  // "새 사진 1 삭제"를 재구성할 수 없다 — PhotoUploader 확장 설계 메모 참고).
  const photoItems: IPhotoItem[] = [
    ...keptPhotos.map((photo, index) => ({
      id: `${KEPT_ID_PREFIX}${index}`,
      src: photo.url,
      alt: `기존 사진 ${index + 1}`,
      removeLabel: `기존 사진 ${index + 1} 삭제`,
    })),
    ...newPhotoFiles.map((file, index) => ({
      id: `${NEW_ID_PREFIX}${index}`,
      src: URL.createObjectURL(file),
      alt: `새 사진 ${index + 1}`,
      removeLabel: `새 사진 ${index + 1} 삭제`,
    })),
  ];

  const handleRemovePhotoItem = (id: string) => {
    if (id.startsWith(KEPT_ID_PREFIX)) {
      removeKeptPhoto(Number(id.slice(KEPT_ID_PREFIX.length)));
    } else {
      removeNewPhotoFile(Number(id.slice(NEW_ID_PREFIX.length)));
    }
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

    // PATCH는 전체교체라 photoKeys를 생략하면 기존 사진이 지워진다 — 남은 기존
    // 사진(keptPhotos)을 실어 보내고, 새로 고른 파일은 onUpdate가 업로드해 뒤에
    // 이어붙인다(review-edit-photo-changes).
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
      photoKeys: keptPhotos.map((photo) => photo.storageKey),
    };

    try {
      // newPhotoFiles가 비어 있으면 onUpdate를 2개 인자로 호출한다 — 호출
      // 시그니처를 사진 없는 기존 흐름과 동일하게 유지한다(office-search-bar 등
      // 다른 곳의 "인자 개수까지 비교" 관례와 동일한 이유).
      if (newPhotoFiles.length > 0) {
        await onUpdate(review.id, input, newPhotoFiles);
      } else {
        await onUpdate(review.id, input);
      }
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
        <RatingInput name={`rating-${review.id}`} value={rating} onChange={setRating} />
        <TextArea value={content} onChange={(event) => setContent(event.target.value)} />
        <DealFieldSet
          values={{
            dealType,
            dealResult,
            visitedYear,
            visitedMonth,
            expertise,
            defectResponse,
          }}
          onChange={handleDealFieldChange}
          dealTypeOptions={DEAL_TYPE_OPTIONS}
          dealResultOptions={DEAL_RESULT_OPTIONS}
          monthOptions={MONTH_SELECT_OPTIONS}
          expertiseOptions={EXPERTISE_OPTIONS}
          defectResponseOptions={DEFECT_RESPONSE_OPTIONS}
        />
        <PhotoUploader
          items={photoItems}
          max={REVIEW_PHOTOS_MAX}
          accept={ALLOWED_PHOTO_TYPES.join(",")}
          onAdd={addNewPhotoFiles}
          onRemove={handleRemovePhotoItem}
        />
        <TagChipGroup
          options={[...REVIEW_TAGS]}
          selected={selectedTags}
          onToggle={(tag) => toggleTag(tag as TReviewTag)}
        />
        {formError ? <FormError>{formError}</FormError> : null}
        {!formError && submitError ? <FormError>{submitError}</FormError> : null}
        <div className={styles.editActions}>
          <Button variant="primary" disabled={isSubmitting} onClick={() => void handleSave()}>
            저장
          </Button>
          <Button variant="ghost" onClick={handleCancelEdit}>
            취소
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={styles.officeName}>{review.officeName}</span>
        <RatingDisplay value={review.rating} />
      </div>
      <p className={styles.content}>{review.content}</p>
      {review.isHidden ? (
        <p className={styles.hiddenNotice}>신고 누적으로 숨김</p>
      ) : null}
      {deleteError ? <FormError>{deleteError}</FormError> : null}
      <div className={styles.itemActions}>
        <Button variant="ghost" onClick={handleStartEdit}>
          수정
        </Button>
        <Button variant="ghost" onClick={() => void handleDelete()}>
          삭제
        </Button>
      </div>
    </li>
  );
};
