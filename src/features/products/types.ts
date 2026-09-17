import type { ProductSortField, SortOrder } from "@/types/product";

export type ProductSortOption = `${ProductSortField}-${SortOrder}`;

export const PRODUCT_SORT_OPTIONS: ReadonlyArray<{
  value: ProductSortOption;
  label: string;
}> = [
  { value: "title-asc", label: "Name (A–Z)" },
  { value: "title-desc", label: "Name (Z–A)" },
  { value: "price-asc", label: "Price (low to high)" },
  { value: "price-desc", label: "Price (high to low)" },
  { value: "rating-desc", label: "Rating (high to low)" },
  { value: "stock-desc", label: "Stock (high to low)" },
];

const VALID_SORT_VALUES: ReadonlySet<string> = new Set(
  PRODUCT_SORT_OPTIONS.map((option) => option.value),
);

export function isProductSortOption(
  value: string,
): value is ProductSortOption {
  return VALID_SORT_VALUES.has(value);
}

/** Page size is fixed for this assessment; DummyJSON paginates via limit/skip. */
export const PRODUCTS_PAGE_SIZE = 12;

export interface ProductFiltersState {
  search: string;
  category: string | null;
  sort: ProductSortOption | null;
  page: number;
}

export const DEFAULT_PRODUCT_FILTERS: ProductFiltersState = {
  search: "",
  category: null,
  sort: null,
  page: 1,
};
