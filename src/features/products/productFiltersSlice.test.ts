import { describe, expect, it } from "vitest";

import { makeStore } from "@/store/store";

import { productFiltersActions, selectProductsQueryArgs } from "./productFiltersSlice";
import { PRODUCTS_PAGE_SIZE } from "./types";

describe("productFiltersSlice reducers", () => {
  it("resets the page to 1 when the search term changes", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.pageChanged(4));
    store.dispatch(productFiltersActions.searchChanged("phone"));

    expect(store.getState().productFilters).toMatchObject({
      search: "phone",
      page: 1,
    });
  });

  it("resets the page to 1 when the category changes", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.pageChanged(4));
    store.dispatch(productFiltersActions.categoryChanged("beauty"));

    expect(store.getState().productFilters).toMatchObject({
      category: "beauty",
      page: 1,
    });
  });

  it("resets the page to 1 when the sort changes", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.pageChanged(4));
    store.dispatch(productFiltersActions.sortChanged("price-asc"));

    expect(store.getState().productFilters).toMatchObject({
      sort: "price-asc",
      page: 1,
    });
  });

  it("trims the search term so the URL and query args never disagree about 'empty'", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("  phone  "));

    expect(store.getState().productFilters.search).toBe("phone");
  });

  it("does not reset other fields when only the page changes", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("phone"));
    store.dispatch(productFiltersActions.pageChanged(3));

    expect(store.getState().productFilters).toMatchObject({
      search: "phone",
      page: 3,
    });
  });

  it("replaces the whole slice atomically on hydration from the URL", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("stale"));

    store.dispatch(
      productFiltersActions.filtersHydratedFromUrl({
        search: "fresh",
        category: "beauty",
        sort: "rating-desc",
        page: 2,
      }),
    );

    expect(store.getState().productFilters).toEqual({
      search: "fresh",
      category: "beauty",
      sort: "rating-desc",
      page: 2,
    });
  });
});

describe("selectProductsQueryArgs", () => {
  it("maps default filter state to an unfiltered first-page request", () => {
    const store = makeStore();

    expect(selectProductsQueryArgs(store.getState())).toEqual({
      q: undefined,
      category: undefined,
      sortBy: undefined,
      order: undefined,
      limit: PRODUCTS_PAGE_SIZE,
      skip: 0,
    });
  });

  it("maps a fully populated filter state to matching query args", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("phone"));
    store.dispatch(productFiltersActions.categoryChanged("smartphones"));
    store.dispatch(productFiltersActions.sortChanged("price-desc"));
    store.dispatch(productFiltersActions.pageChanged(3));

    expect(selectProductsQueryArgs(store.getState())).toEqual({
      q: "phone",
      category: "smartphones",
      sortBy: "price",
      order: "desc",
      limit: PRODUCTS_PAGE_SIZE,
      skip: (3 - 1) * PRODUCTS_PAGE_SIZE,
    });
  });

  it("treats a whitespace-only search as no search", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("   "));

    expect(selectProductsQueryArgs(store.getState()).q).toBeUndefined();
  });

  it("computes skip from the page number and fixed page size", () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.pageChanged(5));

    expect(selectProductsQueryArgs(store.getState()).skip).toBe(
      (5 - 1) * PRODUCTS_PAGE_SIZE,
    );
  });
});
