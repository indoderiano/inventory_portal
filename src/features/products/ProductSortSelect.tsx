"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { productFiltersActions, selectProductSort } from "./productFiltersSlice";
import { PRODUCT_SORT_OPTIONS, isProductSortOption } from "./types";

export function ProductSortSelect() {
  const dispatch = useAppDispatch();
  const sort = useAppSelector(selectProductSort);

  return (
    <label className="flex flex-col gap-1 text-sm">
      Sort by
      <select
        className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
        value={sort ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          dispatch(
            productFiltersActions.sortChanged(
              value.length > 0 && isProductSortOption(value) ? value : null,
            ),
          );
        }}
      >
        <option value="">Relevance</option>
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
