"use client";

import type { TOfficeSummary } from "@repo/types";
import { useEffect, useState } from "react";

import { searchOffices } from "../lib/officesApi";

const DEBOUNCE_MS = 300;

export interface IUseOfficeSearchResult {
  results: TOfficeSummary[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * 검색어를 300ms 디바운스해 사무소를 조회한다(office-search-bar 명세).
 * 빈 문자열은 검색이 아니라 "검색 취소"로 취급한다 — 요청 없이 결과만 비운다.
 */
export const useOfficeSearch = (query: string): IUseOfficeSearchResult => {
  const [results, setResults] = useState<TOfficeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLoading(true);

    const timer = setTimeout(() => {
      searchOffices(trimmed)
        .then((response) => {
          if (isCancelled) return;
          setResults(response.offices);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (isCancelled) return;
          setError(caught instanceof Error ? caught : new Error(String(caught)));
        })
        .finally(() => {
          if (isCancelled) return;
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isLoading, error };
};
