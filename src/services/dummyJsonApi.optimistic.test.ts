import { waitFor } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { describe, expect, it } from "vitest";

import { dummyJsonApi } from "@/services/dummyJsonApi";
import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";
import { server } from "@/test/mocks/server";
import type { Product, ProductsResponse } from "@/types/product";

const BASE_URL = "https://dummyjson.com";

function makeProduct(overrides: Partial<Product> & { id: number }): Product {
  return { ...mockProduct, ...overrides };
}

function makePage(products: Product[], overrides: Partial<ProductsResponse> = {}): ProductsResponse {
  return {
    products,
    total: products.length,
    skip: 0,
    limit: 12,
    ...overrides,
  };
}

describe("updateProduct optimistic cache reconciliation", () => {
  it("applies the optimistic update before the delayed response resolves", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([makeProduct({ id: 1, title: "Original" })]))),
      http.put(`${BASE_URL}/products/1`, async () => {
        await delay(100);
        return HttpResponse.json(makeProduct({ id: 1, title: "Updated" }));
      }),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const mutation = store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated" }),
    );

    // Checked while the 100ms-delayed response is still in flight.
    await waitFor(() => {
      const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
      expect(page?.products[0]?.title).toBe("Updated");
    });

    await mutation;
  });

  it("keeps the optimistic update after a successful response", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([makeProduct({ id: 1, title: "Original" })]))),
      http.put(`${BASE_URL}/products/1`, () => HttpResponse.json(makeProduct({ id: 1, title: "Updated" }))),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const result = await store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated" }),
    );
    expect(result.error).toBeUndefined();

    const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(page?.products[0]?.title).toBe("Updated");
  });

  it("restores the exact previous cache state when the update fails", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () =>
        HttpResponse.json(makePage([makeProduct({ id: 1, title: "Original", price: 10 })])),
      ),
      http.put(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ message: "Simulated update failure" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    const before = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;

    const result = await store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated", price: 999 }),
    );
    expect(result.error).toBeDefined();

    const after = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(after).toEqual(before);
  });

  it("updates every cached getProducts entry that contains the product, not just one", async () => {
    const shared = makeProduct({ id: 1, title: "Original", category: "beauty" });
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([shared]))),
      http.get(`${BASE_URL}/products/category/beauty`, () => HttpResponse.json(makePage([shared]))),
      http.put(`${BASE_URL}/products/1`, () => HttpResponse.json({ ...shared, title: "Updated" })),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate({ category: "beauty" }));

    const result = await store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated" }),
    );
    expect(result.error).toBeUndefined();

    const defaultPage = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    const categoryPage = dummyJsonApi.endpoints.getProducts.select({ category: "beauty" })(
      store.getState(),
    ).data;
    expect(defaultPage?.products[0]?.title).toBe("Updated");
    expect(categoryPage?.products[0]?.title).toBe("Updated");
  });

  it("restores every one of those entries if the update fails", async () => {
    const shared = makeProduct({ id: 1, title: "Original", category: "beauty" });
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([shared]))),
      http.get(`${BASE_URL}/products/category/beauty`, () => HttpResponse.json(makePage([shared]))),
      http.put(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ message: "Simulated update failure" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate({ category: "beauty" }));

    const result = await store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated" }),
    );
    expect(result.error).toBeDefined();

    const defaultPage = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    const categoryPage = dummyJsonApi.endpoints.getProducts.select({ category: "beauty" })(
      store.getState(),
    ).data;
    expect(defaultPage?.products[0]?.title).toBe("Original");
    expect(categoryPage?.products[0]?.title).toBe("Original");
  });

  it("leaves a cache entry untouched if it doesn't contain the product being updated", async () => {
    const other = makeProduct({ id: 2, title: "Unrelated", category: "electronics" });
    server.use(
      http.get(`${BASE_URL}/products/category/electronics`, () => HttpResponse.json(makePage([other]))),
      http.put(`${BASE_URL}/products/1`, () => HttpResponse.json(makeProduct({ id: 1, title: "Updated" }))),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate({ category: "electronics" }));
    const before = dummyJsonApi.endpoints.getProducts.select({ category: "electronics" })(
      store.getState(),
    ).data;

    await store.dispatch(dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Updated" }));

    const after = dummyJsonApi.endpoints.getProducts.select({ category: "electronics" })(
      store.getState(),
    ).data;
    // Same reference: `selectInvalidatedBy` never returns an entry that
    // doesn't provide this product's own tag, so `updateQueryData` was
    // never even dispatched against it.
    expect(after).toBe(before);
  });

  it("updates the createdProducts ledger entry when the product was created this session", async () => {
    server.use(
      http.post(`${BASE_URL}/products/add`, () => HttpResponse.json(makeProduct({ id: 101, title: "Ledger Product" }))),
      http.put(`${BASE_URL}/products/101`, () =>
        HttpResponse.json(makeProduct({ id: 101, title: "Ledger Updated" })),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "Ledger Product" }));
    await waitFor(() => {
      expect(dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data).toHaveLength(1);
    });

    await store.dispatch(dummyJsonApi.endpoints.updateProduct.initiate({ id: 101, title: "Ledger Updated" }));

    const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
    expect(ledger?.[0]?.title).toBe("Ledger Updated");
  });

  it("restores the ledger entry if the update fails", async () => {
    server.use(
      http.post(`${BASE_URL}/products/add`, () => HttpResponse.json(makeProduct({ id: 101, title: "Ledger Product" }))),
      http.put(`${BASE_URL}/products/101`, () =>
        HttpResponse.json({ message: "Simulated update failure" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "Ledger Product" }));
    await waitFor(() => {
      expect(dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data).toHaveLength(1);
    });

    const result = await store.dispatch(
      dummyJsonApi.endpoints.updateProduct.initiate({ id: 101, title: "Attempted Update" }),
    );
    expect(result.error).toBeDefined();

    const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
    expect(ledger?.[0]?.title).toBe("Ledger Product");
  });
});

