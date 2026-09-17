import { describe, expect, it } from "vitest";

import {
  areProductFiltersEqual,
  parseProductFiltersFromSearchParams,
  productFiltersToSearchParams,
} from "./productFiltersUrl";
import { DEFAULT_PRODUCT_FILTERS } from "./types";

describe("parseProductFiltersFromSearchParams", () => {
  it("returns defaults for an empty search string", () => {
    expect(parseProductFiltersFromSearchParams(new URLSearchParams())).toEqual(
      DEFAULT_PRODUCT_FILTERS,
    );
  });

  it("parses a fully populated URL", () => {
    const params = new URLSearchParams(
      "search=phone&category=smartphones&sort=price-asc&page=3",
    );

    expect(parseProductFiltersFromSearchParams(params)).toEqual({
      search: "phone",
      category: "smartphones",
      sort: "price-asc",
      page: 3,
    });
  });

  it("falls back to defaults for an invalid sort value", () => {
    const params = new URLSearchParams("sort=not-a-real-sort");
    expect(parseProductFiltersFromSearchParams(params).sort).toBeNull();
  });

  it("falls back to page 1 for a non-numeric page", () => {
    const params = new URLSearchParams("page=abc");
    expect(parseProductFiltersFromSearchParams(params).page).toBe(1);
  });

  it("falls back to page 1 for a zero or negative page", () => {
    expect(parseProductFiltersFromSearchParams(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseProductFiltersFromSearchParams(new URLSearchParams("page=-5")).page).toBe(1);
  });

  it("treats an empty category param as no category", () => {
    const params = new URLSearchParams("category=");
    expect(parseProductFiltersFromSearchParams(params).category).toBeNull();
  });

  it("trims a whitespace-padded search, matching the reducer's own normalization", () => {
    const params = new URLSearchParams();
    params.set("search", "  phone  ");
    expect(parseProductFiltersFromSearchParams(params).search).toBe("phone");
  });
});

describe("productFiltersToSearchParams", () => {
  it("produces an empty string for default filters", () => {
    expect(productFiltersToSearchParams(DEFAULT_PRODUCT_FILTERS).toString()).toBe("");
  });

  it("omits only the fields at their default value", () => {
    const params = productFiltersToSearchParams({
      search: "",
      category: "beauty",
      sort: null,
      page: 1,
    });

    expect(params.toString()).toBe("category=beauty");
  });

  it("serializes a fully populated filter state", () => {
    const params = productFiltersToSearchParams({
      search: "phone",
      category: "smartphones",
      sort: "price-asc",
      page: 3,
    });

    expect(params.get("search")).toBe("phone");
    expect(params.get("category")).toBe("smartphones");
    expect(params.get("sort")).toBe("price-asc");
    expect(params.get("page")).toBe("3");
  });

  it("round-trips through parse -> serialize -> parse", () => {
    const original = {
      search: "essence",
      category: "beauty",
      sort: "rating-desc" as const,
      page: 2,
    };

    const roundTripped = parseProductFiltersFromSearchParams(
      productFiltersToSearchParams(original),
    );

    expect(roundTripped).toEqual(original);
  });
});

describe("areProductFiltersEqual", () => {
  it("returns true for structurally identical states", () => {
    expect(
      areProductFiltersEqual(DEFAULT_PRODUCT_FILTERS, { ...DEFAULT_PRODUCT_FILTERS }),
    ).toBe(true);
  });

  it("returns false when any field differs", () => {
    expect(
      areProductFiltersEqual(DEFAULT_PRODUCT_FILTERS, {
        ...DEFAULT_PRODUCT_FILTERS,
        page: 2,
      }),
    ).toBe(false);
  });
});
