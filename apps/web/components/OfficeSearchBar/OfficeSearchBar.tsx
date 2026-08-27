"use client";

import type { TOfficeSummary } from "@repo/types";
import { useId, useState, type KeyboardEvent } from "react";

import styles from "./OfficeSearchBar.module.css";
import { useOfficeSearch } from "../../hooks/useOfficeSearch";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";

export interface IOfficeSearchBarProps {
  onSelect: (office: TOfficeSummary) => void;
}

/**
 * 사무소 이름·주소 검색 콤보박스. 지도 위에 떠서 결과 선택 시 지도 이동·패널 오픈을
 * 트리거한다 — 실제 이동은 `KakaoMap`이 `onSelect`로 받아 처리한다(단일 책임 유지).
 */
export const OfficeSearchBar = ({ onSelect }: IOfficeSearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { results, isLoading, error } = useOfficeSearch(query);
  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  const closeDropdown = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setHighlightedIndex(-1);
  };

  const handleSelect = (office: TOfficeSummary) => {
    onSelect(office);
    setQuery(office.name);
    closeDropdown();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      if (highlightedIndex < 0) return;
      event.preventDefault();
      handleSelect(results[highlightedIndex]!);
    } else if (event.key === "Escape") {
      closeDropdown();
    }
  };

  const isEmptyState =
    isOpen &&
    !isLoading &&
    !error &&
    query.trim().length > 0 &&
    results.length === 0;

  return (
    <div className={styles.wrapper}>
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          highlightedIndex >= 0 ? getOptionId(highlightedIndex) : undefined
        }
        placeholder="사무소 이름·주소 검색"
        className={styles.input}
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {isOpen ? (
        <ul id={listboxId} role="listbox" className={styles.dropdown}>
          {results.map((office, index) => (
            <li
              key={office.id}
              id={getOptionId(index)}
              role="option"
              aria-selected={index === highlightedIndex}
              className={
                index === highlightedIndex ? styles.optionActive : styles.option
              }
              onClick={() => handleSelect(office)}
            >
              <span className={styles.optionName}>{office.name}</span>
              <span className={styles.optionAddress}>{office.address}</span>
            </li>
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
