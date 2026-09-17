"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useCreatedProductsQuery, useGetProductsQuery } from "@/services/dummyJsonApi";
import { useAppSelector } from "@/store/hooks";

import { mergeCreatedIntoListing } from "./mergeCreatedIntoListing";
import { ProductsList } from "./ProductsList";
import { ProductsPagination } from "./ProductsPagination";
import { selectProductsQueryArgs } from "./productFiltersSlice";
import { ProductsViewToggle, type ProductsViewMode } from "./ProductsViewToggle";
import { ResponsiveProductFilters } from "./ResponsiveProductFilters";
import { Toast } from "./Toast";
import { useProductFiltersUrlSync } from "./useProductFiltersUrlSync";

interface MutationErrorToast {
  message: string;
  retry: () => void;
}

export function ProductsView() {
  useProductFiltersUrlSync();

  const queryArgs = useAppSelector(selectProductsQueryArgs);
  const { data, error, isLoading, isFetching } = useGetProductsQuery(queryArgs);
  // Never makes a network request - see `createdProducts` in
  // `dummyJsonApi.ts`. Combined with `data` below purely at render time, so
  // it's always current for whatever filters/sort/page are active right
  // now, with nothing ever written back into the `getProducts` cache entry
  // itself.
  const { data: createdProducts } = useCreatedProductsQuery();

  const mergedData = useMemo(() => {
    if (!data) {
      return data;
    }
    return mergeCreatedIntoListing(data, createdProducts ?? [], queryArgs);
  }, [data, createdProducts, queryArgs]);

  // A product is only safe to optimistically edit/delete if it's actually
  // present in the real `getProducts` result - a product visible only
  // because `mergeCreatedIntoListing` merged it in from the ledger has no
  // real cache entry for `updateProduct`/`deleteProduct` to patch, and
  // fabricating one just to enable a mutation button isn't something this
  // app does anywhere else (see `createdProducts`'s own doc comment).
  const editableProductIds = useMemo(
    () => new Set(data?.products.map((product) => product.id) ?? []),
    [data],
  );

  const [toast, setToast] = useState<MutationErrorToast | null>(null);

  // Pure display preference - not query-affecting, so it stays out of
  // Redux/the URL entirely (nothing derives `queryArgs` from it, and
  // nothing outside this component needs to read it). Not persisted across
  // reloads, per the assessment's requirement being just "a toggle", not
  // "a remembered toggle".
  const [viewMode, setViewMode] = useState<ProductsViewMode>("card");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold">Products</h1>
        <Link
          href="/products/new"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add Product
        </Link>
      </div>
      <ResponsiveProductFilters />
      <div className="flex justify-end">
        <ProductsViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>
      <ProductsList
        data={mergedData}
        error={error}
        isLoading={isLoading}
        isFetching={isFetching}
        editableProductIds={editableProductIds}
        onMutationError={(message, retry) => setToast({ message, retry })}
        viewMode={viewMode}
      />
      <ProductsPagination total={mergedData?.total} />
      {toast && (
        <Toast
          message={toast.message}
          onRetry={() => {
            // Cleared *before* invoking it: if the retried mutation fails
            // again, `onMutationError` sets a brand new toast rather than
            // this one ever being reused with stale arguments.
            const { retry } = toast;
            setToast(null);
            retry();
          }}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
