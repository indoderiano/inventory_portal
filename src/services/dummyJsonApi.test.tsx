import { render, screen, waitFor } from "@testing-library/react";
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

describe("createProduct records into the createdProducts ledger", () => {
  it("records the returned product on a successful creation", async () => {
    const store = makeStore();

    const createResult = await store.dispatch(
      dummyJsonApi.endpoints.createProduct.initiate({ title: "Brand New Gadget" }),
    );
    expect(createResult.error).toBeUndefined();

    // `onQueryStarted`'s own completion isn't ordered relative to the
    // dispatched mutation thunk's promise (RTK Query invokes it as an
    // unawaited side effect of the `pending` action) - the write it makes
    // can land on a later microtask than the one `await store.dispatch(...)`
    // above resumes on, so it's polled for rather than read synchronously.
    await waitFor(() => {
      const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
      expect(ledger).toHaveLength(1);
      expect(ledger?.[0]?.title).toBe("Brand New Gadget");
    });
  });

  it("does not record anything when the POST fails", async () => {
    server.use(
      http.post("https://dummyjson.com/products/add", () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    const createResult = await store.dispatch(
      dummyJsonApi.endpoints.createProduct.initiate({ title: "Should Not Appear" }),
    );
    expect(createResult.error).toBeDefined();

    const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
    expect(ledger ?? []).toHaveLength(0);
  });

  it("replaces, rather than duplicates, an earlier entry that shares the same id", async () => {
    // DummyJSON's mock always returns the same fixed id for every created
    // product (it doesn't really allocate one) - two creates in the same
    // session collide on id, and the ledger keeps the newest data for it
    // rather than showing both or dropping the second.
    server.use(
      http.post("https://dummyjson.com/products/add", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...mockProduct, ...body, id: 101 });
      }),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "First Gadget" }));
    await waitFor(() => {
      expect(dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data).toHaveLength(1);
    });

    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "Second Gadget" }));
    await waitFor(() => {
      const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
      expect(ledger).toHaveLength(1);
      expect(ledger?.[0]?.title).toBe("Second Gadget");
    });
  });

  it("never issues a network request for the ledger itself", async () => {
    server.use(
      http.get("https://dummyjson.com/*", () => {
        throw new Error("createdProducts must not hit the network");
      }),
    );

    const store = makeStore();
    const result = await store.dispatch(dummyJsonApi.endpoints.createdProducts.initiate());

    expect(result.status).toBe("fulfilled");
    expect(result.data).toEqual([]);
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
