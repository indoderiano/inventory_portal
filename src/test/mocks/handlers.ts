import { HttpResponse, http } from "msw";

import { mockProduct, mockProductsResponse } from "./fixtures";

const DUMMYJSON_BASE_URL = "https://dummyjson.com";

/**
 * Simulates the real DummyJSON API's own PUT/DELETE endpoints failing
 * roughly `rate` of the time - this is "the mock backend", the only backend
 * this app has, so it's the correct place for the assessment's "20%
 * simulated failure" to live (an API-layer behavior, not a UI lie).
 *
 * Deliberately never used by a test that cares about a specific outcome -
 * every such test overrides the handler entirely via `server.use(...)`
 * (the same idiom already used throughout this file/suite), so behavioral
 * tests never depend on `Math.random()` and stay fully deterministic.
 */
function shouldSimulateFailure(rate: number): boolean {
  return Math.random() < rate;
}

const SIMULATED_MUTATION_FAILURE_RATE = 0.2;

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
    if (shouldSimulateFailure(SIMULATED_MUTATION_FAILURE_RATE)) {
      return HttpResponse.json({ message: "Simulated update failure" }, { status: 500 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockProduct,
      ...body,
      id: Number(params.id),
    });
  }),

  http.delete(`${DUMMYJSON_BASE_URL}/products/:id`, ({ params }) => {
    if (shouldSimulateFailure(SIMULATED_MUTATION_FAILURE_RATE)) {
      return HttpResponse.json({ message: "Simulated delete failure" }, { status: 500 });
    }
    return HttpResponse.json({ ...mockProduct, id: Number(params.id), isDeleted: true });
  }),
];
