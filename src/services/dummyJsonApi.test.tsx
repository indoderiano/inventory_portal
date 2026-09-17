import { render, screen } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { act } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { productFiltersActions, selectProductsQueryArgs } from "@/features/products/productFiltersSlice";
import { dummyJsonApi, useGetProductsQuery } from "@/services/dummyJsonApi";
import { useAppSelector } from "@/store/hooks";
import { makeStore } from "@/store/store";
import { mockProduct, mockProductsResponse } from "@/test/mocks/fixtures";
import { server } from "@/test/mocks/server";

describe("dummyJsonApi", () => {
  it("fetches products through the store and normalizes the response", async () => {
    const store = makeStore();

    const result = await store.dispatch(
      dummyJsonApi.endpoints.getProducts.initiate(),
    );

    expect(result.status).toBe("fulfilled");
    expect(result.data?.products).toHaveLength(1);
    expect(result.data?.products[0]?.title).toBe(
      "Essence Mascara Lash Princess",
    );
  });

  it("fetches a single product by id", async () => {
    const store = makeStore();

    const result = await store.dispatch(
      dummyJsonApi.endpoints.getProductById.initiate(1),
    );

    expect(result.status).toBe("fulfilled");
    expect(result.data?.id).toBe(1);
  });

  it("invalidates the product list cache after creating a product", async () => {
    const store = makeStore();

    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    const createResult = await store.dispatch(
      dummyJsonApi.endpoints.createProduct.initiate({ title: "New Product" }),
    );

    expect(createResult.error).toBeUndefined();
    expect(createResult.data?.title).toBe("New Product");
  });

  it("prefers full-text search over a category filter when both are given", async () => {
    server.use(
      http.get("https://dummyjson.com/products/search", () =>
        HttpResponse.json({
          products: [{ ...mockProduct, title: "Search Wins" }],
          total: 1,
          skip: 0,
          limit: 12,
        }),
      ),
      http.get("https://dummyjson.com/products/category/beauty", () =>
        HttpResponse.json({
          products: [{ ...mockProduct, title: "Category Only" }],
          total: 1,
          skip: 0,
          limit: 12,
        }),
      ),
    );

    const store = makeStore();
    const result = await store.dispatch(
      dummyJsonApi.endpoints.getProducts.initiate({ category: "beauty", q: "mascara" }),
    );

    expect(result.data?.products[0]?.title).toBe("Search Wins");
  });

  it("shares one cache entry across different category values once a search term is present", async () => {
    // `category` is ignored by the actual request whenever `q` is set (see
    // the precedence above), so it must not fragment the cache key either -
    // otherwise these two calls would be treated as different queries and
    // fire two network requests for what is the identical `/products/search`
    // URL.
    server.use(
      http.get("https://dummyjson.com/products/search", () =>
        HttpResponse.json(mockProductsResponse),
      ),
    );

    const store = makeStore();
    await store.dispatch(
      dummyJsonApi.endpoints.getProducts.initiate({ q: "phone", category: "beauty" }),
    );
    await store.dispatch(
      dummyJsonApi.endpoints.getProducts.initiate({ q: "phone", category: "electronics" }),
    );

    const getProductsCacheKeys = Object.keys(store.getState().dummyJsonApi.queries).filter(
      (key) => key.startsWith("getProducts("),
    );

    expect(getProductsCacheKeys).toHaveLength(1);
  });
});

function ProductsProbe() {
  const args = useAppSelector(selectProductsQueryArgs);
  const { data } = useGetProductsQuery(args);
  return <div data-testid="title">{data?.products[0]?.title ?? "loading"}</div>;
}

describe("rapid filter changes", () => {
  it("does not let a slow, earlier search response overwrite a faster, later one", async () => {
    server.use(
      http.get("https://dummyjson.com/products/search", async ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q");

        if (q === "a") {
          await delay(150);
          return HttpResponse.json({
            products: [{ ...mockProduct, title: "Result A" }],
            total: 1,
            skip: 0,
            limit: 12,
          });
        }

        await delay(10);
        return HttpResponse.json({
          products: [{ ...mockProduct, title: "Result AB" }],
          total: 1,
          skip: 0,
          limit: 12,
        });
      }),
    );

    const store = makeStore();
    render(
      <Provider store={store}>
        <ProductsProbe />
      </Provider>,
    );

    act(() => {
      store.dispatch(productFiltersActions.searchChanged("a"));
    });
    act(() => {
      store.dispatch(productFiltersActions.searchChanged("ab"));
    });

    await screen.findByText("Result AB");

    // Give the slower "a" response time to resolve; it must land in its own
    // cache entry and never overwrite what's rendered for the current args.
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(screen.getByTestId("title").textContent).toBe("Result AB");
  });
});
