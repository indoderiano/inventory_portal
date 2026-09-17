import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";
import type { ProductsResponse } from "@/types/product";

import { ProductsList } from "./ProductsList";
import type { ProductsViewMode } from "./ProductsViewToggle";

const baseData: ProductsResponse = { products: [mockProduct], total: 1, skip: 0, limit: 12 };

function renderList(overrides: {
  data?: ProductsResponse | undefined;
  error?: { status: number; data: unknown };
  isLoading?: boolean;
  viewMode?: ProductsViewMode;
} = {}) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ProductsList
        data={overrides.data ?? baseData}
        error={overrides.error}
        isLoading={overrides.isLoading ?? false}
        isFetching={false}
        editableProductIds={new Set([mockProduct.id])}
        onMutationError={vi.fn()}
        viewMode={overrides.viewMode ?? "card"}
      />
    </Provider>,
  );
}

describe("ProductsList", () => {
  it("renders a card grid in card mode", () => {
    renderList({ viewMode: "card" });

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(mockProduct.title)).toBeInTheDocument();
  });

  it("renders a table in table mode", () => {
    renderList({ viewMode: "table" });

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText(mockProduct.title)).toBeInTheDocument();
  });

  it("shows the loading state regardless of view mode", () => {
    renderList({ isLoading: true, viewMode: "table" });

    // Matches both the visible loading paragraph and the sr-only live
    // region, which also announces "Loading products…" while loading.
    expect(screen.getAllByText(/loading products/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the error state regardless of view mode", () => {
    renderList({ error: { status: 500, data: undefined }, viewMode: "table" });

    expect(screen.getByRole("alert")).toHaveTextContent(/failed to load/i);
  });

  it("shows the empty state regardless of view mode", () => {
    renderList({
      data: { products: [], total: 0, skip: 0, limit: 12 },
      viewMode: "card",
    });

    expect(screen.getByText(/no products match/i)).toBeInTheDocument();
  });
});