describe("deleteProduct optimistic cache reconciliation", () => {
  it("applies the optimistic removal before the delayed response resolves, decreasing total immediately", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () =>
        HttpResponse.json(makePage([makeProduct({ id: 1 }), makeProduct({ id: 2 })], { total: 2 })),
      ),
      http.delete(`${BASE_URL}/products/1`, async () => {
        await delay(100);
        return HttpResponse.json({ ...makeProduct({ id: 1 }), isDeleted: true });
      }),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const mutation = store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1));

    await waitFor(() => {
      const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
      expect(page?.products.some((product) => product.id === 1)).toBe(false);
      expect(page?.total).toBe(1);
    });

    await mutation;
  });

  it("keeps the removal after a successful response", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () =>
        HttpResponse.json(makePage([makeProduct({ id: 1 }), makeProduct({ id: 2 })], { total: 2 })),
      ),
      http.delete(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ ...makeProduct({ id: 1 }), isDeleted: true }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const result = await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1));
    expect(result.error).toBeUndefined();

    const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(page?.products.map((product) => product.id)).toEqual([2]);
    expect(page?.total).toBe(1);
  });

  it("restores the exact product and total when the delete fails", async () => {
    server.use(
      http.get(`${BASE_URL}/products`, () =>
        HttpResponse.json(makePage([makeProduct({ id: 1 }), makeProduct({ id: 2 })], { total: 2 })),
      ),
      http.delete(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ message: "Simulated delete failure" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    const before = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;

    const result = await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1));
    expect(result.error).toBeDefined();

    const after = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(after).toEqual(before);
  });

  it("removes the product from every cached entry that contains it", async () => {
    const shared = makeProduct({ id: 1, category: "beauty" });
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([shared]))),
      http.get(`${BASE_URL}/products/category/beauty`, () => HttpResponse.json(makePage([shared]))),
      http.delete(`${BASE_URL}/products/1`, () => HttpResponse.json({ ...shared, isDeleted: true })),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate({ category: "beauty" }));

    await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1));

    const defaultPage = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    const categoryPage = dummyJsonApi.endpoints.getProducts.select({ category: "beauty" })(
      store.getState(),
    ).data;
    expect(defaultPage?.products).toHaveLength(0);
    expect(categoryPage?.products).toHaveLength(0);
  });

  it("leaves a cache entry untouched if it doesn't contain the product being deleted", async () => {
    const other = makeProduct({ id: 2, category: "electronics" });
    server.use(
      http.get(`${BASE_URL}/products/category/electronics`, () => HttpResponse.json(makePage([other]))),
      http.delete(`${BASE_URL}/products/1`, () => HttpResponse.json({ ...makeProduct({ id: 1 }), isDeleted: true })),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate({ category: "electronics" }));
    const before = dummyJsonApi.endpoints.getProducts.select({ category: "electronics" })(
      store.getState(),
    ).data;

    await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1));

    const after = dummyJsonApi.endpoints.getProducts.select({ category: "electronics" })(
      store.getState(),
    ).data;
    expect(after).toBe(before);
  });

  it("removes the createdProducts ledger entry when the product was created this session", async () => {
    server.use(
      http.post(`${BASE_URL}/products/add`, () => HttpResponse.json(makeProduct({ id: 101, title: "Ledger Product" }))),
      http.delete(`${BASE_URL}/products/101`, () =>
        HttpResponse.json({ ...makeProduct({ id: 101 }), isDeleted: true }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "Ledger Product" }));
    await waitFor(() => {
      expect(dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data).toHaveLength(1);
    });

    await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(101));

    const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
    expect(ledger ?? []).toHaveLength(0);
  });

  it("restores the ledger entry if the delete fails", async () => {
    server.use(
      http.post(`${BASE_URL}/products/add`, () => HttpResponse.json(makeProduct({ id: 101, title: "Ledger Product" }))),
      http.delete(`${BASE_URL}/products/101`, () =>
        HttpResponse.json({ message: "Simulated delete failure" }, { status: 500 }),
      ),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.createProduct.initiate({ title: "Ledger Product" }));
    await waitFor(() => {
      expect(dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data).toHaveLength(1);
    });

    const result = await store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(101));
    expect(result.error).toBeDefined();

    const ledger = dummyJsonApi.endpoints.createdProducts.select()(store.getState()).data;
    expect(ledger).toHaveLength(1);
    expect(ledger?.[0]?.title).toBe("Ledger Product");
  });
});

