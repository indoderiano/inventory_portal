import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import type { ProductsResponse } from "@/types/product";

import { ProductCard } from "./ProductCard";
import { ProductsTable } from "./ProductsTable";
import type { ProductsViewMode } from "./ProductsViewToggle";

interface ProductsListProps {
  data: ProductsResponse | undefined;
  error: FetchBaseQueryError | SerializedError | undefined;
  isLoading: boolean;
  isFetching: boolean;
  editableProductIds: ReadonlySet<number>;
  onMutationError: (message: string, retry: () => void) => void;
  viewMode: ProductsViewMode;
}

function ProductsListBody({
  data,
  error,
  isLoading,
  editableProductIds,
  onMutationError,
  viewMode,
}: Omit<ProductsListProps, "isFetching">) {
  if (isLoading) {
    return <p>Loading products…</p>;
  }

  if (error) {
    return <p role="alert">Failed to load products.</p>;
  }

  if (!data || data.products.length === 0) {
    return <p>No products match the current filters.</p>;
  }

  if (viewMode === "table") {
    return (
      <ProductsTable
        products={data.products}
        editableProductIds={editableProductIds}
        onMutationError={onMutationError}
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {data.products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isEditable={editableProductIds.has(product.id)}
          onMutationError={onMutationError}
        />
      ))}
    </ul>
  );
}

export function ProductsList({
  data,
  error,
  isLoading,
  isFetching,
  editableProductIds,
  onMutationError,
  viewMode,
}: ProductsListProps) {
  // A single, always-mounted live region: screen readers reliably announce
  // content changes inside a region that already exists in the DOM, but
  // aren't guaranteed to announce a brand-new region's initial content
  // (as a conditionally-mounted `role="status"` would be). It also covers
  // background refetches (data already shown, `isFetching` true), which
  // otherwise had no perceivable indicator at all - `aria-busy` alone
  // doesn't announce anything by itself. This, and every loading/error/
  // empty branch above, is shared unconditionally by both view modes -
  // only the final "render the actual items" step differs.
  const statusMessage = isLoading
    ? "Loading products…"
    : isFetching
      ? "Updating results…"
      : "";

  return (
    <div>
      <p role="status" className="sr-only">
        {statusMessage}
      </p>
      <ProductsListBody
        data={data}
        error={error}
        isLoading={isLoading}
        editableProductIds={editableProductIds}
        onMutationError={onMutationError}
        viewMode={viewMode}
      />
    </div>
  );
}
