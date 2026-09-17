import type { ReadonlyURLSearchParams } from "next/navigation";

import {
  DEFAULT_PRODUCT_FILTERS,
  isProductSortOption,
  type ProductFiltersState,
} from "./types";

/**
 * Parses filter state from URL search params. Every field falls back to its
 * default when absent or malformed, since the URL is user-editable input
 * (a system boundary) and must never be trusted to produce a valid state.
 */
export function parseProductFiltersFromSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams,
): ProductFiltersState {
  // Trimmed so a manually-edited URL can't produce a `productFilters.search`
  // value that the reducer's own trimming (see `searchChanged`) would never
  // have allowed - keeping "what counts as an effective search" consistent
  // regardless of which path wrote the state.
  const search = (searchParams.get("search") ?? DEFAULT_PRODUCT_FILTERS.search).trim();

  const rawCategory = searchParams.get("category");
  const category = rawCategory && rawCategory.length > 0 ? rawCategory : null;

  const rawSort = searchParams.get("sort");
  const sort = rawSort !== null && isProductSortOption(rawSort) ? rawSort : null;

  const rawPage = searchParams.get("page");
  const parsedPage = rawPage !== null ? Number.parseInt(rawPage, 10) : NaN;
  const page =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? parsedPage
      : DEFAULT_PRODUCT_FILTERS.page;

  return { search, category, sort, page };
}

/**
 * Serializes filter state back to URL search params, omitting any field
 * that is at its default so the URL stays clean (e.g. `/products` instead
 * of `/products?search=&category=&sort=&page=1`).
 */
export function productFiltersToSearchParams(
  filters: ProductFiltersState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search.length > 0) {
    params.set("search", filters.search);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.page !== DEFAULT_PRODUCT_FILTERS.page) {
    params.set("page", String(filters.page));
  }

  return params;
}

export function areProductFiltersEqual(
  a: ProductFiltersState,
  b: ProductFiltersState,
): boolean {
  return (
    a.search === b.search &&
    a.category === b.category &&
    a.sort === b.sort &&
    a.page === b.page
  );
}
