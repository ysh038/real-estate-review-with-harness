"use client";

import type { TOfficeSummary } from "@repo/types";
import { Fragment, useId, useState, type KeyboardEvent } from "react";

import styles from "./OfficeSearchBar.module.css";
import { Chip } from "../../design-system/components/Chip";
import { Input } from "../../design-system/components/Input";
import type { IKakaoPlace, TPlaceCategoryCode } from "../../hooks/useKakaoPlacesSearch";
import { PLACE_CATEGORIES, useKakaoPlacesSearch } from "../../hooks/useKakaoPlacesSearch";
import { useOfficeSearch } from "../../hooks/useOfficeSearch";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";

export interface IOfficeSearchBarProps {
  onSelect: (office: TOfficeSummary) => void;
  /** kakao-places-location-search: 장소 선택은 사무소 선택과 별개 콜백이다. */
  onSelectPlace: (place: IKakaoPlace) => void;
}

type TEntry =
  | { type: "office"; office: TOfficeSummary }
  | { type: "place"; place: IKakaoPlace };

const getEntryKey = (entry: TEntry) =>
  entry.type === "office" ? entry.office.id : entry.place.id;

/**
 * 사무소 이름·주소(우리 DB) + 지역명·장소(카카오 Places) 검색 콤보박스. 지도 위에
 * 떠서 결과 선택 시 지도 이동·패널 오픈을 트리거한다 — 실제 이동은 `KakaoMap`이
 * `onSelect`/`onSelectPlace`로 받아 처리한다(단일 책임 유지).
 */
export const OfficeSearchBar = ({ onSelect, onSelectPlace }: IOfficeSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [categoryCode, setCategoryCode] = useState<TPlaceCategoryCode | null>(null);
  const { results, isLoading, error } = useOfficeSearch(query);
  const { places } = useKakaoPlacesSearch(query, categoryCode);
  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  const entries: TEntry[] = [
    ...results.map((office): TEntry => ({ type: "office", office })),
    ...places.map((place): TEntry => ({ type: "place", place })),
  ];
  // kakao-places-location-search AC8·AC9: 두 섹션이 공존할 때만 라벨을 보여준다 —
  // 한쪽만 있으면 기존처럼 라벨 없는 단일 목록.
  const isSectionLabelShown = results.length > 0 && places.length > 0;

  const toggleCategory = (code: TPlaceCategoryCode) => {
    setCategoryCode((current) => (current === code ? null : code));
  };

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setHighlightedIndex(-1);
  };

  const handleSelectEntry = (entry: TEntry) => {
    if (entry.type === "office") {
      onSelect(entry.office);
      setQuery(entry.office.name);
    } else {
      onSelectPlace(entry.place);
      setQuery(entry.place.placeName);
    }
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || entries.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      if (highlightedIndex < 0) return;
      event.preventDefault();
      handleSelectEntry(entries[highlightedIndex]!);
    } else if (event.key === "Escape") {
      closeDropdown();
    }
  };

  const isEmptyState =
    isOpen &&
    !isLoading &&
    !error &&
    query.trim().length > 0 &&
    entries.length === 0;

  return (
    <div className={styles.wrapper}>
      <Input
        label="사무소 검색"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined
        }
        placeholder="사무소 이름·주소·지역명 검색"
        className={styles.input}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <ul className={styles.categoryFilter} aria-label="장소 종류 필터">
        {PLACE_CATEGORIES.map(({ code, label }) => {
          const isSelected = categoryCode === code;
          return (
            <li key={code}>
              <Chip
                selected={isSelected}
                onToggle={() => toggleCategory(code)}
                className={styles.categoryChip}
              >
                {label}
              </Chip>
            </li>
          );
        })}
      </ul>
      {isOpen ? (
        <ul id={listboxId} role="listbox" className={styles.dropdown}>
          {entries.map((entry, index) => (
            <Fragment key={getEntryKey(entry)}>
              {isSectionLabelShown && index === 0 ? (
                <li className={styles.sectionLabel} role="presentation">
                  사무소
                </li>
              ) : null}
              {isSectionLabelShown && entry.type === "place" && index === results.length ? (
                <li className={styles.sectionLabel} role="presentation">
                  장소
                </li>
              ) : null}
              <li
                id={getOptionId(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                className={
                  index === highlightedIndex ? styles.optionActive : styles.option
                }
                onClick={() => handleSelectEntry(entry)}
              >
                {entry.type === "office" ? (
                  <>
                    <span className={styles.optionName}>{entry.office.name}</span>
                    <span className={styles.optionAddress}>{entry.office.address}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.optionName}>{entry.place.placeName}</span>
                    <span className={styles.optionAddress}>{entry.place.addressName}</span>
                  </>
                )}
              </li>
            </Fragment>
          ))}
          {isLoading ? (
            <li className={styles.loadingState}>검색 중…</li>
          ) : null}
          {error ? (
            <li>
              <ErrorState message="검색에 실패했습니다" />
            </li>
          ) : null}
          {isEmptyState ? (
            <li>
              <EmptyState message="검색 결과가 없습니다" />
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
};
