import { render } from "@testing-library/react";
import { act, StrictMode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { createMockRouter, setActiveMockRouter } from "@/test/utils/mockNextNavigation";
import { makeStore, type AppStore } from "@/store/store";

import { productFiltersActions } from "./productFiltersSlice";
import { useProductFiltersUrlSync } from "./useProductFiltersUrlSync";

vi.mock("next/navigation", () => import("@/test/utils/mockNextNavigation"));

function Harness() {
  useProductFiltersUrlSync();
  return null;
}

function renderHarness(store: AppStore) {
  return render(
    <Provider store={store}>
      <Harness />
    </Provider>,
  );
}

describe("useProductFiltersUrlSync", () => {
  it("hydrates Redux from a fully populated URL on mount", () => {
    setActiveMockRouter(
      createMockRouter("/products?search=phone&category=smartphones&sort=price-asc&page=2"),
    );
    const store = makeStore();

    renderHarness(store);

    expect(store.getState().productFilters).toEqual({
      search: "phone",
      category: "smartphones",
      sort: "price-asc",
      page: 2,
    });
  });

  it("leaves Redux at defaults when the URL has no filter params", () => {
    setActiveMockRouter(createMockRouter("/products"));
    const store = makeStore();

    renderHarness(store);

    expect(store.getState().productFilters).toEqual({
      search: "",
      category: null,
      sort: null,
      page: 1,
    });
  });

  it("pushes a URL update when a Redux filter change is dispatched", () => {
    const router = createMockRouter("/products");
    setActiveMockRouter(router);
    const store = makeStore();

    renderHarness(store);

    act(() => {
      store.dispatch(productFiltersActions.categoryChanged("beauty"));
    });

    expect(router.getPathnameSnapshot()).toBe("/products");
    expect(router.getSearchParamsSnapshot().get("category")).toBe("beauty");
  });

  it("does not push a URL update on mount even though Redux hydrates", () => {
    const router = createMockRouter("/products?category=beauty");
    setActiveMockRouter(router);
    const pushSpy = vi.spyOn(router, "push");
    const store = makeStore();

    renderHarness(store);

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("updates Redux when the URL changes externally while mounted", () => {
    const router = createMockRouter("/products");
    setActiveMockRouter(router);
    const store = makeStore();

    renderHarness(store);

    act(() => {
      router.push("/products?category=beauty");
    });

    expect(store.getState().productFilters.category).toBe("beauty");
  });

  it("restores prior Redux state when the browser back/forward buttons are used", () => {
    const router = createMockRouter("/products");
    setActiveMockRouter(router);
    const store = makeStore();

    renderHarness(store);

    act(() => {
      store.dispatch(productFiltersActions.categoryChanged("beauty"));
    });
    act(() => {
      store.dispatch(productFiltersActions.categoryChanged("smartphones"));
    });

    expect(store.getState().productFilters.category).toBe("smartphones");

    act(() => {
      router.back();
    });
    expect(store.getState().productFilters.category).toBe("beauty");

    act(() => {
      router.back();
    });
    expect(store.getState().productFilters.category).toBeNull();

    act(() => {
      router.forward();
    });
    expect(store.getState().productFilters.category).toBe("beauty");

    act(() => {
      router.forward();
    });
    expect(store.getState().productFilters.category).toBe("smartphones");
  });

  it("does not loop or strip URL params on mount under React Strict Mode", () => {
    // Next.js's App Router enables Strict Mode by default (reactStrictMode
    // unset in next.config.ts), which double-invokes effect setup
    // functions on mount without resetting refs between the two calls. A
    // mount-count guard only survives one extra invocation and previously
    // caused an infinite render loop here; regression test for that fix.
    const router = createMockRouter("/products?category=beauty");
    setActiveMockRouter(router);
    const pushSpy = vi.spyOn(router, "push");
    const store = makeStore();

    render(
      <StrictMode>
        <Provider store={store}>
          <Harness />
        </Provider>
      </StrictMode>,
    );

    expect(pushSpy).not.toHaveBeenCalled();
    expect(store.getState().productFilters.category).toBe("beauty");
  });
});
