"use client";

import { useGetProductCategoriesQuery } from "@/services/dummyJsonApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { productFiltersActions, selectProductCategory, selectProductSearch } from "./productFiltersSlice";

export function ProductCategorySelect() {
  const dispatch = useAppDispatch();
  const category = useAppSelector(selectProductCategory);
  // Only read to decide whether the "ignored while searching" note below
  // is relevant - `getProducts`'s own request-building (`dummyJsonApi.ts`)
  // already drops `category` whenever `q` is set; this doesn't change that
  // behavior, it only makes the existing behavior visible to the user.
  const search = useAppSelector(selectProductSearch);
  const { data: categories, isLoading, error, refetch } = useGetProductCategoriesQuery();

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="flex flex-col gap-1">
        Category
        <select
          className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900"
          value={category ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            dispatch(
              productFiltersActions.categoryChanged(value.length > 0 ? value : null),
            );
          }}
        >
          <option value="">All categories</option>
          {categories?.map((productCategory) => (
            <option key={productCategory.slug} value={productCategory.slug}>
              {productCategory.name}
            </option>
          ))}
        </select>
      </label>

      {isLoading && (
        <p role="status" className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading categories…
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-xs text-red-600">
          Couldn&apos;t load categories.
          <button type="button" onClick={() => void refetch()} className="underline">
            Retry
          </button>
        </p>
      )}

      {!isLoading && !error && category && search.length > 0 && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Category is ignored while searching.
        </p>
      )}
    </div>
  );
}
