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

    createProduct: builder.mutation<Product, CreateProductRequest>({
      query: (body) => ({
        url: "/products/add",
        method: "POST",
        body,
      }),
      // Also invalidates "Category" since a new product can introduce a
      // category that isn't in the cached category list yet.
      invalidatesTags: [{ type: "Product", id: "LIST" }, "Category"],
    }),

    updateProduct: builder.mutation<Product, UpdateProductRequest>({
      query: ({ id, ...patch }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: patch,
      }),
      // Also invalidates "Category" since editing a product's category can
      // likewise introduce one the cached category list doesn't have yet.
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "Category",
      ],
    }),

    deleteProduct: builder.mutation<Product, number>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = dummyJsonApi;
