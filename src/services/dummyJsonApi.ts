import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  CreateProductRequest,
  GetProductsArgs,
  Product,
  ProductCategory,
  ProductsResponse,
  UpdateProductRequest,
} from "@/types/product";

const DUMMYJSON_BASE_URL = "https://dummyjson.com";

function buildSearchParams(
  args: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export const dummyJsonApi = createApi({
  reducerPath: "dummyJsonApi",
  baseQuery: fetchBaseQuery({ baseUrl: DUMMYJSON_BASE_URL }),
  tagTypes: ["Product", "Category"],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, GetProductsArgs | void>({
      // DummyJSON cannot combine full-text search with a category-scoped
      // listing in a single request, so when both are present `q` wins:
      // `/products/search` takes precedence over `/products/category/:slug`,
      // which in turn takes precedence over the unfiltered `/products` list.
      query: (args) => {
        const { q, category, ...rest } = args ?? {};

        if (q) {
          return `/products/search${buildSearchParams({ q, ...rest })}`;
        }

        const path = category
          ? `/products/category/${encodeURIComponent(category)}`
          : "/products";
        return `${path}${buildSearchParams(rest)}`;
      },
      // The cache key must match what `query` actually requests: when `q`
      // is present, `category` has no effect on the request (see the
      // precedence note above), so it must be excluded from the key too.
      // Otherwise two args objects that hit the identical URL would land
      // in separate cache entries and fire duplicate network requests.
      serializeQueryArgs: ({ queryArgs }) => {
        const { q, category, ...rest } = queryArgs ?? {};
        return q ? { q, ...rest } : { category, ...rest };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(
                (product) => ({ type: "Product" as const, id: product.id }),
              ),
              { type: "Product" as const, id: "LIST" },
            ]
          : [{ type: "Product" as const, id: "LIST" }],
    }),

    getProductById: builder.query<Product, number>({
      query: (id) => `/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),

    getProductCategories: builder.query<ProductCategory[], void>({
      query: () => "/products/categories",
      providesTags: ["Category"],
    }),

    // A network-free, manually-managed ledger of products this client has
    // successfully created. It exists because DummyJSON's `/products/add`
    // is simulated - nothing is actually persisted server-side, so a later
    // `GET /products` (whether it's a fresh fetch or a cached entry that's
    // since expired) can never be relied on to include something just
    // created. This is the "remembering" half of that problem; the
    // "does it belong in *this* particular filtered/sorted/paginated view"
    // half is a separate, render-time decision - see
    // `mergeCreatedIntoListing` in `features/products`, which is the only
    // thing that ever reads this endpoint's data.
    //
    // `keepUnusedDataFor: Infinity` is deliberate and specific to *this*
    // endpoint: a remembered product should survive for the rest of the
    // tab's session, not just as long as some component happens to stay
    // subscribed to it. This is not the same move as bumping
    // `getProducts`'s own `keepUnusedDataFor` - that would have hidden the
    // underlying problem by keeping *stale server data* around longer; this
    // keeps a small, authoritative, client-known fact around for as long as
    // it remains true.
    createdProducts: builder.query<Product[], void>({
      queryFn: () => ({ data: [] }),
      keepUnusedDataFor: Infinity,
    }),

    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (body) => ({
        url: "/products/add",
        method: "POST",
        body,
      }),
      // A new product can introduce a category that isn't in the cached
      // category list yet. Deliberately does NOT invalidate the
      // "Product"/LIST tag - see `onQueryStarted` below and the comment on
      // `createdProducts` above for why that would actively backfire here.
      invalidatesTags: ["Category"],
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        let created: Product;
        try {
          ({ data: created } = await queryFulfilled);
        } catch {
          // The POST failed - nothing was created, so there's nothing to
          // remember.
          return;
        }

        // DummyJSON's mock always returns the same fixed id (101) for every
        // created product, since it never really allocates one - creating a
        // second product in the same session would otherwise collide with
        // the first under that id. `id` is already how this codebase treats
        // product identity everywhere else (`getProductById`, list item
        // keys, tag invalidation), so a repeat id here is treated the same
        // way: the newest data for that id replaces the old entry rather
        // than being dropped or duplicated.
        const existing = dummyJsonApi.endpoints.createdProducts.select()(getState()).data ?? [];
        const deduped = [...existing.filter((product) => product.id !== created.id), created];

        // `upsertQueryData` dispatches its own async thunk - awaited so this
        // lifecycle hook's work is genuinely finished (ledger written) by
        // the time it resolves, rather than leaving the write to land on a
        // later, unobserved microtask.
        await dispatch(dummyJsonApi.util.upsertQueryData("createdProducts", undefined, deduped));
      },
    }),

    // Both mutations below optimistically patch every `getProducts` cache
    // entry (and the `createdProducts` ledger) that actually contains the
    // affected product, then roll every one of those patches back if the
    // request fails. They deliberately do NOT invalidate the "Product"/
    // LIST or per-id tags the way `updateProduct`/`deleteProduct` used to -
    // DummyJSON's PUT/DELETE are simulated exactly like its POST is (see
    // `createProduct`'s comment on `createdProducts` above): nothing is
    // really persisted server-side, so a tag-invalidation-driven refetch
    // would hit the same unchanged static dataset and silently undo
    // whatever was just optimistically applied. Precise, direct cache
    // reconciliation replaces invalidation as the correctness mechanism
    // here, the same way it already does for `createProduct`.
    updateProduct: builder.mutation<Product, UpdateProductRequest>({
      query: ({ id, ...patch }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: patch,
      }),
      // A new category value can still introduce one the cached category
      // list doesn't have yet - unrelated endpoint, unaffected by the
      // reasoning above.
      invalidatesTags: ["Category"],
      async onQueryStarted({ id, ...patch }, { dispatch, getState, queryFulfilled }) {
        // Every `getProducts` entry containing this product provides
        // `{type: "Product", id}` (see `providesTags` above), so this
        // enumerates exactly - and only - the entries that actually need
        // patching, via the same RTK-native "select what a tag would hit,
        // without invalidating it" utility `createProduct` already uses.
        const candidates = dummyJsonApi.util
          .selectInvalidatedBy(getState(), [{ type: "Product", id }])
          .filter((candidate) => candidate.endpointName === "getProducts");

        // Rollback restores each entry's product *by id, against whatever
        // state exists when the failure actually happens* - not by
        // replaying a generic Immer inverse patch. An inverse patch is
        // only safe to replay if every patch touching the same array is
        // undone in strict reverse order, a guarantee two concurrently
        // in-flight mutations for *different* products in the same
        // `getProducts` entry can't make (one's rollback could otherwise
        // land on top of the other's already-applied, unrelated change and
        // corrupt it). Capturing "the product's own prior fields" up front
        // and reapplying by id on failure sidesteps that entirely.
        const previousByCacheKey = new Map<string, Product>();
        for (const candidate of candidates) {
          const args = candidate.originalArgs as GetProductsArgs | undefined;
          const cached = dummyJsonApi.endpoints.getProducts.select(args)(getState()).data;
          const existing = cached?.products.find((product) => product.id === id);
          if (existing) {
            previousByCacheKey.set(candidate.queryCacheKey, existing);
          }
          dispatch(
            dummyJsonApi.util.updateQueryData("getProducts", args, (draft) => {
              const target = draft.products.find((product) => product.id === id);
              if (target) {
                // Only the fields actually present in `patch` are touched -
                // everything else about the product is left exactly as it
                // was, matching `UpdateProductRequest`'s own "partial
                // update" contract.
                Object.assign(target, patch);
              }
            }),
          );
        }

        // The product may also be sitting in the `createdProducts` ledger
        // (created earlier this session, not yet reflected by any real
        // fetch). Left unreconciled, editing it here wouldn't touch the
        // ledger's stale copy, which `mergeCreatedIntoListing` would
        // eventually re-merge back over the edit once the patched
        // `getProducts` entries expire or a fresh one is fetched.
        const ledger = dummyJsonApi.endpoints.createdProducts.select()(getState()).data ?? [];
        const previousLedgerProduct = ledger.find((product) => product.id === id);
        if (previousLedgerProduct) {
          dispatch(
            dummyJsonApi.util.updateQueryData("createdProducts", undefined, (draft) => {
              const target = draft.find((product) => product.id === id);
              if (target) {
                Object.assign(target, patch);
              }
            }),
          );
        }

        try {
          await queryFulfilled;
        } catch {
          // Every optimistic change is restored by id - no partial state
          // (some entries updated, others not) is ever left behind.
          for (const candidate of candidates) {
            const previous = previousByCacheKey.get(candidate.queryCacheKey);
            if (!previous) {
              continue;
            }
            dispatch(
              dummyJsonApi.util.updateQueryData(
                "getProducts",
                candidate.originalArgs as GetProductsArgs | undefined,
                (draft) => {
                  const target = draft.products.find((product) => product.id === id);
                  if (target) {
                    Object.assign(target, previous);
                  }
                },
              ),
            );
          }
          if (previousLedgerProduct) {
            dispatch(
              dummyJsonApi.util.updateQueryData("createdProducts", undefined, (draft) => {
                const target = draft.find((product) => product.id === id);
                if (target) {
                  Object.assign(target, previousLedgerProduct);
                }
              }),
            );
          }
        }
      },
    }),

    deleteProduct: builder.mutation<Product, number>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      async onQueryStarted(id, { dispatch, getState, queryFulfilled }) {
        const candidates = dummyJsonApi.util
          .selectInvalidatedBy(getState(), [{ type: "Product", id }])
          .filter((candidate) => candidate.endpointName === "getProducts");

        // Same "restore by id against current state" reasoning as
        // `updateProduct` above - the removed product itself is read from
        // the entry's own already-finalized cached data *before* patching
        // (never from inside the Immer recipe: a value pulled out of a
        // draft via splice is still a live, nested draft proxy at that
        // point, and Immer can revoke it before this function gets a
        // chance to use it later). Capturing it this way means a failed
        // delete can reinsert the exact product without depending on a
        // positional inverse patch that a concurrent, different product's
        // delete on the same array could invalidate.
        const removedByCacheKey = new Map<string, Product>();
        for (const candidate of candidates) {
          const args = candidate.originalArgs as GetProductsArgs | undefined;
          const cached = dummyJsonApi.endpoints.getProducts.select(args)(getState()).data;
          const existing = cached?.products.find((product) => product.id === id);
          if (existing) {
            removedByCacheKey.set(candidate.queryCacheKey, existing);
          }
          dispatch(
            dummyJsonApi.util.updateQueryData("getProducts", args, (draft) => {
              const index = draft.products.findIndex((product) => product.id === id);
              if (index !== -1) {
                // Removed outright, not backfilled from a later page -
                // there's no real data available client-side for what that
                // next item would be, and fabricating one would repeat the
                // mistake already ruled out for `createProduct`.
                draft.products.splice(index, 1);
                draft.total -= 1;
              }
            }),
          );
        }

        const ledger = dummyJsonApi.endpoints.createdProducts.select()(getState()).data ?? [];
        const removedLedgerProduct = ledger.find((product) => product.id === id);
        if (removedLedgerProduct) {
          dispatch(
            dummyJsonApi.util.updateQueryData("createdProducts", undefined, (draft) => {
              const index = draft.findIndex((product) => product.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }),
          );
        }

        try {
          await queryFulfilled;
        } catch {
          for (const candidate of candidates) {
            const removed = removedByCacheKey.get(candidate.queryCacheKey);
            if (!removed) {
              continue;
            }
            dispatch(
              dummyJsonApi.util.updateQueryData(
                "getProducts",
                candidate.originalArgs as GetProductsArgs | undefined,
                (draft) => {
                  if (!draft.products.some((product) => product.id === removed.id)) {
                    draft.products.unshift(removed);
                    draft.total += 1;
                  }
                },
              ),
            );
          }
          if (removedLedgerProduct) {
            dispatch(
              dummyJsonApi.util.updateQueryData("createdProducts", undefined, (draft) => {
                if (!draft.some((product) => product.id === removedLedgerProduct.id)) {
                  draft.unshift(removedLedgerProduct);
                }
              }),
            );
          }
        }
      },
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductCategoriesQuery,
  useCreatedProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = dummyJsonApi;
