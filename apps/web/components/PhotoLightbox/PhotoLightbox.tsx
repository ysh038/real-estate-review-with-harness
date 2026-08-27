"use client";

import type { TReviewPhoto } from "@repo/types";
import { useCallback, useEffect, useState } from "react";

import styles from "./PhotoLightbox.module.css";

export interface IPhotoLightboxProps {
  photos: TReviewPhoto[];
  startIndex: number;
  onClose: () => void;
}

/** 리뷰 사진 전체화면 뷰어. OfficeDetailPanel과 같은 결로 portal 없이 fixed 오버레이로 띄운다. */
export const PhotoLightbox = ({ photos, startIndex, onClose }: IPhotoLightboxProps) => {
  const [index, setIndex] = useState(startIndex);
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const goToPrev = useCallback(
    () => setIndex((current) => Math.max(0, current - 1)),
    [],
  );
  const goToNext = useCallback(
    () => setIndex((current) => Math.min(photos.length - 1, current + 1)),
    [photos.length],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") goToPrev();
      else if (event.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, goToPrev, goToNext]);

  // AC21: 열려 있는 동안 배경 스크롤을 잠그고, 언마운트되면 원래대로 되돌린다.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  if (!photo) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      onClick={onClose}
    >
      <button type="button" className={styles.closeButton} aria-label="닫기" onClick={onClose}>
        ×
      </button>

      {photos.length > 1 ? (
        <p className={styles.counter}>
          {index + 1} / {photos.length}
        </p>
      ) : null}

      {hasPrev ? (
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonPrev}`}
          aria-label="이전 사진"
          onClick={(event) => {
            event.stopPropagation();
            goToPrev();
          }}
        >
          ‹
        </button>
      ) : null}

      {hasNext ? (
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonNext}`}
          aria-label="다음 사진"
          onClick={(event) => {
            event.stopPropagation();
            goToNext();
          }}
        >
          ›
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={`사진 ${index + 1}`}
        className={styles.image}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
};
