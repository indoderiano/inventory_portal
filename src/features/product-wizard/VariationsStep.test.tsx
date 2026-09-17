import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { nth } from "@/test/utils/nth";

import { fillBasicInfo, goToStep2, renderWizard } from "./wizardTestHelpers";

/** Renders the wizard and navigates to Step 2 with valid Step 1 data,
 * since VariationsStep is no longer shown by default. */
async function renderAtStep2() {
  renderWizard();
  await fillBasicInfo();
  await goToStep2();
}

function addVariation() {
  fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
}

/** Scoped to the variations `<ul aria-label="Variations">` specifically -
 * the wizard's step indicator is also an `<ol>` of `<li>`s, which would
 * otherwise match a bare `getAllByRole("listitem")` too. */
function variationRows() {
  return within(screen.getByRole("list", { name: /^variations$/i })).getAllByRole("listitem");
}

function queryVariationRows() {
  return within(screen.getByRole("list", { name: /^variations$/i })).queryAllByRole(
    "listitem",
  );
}

/** Fills one row with a fully valid variation and blurs it, so a
 * whole-form validation pass doesn't leave it with any errors. */
function fillValidVariation(rowIndex: number, sku: string) {
  fireEvent.change(nth(screen.getAllByLabelText(/color/i), rowIndex), {
    target: { value: "Red" },
  });
  fireEvent.change(nth(screen.getAllByLabelText(/size/i), rowIndex), {
    target: { value: "M" },
  });
  fireEvent.change(nth(screen.getAllByPlaceholderText("SKU-ABC-1234"), rowIndex), {
    target: { value: sku },
  });
  const priceInput = nth(screen.getAllByLabelText(/extra price/i), rowIndex);
  fireEvent.change(priceInput, { target: { value: "5" } });
  fireEvent.blur(priceInput);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("VariationsStep", () => {
  it("starts with no variations", async () => {
    await renderAtStep2();
    expect(queryVariationRows()).toHaveLength(0);
  });

  it("adds a variation row when 'Add variation' is clicked", async () => {
    await renderAtStep2();
    addVariation();
    expect(variationRows()).toHaveLength(1);
    addVariation();
    expect(variationRows()).toHaveLength(2);
  });

  it("removes the correct row, preserving the others' values (stable keys)", async () => {
    await renderAtStep2();
    addVariation();
    addVariation();
    addVariation();
    expect(variationRows()).toHaveLength(3);

    const colorInputs = screen.getAllByLabelText(/color/i);
    fireEvent.change(nth(colorInputs, 0), { target: { value: "Red" } });
    fireEvent.change(nth(colorInputs, 1), { target: { value: "Green" } });
    fireEvent.change(nth(colorInputs, 2), { target: { value: "Blue" } });

    // Remove the middle row.
    fireEvent.click(nth(screen.getAllByRole("button", { name: /remove/i }), 1));

    const remaining = screen.getAllByLabelText(/color/i) as HTMLInputElement[];
    expect(remaining.map((input) => input.value)).toEqual(["Red", "Blue"]);
  });

  it("rejects an SKU that doesn't match SKU-[A-Z]{3}-[0-9]{4}", async () => {
    await renderAtStep2();
    addVariation();

    const skuInput = screen.getByPlaceholderText("SKU-ABC-1234");
    fireEvent.change(skuInput, { target: { value: "not-a-sku" } });
    fireEvent.blur(skuInput);

    expect(
      await screen.findByText(/SKU must match SKU-XXX-0000/i),
    ).toBeInTheDocument();
  });

  it("accepts a valid SKU", async () => {
    await renderAtStep2();
    addVariation();

    const skuInput = screen.getByPlaceholderText("SKU-ABC-1234");
    fireEvent.change(skuInput, { target: { value: "SKU-ABC-1234" } });
    fireEvent.blur(skuInput);

    expect(screen.queryByText(/SKU must match/i)).not.toBeInTheDocument();
  });

  it("flags duplicate SKUs across rows with the array-level error", async () => {
    await renderAtStep2();
    addVariation();
    addVariation();

    fillValidVariation(0, "SKU-ABC-1234");
    fillValidVariation(1, "SKU-ABC-1234");

    expect(
      await screen.findByText(/Duplicate SKU: SKU-ABC-1234/i),
    ).toBeInTheDocument();
  });

  it("does not re-render any row from typing alone (uncontrolled inputs)", async () => {
    await renderAtStep2();
    addVariation();
    addVariation();
    addVariation();

    const before = variationRows().map((row) => row.getAttribute("data-render-count"));

    fireEvent.change(nth(screen.getAllByLabelText(/color/i), 1), {
      target: { value: "Green" },
    });

    const after = variationRows().map((row) => row.getAttribute("data-render-count"));

    expect(after).toEqual(before);
  });

  it("re-renders only the row whose own validation error changed, never its siblings", async () => {
    await renderAtStep2();
    addVariation();
    addVariation();
    addVariation();

    // Rows 0 and 2 are made fully valid up front. A whole-form validation
    // pass runs on every blur (RHF + a resolver validate the whole form,
    // not just the blurred field), so if these rows still had empty
    // required fields, blurring row 1 would give *them* new errors too -
    // a legitimate render, not evidence of a leak. Isolating row 1's own
    // color/size means its only remaining problem is the bad SKU.
    fillValidVariation(0, "SKU-AAA-0001");
    fillValidVariation(2, "SKU-CCC-0003");
    fireEvent.change(nth(screen.getAllByLabelText(/color/i), 1), {
      target: { value: "Red" },
    });
    fireEvent.change(nth(screen.getAllByLabelText(/size/i), 1), {
      target: { value: "M" },
    });

    const before = variationRows().map((row) => Number(row.getAttribute("data-render-count")));

    const skuInputs = screen.getAllByPlaceholderText("SKU-ABC-1234");
    const row1Sku = nth(skuInputs, 1);
    fireEvent.change(row1Sku, { target: { value: "invalid-sku" } });
    fireEvent.blur(row1Sku);

    await screen.findByText(/SKU must match SKU-XXX-0000/i);

    const after = variationRows().map((row) => Number(row.getAttribute("data-render-count")));

    expect(nth(after, 0)).toBe(nth(before, 0));
    expect(nth(after, 2)).toBe(nth(before, 2));
    expect(nth(after, 1)).toBeGreaterThan(nth(before, 1));
  });

  it("requires at least one variation", async () => {
    await renderAtStep2();
    addVariation();
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(
      await screen.findByText(/Add at least one variation/i),
    ).toBeInTheDocument();
  });
});
