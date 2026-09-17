"use client";

import { useState } from "react";

import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { productFiltersActions, selectProductSearch } from "./productFiltersSlice";

const SEARCH_DEBOUNCE_MS = 300;

export function ProductSearchInput() {
  const dispatch = useAppDispatch();
  const committedSearch = useAppSelector(selectProductSearch);
  const [inputValue, setInputValue] = useState(committedSearch);
  const [lastCommittedSearch, setLastCommittedSearch] = useState(committedSearch);

  const commitSearch = useDebouncedCallback((value: string) => {
    dispatch(productFiltersActions.searchChanged(value));
  }, SEARCH_DEBOUNCE_MS);

  // Keep the visible input in sync when the committed value changes for a
  // reason other than this input (URL hydration, browser back/forward).
  // Adjusting state during render (rather than in an effect) avoids an
  // extra post-commit render for what is otherwise a pure derivation.
  if (committedSearch !== lastCommittedSearch) {
    setLastCommittedSearch(committedSearch);
    setInputValue(committedSearch);
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      Search
      <input
        type="search"
        className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        value={inputValue}
        onChange={(event) => {
          const value = event.target.value;
          setInputValue(value);
          commitSearch(value);
        }}
        placeholder="Search products…"
      />
    </label>
  );
}
