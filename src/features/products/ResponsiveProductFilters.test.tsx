import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";

import { makeStore } from "@/store/store";
import { nth } from "@/test/utils/nth";

import { ResponsiveProductFilters } from "./ResponsiveProductFilters";

// jsdom does not evaluate CSS media queries or Tailwind's responsive
// display classes (`hidden md:flex`, `md:hidden`) - it has no layout
// engine, so it can't tell "hidden below md" apart from "visible above
// md". These tests verify the *structural* behavior instead: the trigger
// and drawer exist, open/close correctly, use correct dialog semantics,
// and drive the same Redux state as the standalone filter controls. Which
// element is *visually* shown at a given viewport width is Tailwind's
// job, not something exercised here.
function renderComponent() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ResponsiveProductFilters />
    </Provider>,
  );
  return store;
}

describe("ResponsiveProductFilters", () => {
  it("renders a Filters trigger button", () => {
    renderComponent();

    expect(screen.getByRole("button", { name: /^filters$/i })).toBeInTheDocument();
  });

  it("clicking the trigger opens an accessible dialog", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: /^filters$/i }));

    const dialog = screen.getByRole("dialog", { name: /filters/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus into the panel when it opens", () => {
    renderComponent();

    fireEvent.click(screen.getByRole("button", { name: /^filters$/i }));

    expect(screen.getByRole("dialog")).toHaveFocus();
  });

  it("Close button closes the drawer and returns focus to the trigger", () => {
    renderComponent();
    const trigger = screen.getByRole("button", { name: /^filters$/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("Escape closes the drawer and returns focus to the trigger", () => {
    renderComponent();
    const trigger = screen.getByRole("button", { name: /^filters$/i });
    fireEvent.click(trigger);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("clicking the backdrop closes the drawer", () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <ResponsiveProductFilters />
      </Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^filters$/i }));

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mounts the drawer's own filter controls only while it is open", () => {
    renderComponent();

    // One instance always in the DOM (the desktop copy, CSS-hidden below
    // `md` but still mounted).
    expect(screen.getAllByRole("searchbox", { name: /search/i })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(screen.getAllByRole("searchbox", { name: /search/i })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.getAllByRole("searchbox", { name: /search/i })).toHaveLength(1);
  });

  it("dispatches the exact same Redux filter actions as the standalone controls - no new filter state", async () => {
    const store = renderComponent();
    fireEvent.click(screen.getByRole("button", { name: /^filters$/i }));

    const searchboxes = screen.getAllByRole("searchbox", { name: /search/i });
    fireEvent.change(nth(searchboxes, 1), { target: { value: "phone" } });

    await waitFor(() => expect(store.getState().productFilters.search).toBe("phone"));
  });
});
