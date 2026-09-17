import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "@/store/store";
import type { GetProductsArgs, ProductSortField, SortOrder } from "@/types/product";

import {
  DEFAULT_PRODUCT_FILTERS,
  PRODUCTS_PAGE_SIZE,
  type ProductFiltersState,
  type ProductSortOption,
} from "./types";

const productFiltersSlice = createSlice({
  name: "productFilters",
  initialState: DEFAULT_PRODUCT_FILTERS,
  reducers: {
    searchChanged(state, action: PayloadAction<string>) {
      // Trimmed here, at the single write boundary, so "is there an
      // effective search term" never has to be redefined independently by
      // every downstream reader (URL serialization, query-arg derivation).
      state.search = action.payload.trim();
      state.page = 1;
    },
    categoryChanged(state, action: PayloadAction<string | null>) {
      state.category = action.payload;
      state.page = 1;
    },
    sortChanged(state, action: PayloadAction<ProductSortOption | null>) {
      state.sort = action.payload;
      state.page = 1;
    },
    pageChanged(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    /** Replaces the whole slice atomically; used exclusively by URL -> Redux sync. */
    filtersHydratedFromUrl(_state, action: PayloadAction<ProductFiltersState>) {
      return action.payload;
    },
  },
});

export const productFiltersActions = productFiltersSlice.actions;
export const productFiltersReducer = productFiltersSlice.reducer;

export function selectProductFilters(state: RootState): ProductFiltersState {
  return state.productFilters;
}

// Narrow, per-field selectors for components that only care about one
// value. `useAppSelector` compares by reference, and `state.productFilters`
// becomes a new object on *any* field change - a component that selects
// the whole slice just to read one field off it would re-render whenever
// an unrelated field changes. Selecting the primitive field directly
// avoids that, since strings/numbers/null compare correctly with `===`.
export function selectProductSearch(state: RootState): string {
  return state.productFilters.search;
}

export function selectProductCategory(state: RootState): string | null {
  return state.productFilters.category;
}

export function selectProductSort(state: RootState): ProductSortOption | null {
  return state.productFilters.sort;
}

export function selectProductPage(state: RootState): number {
  return state.productFilters.page;
}

/**
 * Derives the RTK Query argument object from the effective filter state.
 * This is the single place where "filter state" is translated into
 * "what the API should be asked for".
 *
 * Memoized via `createSelector`: without this, a new object would be
 * returned on every call, and since `useSelector` compares results by
 * reference, every dispatched action *anywhere* in the store (e.g. an
 * unrelated `getProductCategories` fetch) would look like a change and
 * force a re-render of every component reading this selector.
 */
export const selectProductsQueryArgs = createSelector(
  selectProductFilters,
  ({ search, category, sort, page }): GetProductsArgs => {
    let sortBy: ProductSortField | undefined;
    let order: SortOrder | undefined;
    if (sort) {
      const [field, direction] = sort.split("-") as [ProductSortField, SortOrder];
      sortBy = field;
      order = direction;
    }

    return {
      q: search.length > 0 ? search : undefined,
      category: category ?? undefined,
      sortBy,
      order,
      limit: PRODUCTS_PAGE_SIZE,
      skip: (page - 1) * PRODUCTS_PAGE_SIZE,
    };
  },
);
