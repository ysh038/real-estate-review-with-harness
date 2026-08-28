"use client";

import type { TOfficeSummary } from "@repo/types";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import styles from "./OfficeDetailPanel.module.css";
import { Button } from "../../design-system/components/Button";
import { OfficeInfoFields } from "../OfficeInfoFields";
import { ReviewSection } from "../ReviewSection";

export interface IOfficeDetailPanelProps {
  office: TOfficeSummary;
  onClose: () => void;
}

/**
 * 사무소 정보만 보여주는 프레젠테이션 컴포넌트 — 선택 상태는 useOfficeMarkers 가 들고 있다.
 *
 * 비모달이다(`aria-modal` 없음): 패널이 열려 있어도 지도를 드래그·확대하고 다른 마커를
 * 클릭할 수 있어야 한다. 포커스 트랩이 없으므로 aria-modal 을 붙이면 보조기기에 거짓말이
 * 된다 (근거: docs/specs/office-detail-panel.md 설계 메모).
 */
export const OfficeDetailPanel = ({
  office,
  onClose,
}: IOfficeDetailPanelProps) => {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside className={styles.panel} role="dialog" aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 className={styles.title} id={titleId}>
          {office.name}
        </h2>
        <Button
          variant="ghost"
          className={styles.closeButton}
          onClick={onClose}
          ref={closeButtonRef}
        >
          닫기
        </Button>
      </div>
      <OfficeInfoFields office={office} />
      <Link className={styles.detailLink} href={`/offices/${office.id}`}>
        상세 페이지 보기
      </Link>
      <ReviewSection officeId={office.id} />
    </aside>
  );
};