describe("concurrent mutations on different products", () => {
  it("a failed update for one product does not undo a concurrent successful update for another", async () => {
    const p1 = makeProduct({ id: 1, title: "Product One" });
    const p2 = makeProduct({ id: 2, title: "Product Two" });
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([p1, p2], { total: 2 }))),
      http.put(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ message: "Simulated update failure" }, { status: 500 }),
      ),
      http.put(`${BASE_URL}/products/2`, () => HttpResponse.json({ ...p2, title: "Product Two Updated" })),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const [result1, result2] = await Promise.all([
      store.dispatch(dummyJsonApi.endpoints.updateProduct.initiate({ id: 1, title: "Should Not Stick" })),
      store.dispatch(dummyJsonApi.endpoints.updateProduct.initiate({ id: 2, title: "Product Two Updated" })),
    ]);

    expect(result1.error).toBeDefined();
    expect(result2.error).toBeUndefined();

    const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(page?.products.find((product) => product.id === 1)?.title).toBe("Product One");
    expect(page?.products.find((product) => product.id === 2)?.title).toBe("Product Two Updated");
  });

  it("a failed delete for one product does not undo a concurrent successful delete for another", async () => {
    const p1 = makeProduct({ id: 1 });
    const p2 = makeProduct({ id: 2 });
    server.use(
      http.get(`${BASE_URL}/products`, () => HttpResponse.json(makePage([p1, p2], { total: 2 }))),
      http.delete(`${BASE_URL}/products/1`, () =>
        HttpResponse.json({ message: "Simulated delete failure" }, { status: 500 }),
      ),
      http.delete(`${BASE_URL}/products/2`, () => HttpResponse.json({ ...p2, isDeleted: true })),
    );

    const store = makeStore();
    await store.dispatch(dummyJsonApi.endpoints.getProducts.initiate());

    const [result1, result2] = await Promise.all([
      store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(1)),
      store.dispatch(dummyJsonApi.endpoints.deleteProduct.initiate(2)),
    ]);

    expect(result1.error).toBeDefined();
    expect(result2.error).toBeUndefined();

    const page = dummyJsonApi.endpoints.getProducts.select(undefined)(store.getState()).data;
    expect(page?.products.map((product) => product.id)).toEqual([1]);
    expect(page?.total).toBe(1);
  });
});
