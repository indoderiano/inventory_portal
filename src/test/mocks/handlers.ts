import { HttpResponse, http } from "msw";

import { mockProduct, mockProductsResponse } from "./fixtures";

const DUMMYJSON_BASE_URL = "https://dummyjson.com";

export const handlers = [
  http.get(`${DUMMYJSON_BASE_URL}/products`, () =>
    HttpResponse.json(mockProductsResponse),
  ),

  http.get(`${DUMMYJSON_BASE_URL}/products/search`, () =>
    HttpResponse.json(mockProductsResponse),
  ),

  http.get(`${DUMMYJSON_BASE_URL}/products/categories`, () =>
    HttpResponse.json([{ slug: "beauty", name: "Beauty", url: `${DUMMYJSON_BASE_URL}/products/category/beauty` }]),
  ),

  http.get(`${DUMMYJSON_BASE_URL}/products/:id`, ({ params }) =>
    HttpResponse.json({ ...mockProduct, id: Number(params.id) }),
  ),

  http.post(`${DUMMYJSON_BASE_URL}/products/add`, async ({ request }) => {
    // `Request.json()` is typed `Promise<any>` by the Fetch API lib types;
    // cast immediately at the declaration site so `any` never propagates
    // any further than this one line.
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...mockProduct, ...body, id: 101 });
  }),

  http.put(`${DUMMYJSON_BASE_URL}/products/:id`, async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockProduct,
      ...body,
      id: Number(params.id),
    });
  }),

  http.delete(`${DUMMYJSON_BASE_URL}/products/:id`, ({ params }) =>
    HttpResponse.json({ ...mockProduct, id: Number(params.id), isDeleted: true }),
  ),
];
