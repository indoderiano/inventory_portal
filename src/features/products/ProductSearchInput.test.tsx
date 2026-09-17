import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";

import { ProductSearchInput } from "./ProductSearchInput";

function renderWithStore() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ProductSearchInput />
    </Provider>,
  );
  return store;
}

describe("ProductSearchInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit a search to Redux before the 300ms debounce elapses", () => {
    const store = renderWithStore();
    const input = screen.getByRole("searchbox", { name: /search/i });

    fireEvent.change(input, { target: { value: "pho" } });
    vi.advanceTimersByTime(299);

    expect(store.getState().productFilters.search).toBe("");
  });

  it("commits only the final value after rapid keystrokes settle", () => {
    const store = renderWithStore();
    const input = screen.getByRole("searchbox", { name: /search/i });

    fireEvent.change(input, { target: { value: "p" } });
    vi.advanceTimersByTime(100);
    fireEvent.change(input, { target: { value: "ph" } });
    vi.advanceTimersByTime(100);
    fireEvent.change(input, { target: { value: "pho" } });
    vi.advanceTimersByTime(100);
    fireEvent.change(input, { target: { value: "phone" } });

    // Only 300ms of *silence* after the last keystroke should commit.
    vi.advanceTimersByTime(299);
    expect(store.getState().productFilters.search).toBe("");

    vi.advanceTimersByTime(1);
    expect(store.getState().productFilters.search).toBe("phone");
  });

  it("keeps the input visually responsive even though the commit is delayed", () => {
    renderWithStore();
    const input = screen.getByRole("searchbox", { name: /search/i }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "instant" } });

    expect(input.value).toBe("instant");
  });
});
