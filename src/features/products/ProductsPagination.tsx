"use client";

import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { productFiltersActions, selectProductPage } from "./productFiltersSlice";
import { PRODUCTS_PAGE_SIZE } from "./types";

interface ProductsPaginationProps {
  total: number | undefined;
}

export function ProductsPagination({ total }: ProductsPaginationProps) {
  const dispatch = useAppDispatch();
  const page = useAppSelector(selectProductPage);
  const totalPages =
    total !== undefined ? Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)) : 1;

  // A deep link (or a filter change that narrows the result set) can leave
  // `page` past the end of the now-known result set - DummyJSON doesn't
  // clamp `skip` itself, it just returns an empty `products` array while
  // `total` still reports the real count. Clamp back to the last valid
  // page instead of showing a false "no products" empty state.
  useEffect(() => {
    if (total !== undefined && page > totalPages) {
      dispatch(productFiltersActions.pageChanged(totalPages));
    }
  }, [dispatch, page, total, totalPages]);

  return (
    <div className="flex items-center justify-center gap-4 text-sm">
      <button
        type="button"
        onClick={() => dispatch(productFiltersActions.pageChanged(page - 1))}
        disabled={page <= 1}
        className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
      >
        Previous
      </button>
      <span aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => dispatch(productFiltersActions.pageChanged(page + 1))}
        disabled={page >= totalPages}
        className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
      >
        Next
      </button>
    </div>
  );
}
