import { describe, expect, it } from "vitest";

import type { GetProductsArgs, Product, ProductsResponse } from "@/types/product";

import { mergeCreatedIntoListing } from "./mergeCreatedIntoListing";

function makeProduct(overrides: Partial<Product> & { id: number }): Product {
  return {
    title: "Existing Product",
    description: "A perfectly ordinary existing product.",
    category: "beauty",
    price: 10,
    discountPercentage: 0,
    rating: 4,
    stock: 10,
    tags: [],
    brand: "Acme",
    sku: "SKU-0000",
    weight: 1,
    dimensions: { width: 1, height: 1, depth: 1 },
    warrantyInformation: "No warranty",
    shippingInformation: "Ships in 1 week",
    availabilityStatus: "In Stock",
    reviews: [],
    returnPolicy: "No return policy",
    minimumOrderQuantity: 1,
    meta: {
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      barcode: "0000000000000",
      qrCode: "https://dummyjson.com/public/qr-code.png",
    },
    images: [],
    thumbnail: "https://cdn.dummyjson.com/thumbnail.png",
    ...overrides,
  };
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

const NO_FILTERS: GetProductsArgs = { limit: 12, skip: 0 };

describe("mergeCreatedIntoListing", () => {
  it("(1) inserts a remembered product into the default, page-1 listing", () => {
    const p1 = makeProduct({ id: 1, title: "P1" });
    const p2 = makeProduct({ id: 2, title: "P2" });
    const created = makeProduct({ id: 100, title: "Brand New Gadget" });

    const result = mergeCreatedIntoListing(makePage([p1, p2]), [created], NO_FILTERS);

    expect(result.products.map((p) => p.title)).toEqual(["Brand New Gadget", "P1", "P2"]);
    expect(result.total).toBe(3);
  });

  it("(2) inserts a remembered product when its category matches the active category filter", () => {
    const p1 = makeProduct({ id: 1, category: "beauty" });
    const created = makeProduct({ id: 100, category: "beauty", title: "New Beauty Item" });

    const result = mergeCreatedIntoListing(makePage([p1]), [created], {
      category: "beauty",
      limit: 12,
      skip: 0,
    });

    expect(result.products.some((p) => p.id === 100)).toBe(true);
    expect(result.total).toBe(2);
  });

  it("(3) excludes a remembered product whose category does not match the active category filter", () => {
    const p1 = makeProduct({ id: 1, category: "beauty" });
    const created = makeProduct({ id: 100, category: "electronics", title: "New Gadget" });

    const page = makePage([p1]);
    const result = mergeCreatedIntoListing(page, [created], {
      category: "beauty",
      limit: 12,
      skip: 0,
    });

    expect(result).toBe(page);
    expect(result.products.some((p) => p.id === 100)).toBe(false);
  });

  it("(4) inserts a remembered product whose title matches the active search term", () => {
    const created = makeProduct({ id: 100, title: "Ergonomic Keyboard", brand: "Acme", description: "A keyboard." });

    const result = mergeCreatedIntoListing(makePage([]), [created], { q: "keyboard", limit: 12, skip: 0 });

    expect(result.products.some((p) => p.id === 100)).toBe(true);
  });

  it("(5) inserts a remembered product whose brand matches the active search term", () => {
    const created = makeProduct({
      id: 100,
      title: "Wireless Mouse",
      brand: "Logitrix",
      description: "A mouse.",
    });

    const result = mergeCreatedIntoListing(makePage([]), [created], { q: "logitrix", limit: 12, skip: 0 });

    expect(result.products.some((p) => p.id === 100)).toBe(true);
  });

  it("(6) inserts a remembered product whose description matches the active search term", () => {
    const created = makeProduct({
      id: 100,
      title: "Wireless Mouse",
      brand: "Acme",
      description: "Built for long typing sessions with extra padding.",
    });

    const result = mergeCreatedIntoListing(makePage([]), [created], { q: "padding", limit: 12, skip: 0 });

    expect(result.products.some((p) => p.id === 100)).toBe(true);
  });

  it("(7) excludes a remembered product that matches neither title, brand, nor description", () => {
    const created = makeProduct({
      id: 100,
      title: "Wireless Mouse",
      brand: "Acme",
      description: "A reliable mouse.",
    });

    const page = makePage([]);
    const result = mergeCreatedIntoListing(page, [created], { q: "keyboard", limit: 12, skip: 0 });

    expect(result).toBe(page);
  });

  it("(8) never injects a remembered product into page 2+", () => {
    const created = makeProduct({ id: 100, title: "Brand New Gadget" });
    const page = makePage([makeProduct({ id: 1 })], { skip: 12, total: 24 });

    const result = mergeCreatedIntoListing(page, [created], { limit: 12, skip: 12 });

    expect(result).toBe(page);
  });

  it("(9) positions a belonging remembered product using the active sort comparator", () => {
    const cheap = makeProduct({ id: 1, price: 10 });
    const expensive = makeProduct({ id: 2, price: 30 });
    const created = makeProduct({ id: 100, price: 20, title: "Mid-priced Gadget" });

    const result = mergeCreatedIntoListing(makePage([cheap, expensive]), [created], {
      sortBy: "price",
      order: "asc",
      limit: 12,
      skip: 0,
    });

    expect(result.products.map((p) => p.id)).toEqual([1, 100, 2]);
  });

  it("positions a belonging remembered product using a string-field sort comparator", () => {
    const apple = makeProduct({ id: 1, title: "Apple Case" });
    const zebra = makeProduct({ id: 2, title: "Zebra Stand" });
    const created = makeProduct({ id: 100, title: "Monitor Arm" });

    const result = mergeCreatedIntoListing(makePage([apple, zebra]), [created], {
      sortBy: "title",
      order: "asc",
      limit: 12,
      skip: 0,
    });

    expect(result.products.map((p) => p.id)).toEqual([1, 100, 2]);
  });

  it("treats an unsortable field comparison (e.g. one side missing brand) as equal rather than throwing", () => {
    const noBrand = makeProduct({ id: 1, brand: undefined });
    const created = makeProduct({ id: 100, brand: "Acme", title: "Branded Gadget" });

    const result = mergeCreatedIntoListing(makePage([noBrand]), [created], {
      sortBy: "brand",
      order: "asc",
      limit: 12,
      skip: 0,
    });

    expect(result.products.map((p) => p.id)).toEqual([1, 100]);
  });

  it("(10) does not duplicate a remembered product already present in the real server response", () => {
    const existing = makeProduct({ id: 100, title: "Already Here" });
    const rememberedSameId = makeProduct({ id: 100, title: "Already Here" });

    const page = makePage([existing]);
    const result = mergeCreatedIntoListing(page, [rememberedSameId], NO_FILTERS);

    expect(result).toBe(page);
    expect(result.products.filter((p) => p.id === 100)).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("(11) inserts multiple remembered products that all belong", () => {
    const p1 = makeProduct({ id: 1 });
    const createdA = makeProduct({ id: 101, title: "First New" });
    const createdB = makeProduct({ id: 102, title: "Second New" });

    const result = mergeCreatedIntoListing(makePage([p1]), [createdA, createdB], NO_FILTERS);

    expect(result.products.map((p) => p.id)).toEqual([101, 102, 1]);
    expect(result.total).toBe(3);
  });

  it("(12) trims the merged page back down to the configured limit", () => {
    const page = makePage(
      [makeProduct({ id: 1 }), makeProduct({ id: 2 }), makeProduct({ id: 3 })],
      { limit: 3, total: 100 },
    );
    const created = makeProduct({ id: 100, title: "Brand New Gadget" });

    const result = mergeCreatedIntoListing(page, [created], { limit: 3, skip: 0 });

    expect(result.products).toHaveLength(3);
    expect(result.products.map((p) => p.id)).toEqual([100, 1, 2]);
    expect(result.products.some((p) => p.id === 3)).toBe(false);
  });

  it("(13) increments total by exactly the number of newly inserted products, even ones trimmed off the page", () => {
    const page = makePage([makeProduct({ id: 1 })], { limit: 1, total: 50 });
    const createdA = makeProduct({ id: 101, title: "First New" });
    const createdB = makeProduct({ id: 102, title: "Second New" });

    const result = mergeCreatedIntoListing(page, [createdA, createdB], { limit: 1, skip: 0 });

    // Only one of the two new products fits on a page this small...
    expect(result.products).toHaveLength(1);
    // ...but both are genuinely new products that now exist, so total
    // reflects both.
    expect(result.total).toBe(52);
  });

  it("(14) merges remembered products into an empty real server response", () => {
    const created = makeProduct({ id: 100, title: "Brand New Gadget" });
    const page = makePage([], { total: 0, limit: 12 });

    const result = mergeCreatedIntoListing(page, [created], NO_FILTERS);

    expect(result.products).toEqual([created]);
    expect(result.total).toBe(1);
  });

  it("returns the exact same page reference when nothing needs to be merged in", () => {
    const page = makePage([makeProduct({ id: 1 })]);

    const result = mergeCreatedIntoListing(page, [], NO_FILTERS);

    expect(result).toBe(page);
  });

  it("never mutates its inputs", () => {
    const p1 = makeProduct({ id: 1 });
    const page = makePage([p1]);
    const created = makeProduct({ id: 100, title: "Brand New Gadget" });
    const createdProducts = [created];

    const pageSnapshot = structuredClone(page);
    const createdSnapshot = structuredClone(createdProducts);

    mergeCreatedIntoListing(page, createdProducts, NO_FILTERS);

    expect(page).toEqual(pageSnapshot);
    expect(createdProducts).toEqual(createdSnapshot);
  });
});
