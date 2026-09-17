"use client";

import { useGetProductCategoriesQuery } from "@/services/dummyJsonApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { productFiltersActions, selectProductCategory } from "./productFiltersSlice";

export function ProductCategorySelect() {
  const dispatch = useAppDispatch();
  const category = useAppSelector(selectProductCategory);
  const { data: categories } = useGetProductCategoriesQuery();

  return (
    <label className="flex flex-col gap-1 text-sm">
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
  );
}
