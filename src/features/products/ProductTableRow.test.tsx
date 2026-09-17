import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";
import { server } from "@/test/mocks/server";

import { ProductTableRow } from "./ProductTableRow";

const BASE_URL = "https://dummyjson.com";

function renderRow(
  overrides: {
    isEditable?: boolean;
    onMutationError?: (message: string, retry: () => void) => void;
  } = {},
) {
  const store = makeStore();
  const onMutationError = overrides.onMutationError ?? vi.fn();
  render(
    <Provider store={store}>
      <table>
        <tbody>
          <ProductTableRow
            product={mockProduct}
            isEditable={overrides.isEditable ?? true}
            onMutationError={onMutationError}
          />
        </tbody>
      </table>
    </Provider>,
  );
  return { store, onMutationError };
}

// A `<tr>` needs a `<table><tbody>` ancestor to render as valid, queryable
// markup - every test here wraps it that way, matching how `ProductsTable`
// actually renders it in the app.
describe("ProductTableRow", () => {
  it("displays the product's title, category, price, and stock", () => {
    renderRow();

    expect(screen.getByText(mockProduct.title)).toBeInTheDocument();
    expect(screen.getByText(mockProduct.category)).toBeInTheDocument();
    expect(screen.getByText(`$${mockProduct.price.toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText(String(mockProduct.stock))).toBeInTheDocument();
  });

  it("Edit opens an inline, accessible edit form", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^price$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^stock$/i)).toBeInTheDocument();
  });

  it("Cancel exits edit mode without calling the update mutation", async () => {
    let requestCount = 0;
    server.use(
      http.put(`${BASE_URL}/products/:id`, () => {
        requestCount += 1;
        return HttpResponse.json(mockProduct);
      }),
    );

    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument();
    expect(screen.getByText(mockProduct.title)).toBeInTheDocument();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(requestCount).toBe(0);
  });

  it("Save calls the update mutation with the edited fields", async () => {
    let capturedBody: unknown;
    server.use(
      http.put(`${BASE_URL}/products/:id`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockProduct, title: "New Title" });
      }),
    );

    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "New Title" } });
    fireEvent.change(screen.getByLabelText(/^price$/i), { target: { value: "19.99" } });
    fireEvent.change(screen.getByLabelText(/^stock$/i), { target: { value: "42" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument());
    expect(capturedBody).toMatchObject({ title: "New Title", price: 19.99, stock: 42 });
  });

  it("Delete enters an inline confirmation state", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    expect(screen.getByText(/confirm delete\?/i)).toBeInTheDocument();
  });

  it("Cancel exits the delete confirmation state", () => {
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByText(/confirm delete\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("Confirm calls the delete mutation", async () => {
    let requestCount = 0;
    server.use(
      http.delete(`${BASE_URL}/products/:id`, () => {
        requestCount += 1;
        return HttpResponse.json({ ...mockProduct, isDeleted: true });
      }),
    );

    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    await waitFor(() => expect(requestCount).toBe(1));
  });

  it("disables Save/Cancel while the update mutation is pending", async () => {
    server.use(
      http.put(`${BASE_URL}/products/:id`, async () => {
        await delay(50);
        return HttpResponse.json(mockProduct);
      }),
    );

    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeDisabled();

    await waitFor(() => expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument());
  });

  it("disables Edit/Delete while the delete mutation is pending", async () => {
    server.use(
      http.delete(`${BASE_URL}/products/:id`, async () => {
        await delay(50);
        return HttpResponse.json({ ...mockProduct, isDeleted: true });
      }),
    );

    renderRow();
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^confirm$/i }));

    expect(screen.getByRole("button", { name: /^edit$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeDisabled();
  });

  it("a ledger-only product (not editable) has no usable Edit/Delete action", () => {
    renderRow({ isEditable: false });

    expect(screen.queryByRole("button", { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/not yet saved to the catalog/i)).toBeInTheDocument();
  });
});
