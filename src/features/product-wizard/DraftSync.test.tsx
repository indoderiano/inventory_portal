import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nth } from "@/test/utils/nth";

import { selectProductWizardDraft } from "./productWizardDraftSlice";
import { fillBasicInfo, goToStep2, goToStep3, renderWizard } from "./wizardTestHelpers";

const DRAFT_STORAGE_KEY = "inventory-portal:product-wizard-draft";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("draft persistence (watch -> Redux -> localStorage)", () => {
  it("does not commit to Redux before the debounce elapses", async () => {
    const store = renderWizard();
    await fillBasicInfo();
    await goToStep2();

    // Fake timers only from here: the navigation above needs RTL's
    // findBy* polling, which relies on the real clock.
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
    fireEvent.change(nth(screen.getAllByLabelText(/color/i), 0), {
      target: { value: "Red" },
    });

    vi.advanceTimersByTime(499);
    expect(selectProductWizardDraft(store.getState()).variations?.[0]?.color).toBeUndefined();
  });

  it("commits the watched form values to Redux, then to localStorage, after the debounce settles", async () => {
    const store = renderWizard();
    await fillBasicInfo();
    await goToStep2();

    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
    fireEvent.change(nth(screen.getAllByLabelText(/color/i), 0), {
      target: { value: "Red" },
    });

    vi.advanceTimersByTime(500);

    expect(selectProductWizardDraft(store.getState()).variations?.[0]?.color).toBe("Red");

    const persisted: unknown = JSON.parse(
      window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null",
    );
    expect(persisted).toMatchObject({ variations: [{ color: "Red" }] });
  });

  it("restores a persisted draft (Step 1, Step 2, and Step 3 fields) on the next mount", async () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        title: "Wireless Mouse",
        brand: "Acme",
        category: "beauty",
        description: "A reliable wireless mouse with an ergonomic design and long battery life.",
        variations: [{ color: "Red", size: "M", sku: "SKU-ABC-1234", extraPrice: 5 }],
        weight: 1.5,
        dimensions: { width: 10, height: 5, depth: 2 },
        requiresSpecialFragileHandling: false,
        hazardousMaterialDisclaimer: false,
        specialShippingNotes: "",
      }),
    );

    renderWizard();

    const titleInput = screen.getByLabelText(/^title$/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Wireless Mouse");

    await goToStep2();
    const colorInput = screen.getByLabelText(/color/i) as HTMLInputElement;
    expect(colorInput.value).toBe("Red");

    await goToStep3();
    expect(screen.getByLabelText(/weight/i)).toHaveValue(1.5);
    expect(screen.getByLabelText(/^width$/i)).toHaveValue(10);
  });
});
