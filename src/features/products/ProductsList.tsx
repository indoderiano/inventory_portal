import type { SerializedError } from "@reduxjs/toolkit";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";

import type { ProductsResponse } from "@/types/product";

interface ProductsListProps {
  data: ProductsResponse | undefined;
  error: FetchBaseQueryError | SerializedError | undefined;
  isLoading: boolean;
  isFetching: boolean;
}

function ProductsListBody({
  data,
  error,
  isLoading,
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

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {data.products.map((product) => (
        <li
          key={product.id}
          className="rounded border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <p className="font-medium">{product.title}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {product.category}
          </p>
          <p className="text-sm">${product.price.toFixed(2)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ProductsList({ data, error, isLoading, isFetching }: ProductsListProps) {
  // A single, always-mounted live region: screen readers reliably announce
  // content changes inside a region that already exists in the DOM, but
  // aren't guaranteed to announce a brand-new region's initial content
  // (as a conditionally-mounted `role="status"` would be). It also covers
  // background refetches (data already shown, `isFetching` true), which
  // otherwise had no perceivable indicator at all - `aria-busy` alone
  // doesn't announce anything by itself.
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
      <ProductsListBody data={data} error={error} isLoading={isLoading} />
    </div>
  );
}
