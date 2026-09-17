import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";

import { ProductsTable } from "./ProductsTable";

function renderTable(editableProductIds: ReadonlySet<number> = new Set([mockProduct.id])) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ProductsTable
        products={[mockProduct]}
        editableProductIds={editableProductIds}
        onMutationError={vi.fn()}
      />
    </Provider>,
  );
}

describe("ProductsTable", () => {
  it("renders a semantic table with meaningful column headers", () => {
    renderTable();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /product/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /category/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /price/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /stock/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /actions/i })).toBeInTheDocument();
  });

  it("renders one row per product with its data and Edit/Delete actions", () => {
    renderTable();

    expect(screen.getByRole("row", { name: new RegExp(mockProduct.title) })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("omits Edit/Delete for a ledger-only (non-editable) product row", () => {
    renderTable(new Set());

    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
  });
});
