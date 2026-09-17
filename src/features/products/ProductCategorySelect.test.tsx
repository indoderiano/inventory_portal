import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { makeStore, type AppStore } from "@/store/store";
import { server } from "@/test/mocks/server";

import { ProductCategorySelect } from "./ProductCategorySelect";
import { productFiltersActions } from "./productFiltersSlice";

const BASE_URL = "https://dummyjson.com";

function renderComponent(store: AppStore = makeStore()) {
  render(
    <Provider store={store}>
      <ProductCategorySelect />
    </Provider>,
  );
  return store;
}

describe("ProductCategorySelect", () => {
  it("shows a loading indicator before categories arrive", () => {
    renderComponent();

    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
  });

  it("renders the loaded categories as options and clears the loading indicator", async () => {
    renderComponent();

    expect(await screen.findByRole("option", { name: /beauty/i })).toBeInTheDocument();
    expect(screen.queryByText(/loading categories/i)).not.toBeInTheDocument();
  });

  it("dispatches categoryChanged with the selected slug", async () => {
    const store = renderComponent();
    await screen.findByRole("option", { name: /beauty/i });

    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "beauty" } });

    expect(store.getState().productFilters.category).toBe("beauty");
  });

  it("dispatches categoryChanged(null) when 'All categories' is selected", async () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.categoryChanged("beauty"));
    renderComponent(store);
    await screen.findByRole("option", { name: /beauty/i });

    fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: "" } });

    expect(store.getState().productFilters.category).toBeNull();
  });

  it("shows an error with a working Retry when categories fail to load", async () => {
    let attempt = 0;
    server.use(
      http.get(`${BASE_URL}/products/categories`, () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json({ message: "Simulated failure" }, { status: 500 });
        }
        return HttpResponse.json([
          { slug: "beauty", name: "Beauty", url: `${BASE_URL}/products/category/beauty` },
        ]);
      }),
    );

    renderComponent();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/couldn't load categories/i);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByRole("option", { name: /beauty/i })).toBeInTheDocument();
    expect(attempt).toBe(2);
  });

  it("explains that category is ignored while a search term is active", async () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.categoryChanged("beauty"));
    store.dispatch(productFiltersActions.searchChanged("phone"));
    renderComponent(store);
    await screen.findByRole("option", { name: /beauty/i });

    expect(screen.getByText(/category is ignored while searching/i)).toBeInTheDocument();
  });

  it("does not show the ignored-while-searching note when there is no active search", async () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.categoryChanged("beauty"));
    renderComponent(store);
    await screen.findByRole("option", { name: /beauty/i });

    expect(screen.queryByText(/category is ignored while searching/i)).not.toBeInTheDocument();
  });

  it("does not show the ignored-while-searching note when no category is selected", async () => {
    const store = makeStore();
    store.dispatch(productFiltersActions.searchChanged("phone"));
    renderComponent(store);
    await screen.findByRole("option", { name: /beauty/i });

    expect(screen.queryByText(/category is ignored while searching/i)).not.toBeInTheDocument();
  });
});
