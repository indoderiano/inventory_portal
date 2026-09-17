import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";
import { server } from "@/test/mocks/server";
import { createMockRouter, setActiveMockRouter } from "@/test/utils/mockNextNavigation";

import { ProductsView } from "./ProductsView";

// `ProductsView` renders `useProductFiltersUrlSync`, which calls
// `useRouter`/`usePathname`/`useSearchParams` - these throw outside a real
// Next.js App Router, so the same in-memory router mock used elsewhere is
// needed here too.
vi.mock("next/navigation", () => import("@/test/utils/mockNextNavigation"));

const BASE_URL = "https://dummyjson.com";

function renderProductsView() {
  setActiveMockRouter(createMockRouter("/products"));
  const store = makeStore();

  render(
    <Provider store={store}>
      <ProductsView />
    </Provider>,
  );

  return store;
}

describe("ProductsView", () => {
  it("renders a visible, accessible Add Product action that links to /products/new", () => {
    renderProductsView();

    const addProductLink = screen.getByRole("link", { name: /add product/i });
    expect(addProductLink).toBeVisible();
    expect(addProductLink).toHaveAttribute("href", "/products/new");
  });

  it("shows an error toast when a product update fails, and Retry re-attempts the same mutation", async () => {
    let attempt = 0;
    server.use(
      http.put(`${BASE_URL}/products/:id`, async () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json({ message: "Simulated update failure" }, { status: 500 });
        }
        return HttpResponse.json({ ...mockProduct, title: "Renamed" });
      }),
    );

    renderProductsView();

    await screen.findByText(mockProduct.title);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't save/i);

    fireEvent.click(within(alert).getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(attempt).toBe(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("clears the toast on Dismiss so a later, unrelated failure doesn't trigger a stale retry", async () => {
    server.use(
      http.put(`${BASE_URL}/products/:id`, () =>
        HttpResponse.json({ message: "Simulated update failure" }, { status: 500 }),
      ),
    );

    renderProductsView();

    await screen.findByText(mockProduct.title);
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    const alert = await screen.findByRole("alert");
    fireEvent.click(within(alert).getByRole("button", { name: /dismiss/i }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the card/table view toggle, defaulting to card view", () => {
    renderProductsView();

    expect(screen.getByRole("group", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^card$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^table$/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches between card and table rendering without touching Redux filter state", async () => {
    const store = renderProductsView();

    await screen.findByText(mockProduct.title);
    expect(screen.getByRole("list")).toBeInTheDocument();

    // A genuinely non-default filter, so this proves real state survives
    // the switch rather than just "stays at defaults". Sort (not category)
    // deliberately: it stays on the same default `/products` GET handler
    // (query params only), where changing category would hit
    // `/products/category/:slug`, a path this test suite's MSW handlers
    // don't mock.
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "price-asc" } });
    await waitFor(() => expect(store.getState().productFilters.sort).toBe("price-asc"));

    const filtersBefore = store.getState().productFilters;

    fireEvent.click(screen.getByRole("button", { name: /^table$/i }));

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(store.getState().productFilters).toEqual(filtersBefore);

    fireEvent.click(screen.getByRole("button", { name: /^card$/i }));

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(store.getState().productFilters).toEqual(filtersBefore);
  });
});
