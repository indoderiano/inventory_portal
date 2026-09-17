import { fireEvent, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockProduct } from "@/test/mocks/fixtures";
import { server } from "@/test/mocks/server";
import { createMockRouter } from "@/test/utils/mockNextNavigation";
import { nth } from "@/test/utils/nth";

import { selectProductWizardDraft } from "./productWizardDraftSlice";
import {
  advanceToReviewWithFullData,
  fillBasicInfo,
  fillPricingAndStock,
  goToStep2,
  renderWizard,
} from "./wizardTestHelpers";

const DRAFT_STORAGE_KEY = "inventory-portal:product-wizard-draft";
const ADD_PRODUCT_URL = "https://dummyjson.com/products/add";

beforeEach(() => {
  window.localStorage.clear();
});

function getForm(): HTMLFormElement {
  const form = document.querySelector("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Expected a <form> element to be rendered");
  }
  return form;
}

describe("duplicate SKU blocks submission", () => {
  it("rejects submission when two variations share a SKU, without calling the API", async () => {
    let requestCount = 0;
    server.use(
      http.post(ADD_PRODUCT_URL, () => {
        requestCount += 1;
        return HttpResponse.json({ ...mockProduct, id: 101 });
      }),
    );

    renderWizard();
    await fillBasicInfo();
    await goToStep2();

    fillPricingAndStock();
    fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
    fireEvent.click(screen.getByRole("button", { name: /add variation/i }));

    const colors = screen.getAllByLabelText(/color/i);
    const sizes = screen.getAllByLabelText(/size/i);
    const skus = screen.getAllByPlaceholderText("SKU-ABC-1234");
    fireEvent.change(nth(colors, 0), { target: { value: "Red" } });
    fireEvent.change(nth(sizes, 0), { target: { value: "M" } });
    fireEvent.change(nth(skus, 0), { target: { value: "SKU-ABC-1234" } });
    fireEvent.change(nth(colors, 1), { target: { value: "Blue" } });
    fireEvent.change(nth(sizes, 1), { target: { value: "L" } });
    fireEvent.change(nth(skus, 1), { target: { value: "SKU-ABC-1234" } });

    // Fires the form's native submit event directly - this exercises the
    // exact same `handleSubmit(onValidSubmit)` resolver path the "Create
    // product" button (only rendered on Review) triggers, without relying
    // on first navigating past Step 2's own gate. That gate would *also*
    // (correctly) block this duplicate before Review is ever reached -
    // already covered elsewhere - but this test is specifically about
    // whether the actual RHF *submission* boundary itself rejects invalid
    // data, per the task's requirement to exercise that path directly.
    fireEvent.submit(getForm());

    // Step 2's own live duplicate-SKU check is already visible without
    // needing to reach Review - this is the "duplicate-SKU validation
    // error is present" the task asks to verify.
    expect(
      await screen.findByText(/Duplicate SKU: SKU-ABC-1234/i),
    ).toBeInTheDocument();

    // Give any (incorrectly) in-flight request a moment to resolve, then
    // confirm the mutation's `onValid` callback - and therefore the POST -
    // was never reached.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(requestCount).toBe(0);
  });
});

describe("successful submission", () => {
  it("validates, posts the normalized payload, clears the draft, and navigates to /products", async () => {
    let capturedBody: unknown;
    server.use(
      http.post(ADD_PRODUCT_URL, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockProduct, id: 101 });
      }),
    );

    const router = createMockRouter("/products/new");
    const pushSpy = vi.spyOn(router, "push");

    const store = await advanceToReviewWithFullData(router);

    // Review summary reflects everything just entered.
    expect(screen.getByText("Ergonomic Keyboard")).toBeInTheDocument();
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("SKU-ABC-1234")).toBeInTheDocument();

    // `DraftSync` debounces Redux/localStorage writes by 500ms; let that
    // settle so the draft is actually persisted before we prove submission
    // clears it - otherwise both "before" and "after" would just be the
    // untouched initial empty draft, and the clearing assertion below would
    // pass vacuously.
    await waitFor(() => {
      expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toContain("Ergonomic Keyboard");
    });

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    await waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith("/products");
    });

    // The POST payload is normalized: real numbers, not the raw strings
    // these fields are registered with (no `valueAsNumber`).
    expect(capturedBody).toMatchObject({
      title: "Ergonomic Keyboard",
      brand: "Acme",
      category: "beauty",
      description: "A comfortable mechanical keyboard built for long typing sessions.",
      price: 49.99,
      stock: 120,
      discountPercentage: 15,
      sku: "SKU-ABC-1234",
      weight: 2.4,
      dimensions: { width: 45, height: 15, depth: 20 },
    });
    expect(typeof (capturedBody as Record<string, unknown>).price).toBe("number");
    expect(typeof (capturedBody as Record<string, unknown>).stock).toBe("number");

    // Draft cleared: Redux slice reset, and localStorage overwritten with
    // the same empty shape, so nothing stale would reappear on reload.
    expect(selectProductWizardDraft(store.getState())).toEqual({ variations: [] });
    const persisted: unknown = JSON.parse(
      window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? "null",
    );
    expect(persisted).toEqual({ variations: [] });

    // Success feedback was shown (before/alongside the navigation call).
    expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
  });
});

describe("failed submission", () => {
  it("stays on Review, preserves the draft and form values, shows an error, and allows retry", async () => {
    server.use(
      http.post(ADD_PRODUCT_URL, () =>
        HttpResponse.json({ message: "Internal Server Error" }, { status: 500 }),
      ),
    );

    const router = createMockRouter("/products/new");
    const pushSpy = vi.spyOn(router, "push");

    const store = await advanceToReviewWithFullData(router);

    // Let `DraftSync`'s 500ms debounce settle so the draft genuinely holds
    // the entered data before the failed submit attempt - otherwise
    // "preserved" would be trivially true of an untouched empty draft.
    await waitFor(() => {
      expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toContain("Ergonomic Keyboard");
    });
    const draftBefore = selectProductWizardDraft(store.getState());
    expect(draftBefore.title).toBe("Ergonomic Keyboard");

    fireEvent.click(screen.getByRole("button", { name: /create product/i }));

    expect(
      await screen.findByText(/couldn't create this product/i),
    ).toBeInTheDocument();

    // Never navigated away.
    expect(pushSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /^review$/i })).toBeInTheDocument();

    // Form values are exactly as entered - nothing was reset.
    expect(screen.getByText("Ergonomic Keyboard")).toBeInTheDocument();
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("SKU-ABC-1234")).toBeInTheDocument();

    // The draft slice was never touched by the failed attempt - same
    // reference, not just equal content, proving no dispatch occurred.
    expect(selectProductWizardDraft(store.getState())).toBe(draftBefore);
    expect(window.localStorage.getItem(DRAFT_STORAGE_KEY)).toContain("Ergonomic Keyboard");

    // Retry is possible: the button isn't stuck disabled.
    expect(screen.getByRole("button", { name: /create product/i })).not.toBeDisabled();
  });
});
