import type { GetProductsArgs, Product, ProductsResponse } from "@/types/product";

/**
 * Compares two products the way the server would for a given `sortBy`/
 * `order` pair. Sorting is otherwise done entirely server-side (DummyJSON
 * receives `sortBy`/`order` as query params - see `selectProductsQueryArgs`)
 * - there is no existing client-side comparator to reuse, so this mirrors
 * the exact field/direction semantics already exposed to the user via
 * `PRODUCT_SORT_OPTIONS` rather than inventing a new sorting concept.
 * Returns `0` (no defined order) when no sort is active.
 */
function compareProducts(a: Product, b: Product, args: GetProductsArgs): number {
  const { sortBy, order } = args;
  if (!sortBy) {
    return 0;
  }

  const direction = order === "desc" ? -1 : 1;
  const left = a[sortBy];
  const right = b[sortBy];

  if (typeof left === "string" && typeof right === "string") {
    return left.localeCompare(right) * direction;
  }
  if (typeof left === "number" && typeof right === "number") {
    return (left - right) * direction;
  }
  return 0;
}

/**
 * Case-insensitive substring match against title, brand, or description.
 * This is a deliberate, documented approximation of DummyJSON's real
 * `/products/search` behavior, not an attempt to reproduce its server-side
 * relevance ranking - it exists only so a product a user just created (and
 * might immediately search for by something close to its own title/brand/
 * description) has a reasonable chance of showing up in that search view
 * too, not so search results are generally correct for arbitrary queries.
 */
function matchesSearch(product: Product, q: string): boolean {
  const term = q.toLowerCase();
  return (
    product.title.toLowerCase().includes(term) ||
    (product.brand ?? "").toLowerCase().includes(term) ||
    product.description.toLowerCase().includes(term)
  );
}

/**
 * Decides whether a single remembered product belongs in the view described
 * by `args` - the "B" half of remember-vs-belong: this says nothing about
 * whether the product was actually created, only whether *this* view should
 * show it.
 *
 * Mirrors `getProducts`'s own precedence rule (`dummyJsonApi.ts`): a search
 * term takes over the request entirely, so `q` is checked before
 * `category`, exactly like the real request ignores `category` whenever `q`
 * is present.
 */
function belongsInListing(product: Product, args: GetProductsArgs): boolean {
  if ((args.skip ?? 0) !== 0) {
    // Page 2+: there's no principled way to know a remembered product's
    // true position relative to a page of real, server-ordered data we
    // don't have, so it's never injected here.
    return false;
  }
  if (args.q) {
    return matchesSearch(product, args.q);
  }
  if (args.category) {
    return product.category === args.category;
  }
  return true;
}

/**
 * Merges remembered locally-created products into a real `getProducts`
 * page, for the current view's args. Pure: never mutates `page`,
 * `createdProducts`, or `args`, and always returns a fresh object (or the
 * exact same `page` reference when there's nothing to merge in, so callers
 * that memoize on reference equality don't re-render for nothing).
 *
 * - Only products that both *belong* in this view (`belongsInListing`) and
 *   aren't already present in `page.products` (by id) are inserted.
 * - `total` increases by exactly the number of genuinely new products
 *   inserted - it reflects "how many real products exist across the whole
 *   result set", not just how many are visible on this page, so it's
 *   incremented even for an item that gets trimmed off by the `limit` cut.
 * - Insertion order: with a sort active, an inserted product is placed
 *   using the same comparator the sort would apply (`compareProducts`), not
 *   just appended or prepended. With no sort active, remembered products go
 *   first - there's no "correct" position to defer to, and newest-first is
 *   the most useful default.
 */
export function mergeCreatedIntoListing(
  page: ProductsResponse,
  createdProducts: readonly Product[],
  args: GetProductsArgs,
): ProductsResponse {
  const existingIds = new Set(page.products.map((product) => product.id));
  const toInsert = createdProducts.filter(
    (product) => !existingIds.has(product.id) && belongsInListing(product, args),
  );

  if (toInsert.length === 0) {
    return page;
  }

  const combined = args.sortBy
    ? [...page.products, ...toInsert].sort((a, b) => compareProducts(a, b, args))
    : [...toInsert, ...page.products];

  return {
    ...page,
    products: combined.slice(0, page.limit),
    total: page.total + toInsert.length,
  };
}
