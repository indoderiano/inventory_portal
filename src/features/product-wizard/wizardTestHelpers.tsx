import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi } from "vitest";

import { makeStore, type AppStore } from "@/store/store";
import {
  createMockRouter,
  setActiveMockRouter,
  type MockRouter,
} from "@/test/utils/mockNextNavigation";

import { ProductWizardForm } from "./ProductWizardForm";

// `ProductWizardForm` calls `useRouter()` (to navigate to /products on
// successful submission), which throws outside a real Next.js App Router.
// Reuses the same in-memory router mock the URL-sync tests already built.
vi.mock("next/navigation", () => import("@/test/utils/mockNextNavigation"));

/** Renders the wizard. Accepts an optional router so a test that needs to
 * assert on navigation (e.g. `vi.spyOn(router, "push")`) can supply its
 * own; everything else gets a fresh, throwaway one. */
export function renderWizard(router: MockRouter = createMockRouter("/products/new")): AppStore {
  setActiveMockRouter(router);
  const store = makeStore();
  render(
    <Provider store={store}>
      <ProductWizardForm />
    </Provider>,
  );
  return store;
}

/** Matches the category fixture in `src/test/mocks/handlers.ts`. */
export const VALID_BASIC_INFO = {
  title: "Wireless Mouse",
  brand: "Acme",
  category: "beauty",
  description: "A reliable wireless mouse with an ergonomic design and long battery life.",
};

/** Fills Step 1 with valid data (or the given overrides) without
 * submitting/navigating. Waits for the category options to load from the
 * (mocked) DummyJSON API before selecting one. */
export async function fillBasicInfo(
  overrides: Partial<typeof VALID_BASIC_INFO> = {},
): Promise<void> {
  const values = { ...VALID_BASIC_INFO, ...overrides };

  fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: values.title } });
  fireEvent.change(screen.getByLabelText(/^brand$/i), { target: { value: values.brand } });
  await screen.findByRole("option", { name: /beauty/i });
  fireEvent.change(screen.getByLabelText(/^category$/i), { target: { value: values.category } });
  fireEvent.change(screen.getByLabelText(/^description$/i), {
    target: { value: values.description },
  });
}

export const VALID_PRICING_AND_STOCK = {
  basePrice: "29.99",
  stockQuantity: "50",
};

/** Fills Step 2's required pricing/stock fields (or the given overrides).
 * Discount percentage is optional and left untouched unless an override
 * is given. */
export function fillPricingAndStock(
  overrides: Partial<typeof VALID_PRICING_AND_STOCK> & { discountPercentage?: string } = {},
): void {
  const { discountPercentage, ...requiredOverrides } = overrides;
  const values = { ...VALID_PRICING_AND_STOCK, ...requiredOverrides };

  fireEvent.change(screen.getByLabelText(/base price/i), { target: { value: values.basePrice } });
  fireEvent.change(screen.getByLabelText(/stock quantity/i), {
    target: { value: values.stockQuantity },
  });
  if (discountPercentage !== undefined) {
    fireEvent.change(screen.getByLabelText(/discount percentage/i), {
      target: { value: discountPercentage },
    });
  }
}

export const VALID_SHIPPING_INFO = {
  weight: "1.5",
  width: "10",
  height: "5",
  depth: "2",
};

/** Fills Step 3's required numeric fields (or the given overrides).
 * Fragile-handling fields are left at their defaults (unchecked/empty) -
 * pass them explicitly via `fireEvent` in tests that need fragile=true. */
export function fillShippingDetails(overrides: Partial<typeof VALID_SHIPPING_INFO> = {}): void {
  const values = { ...VALID_SHIPPING_INFO, ...overrides };

  fireEvent.change(screen.getByLabelText(/weight/i), { target: { value: values.weight } });
  fireEvent.change(screen.getByLabelText(/^width$/i), { target: { value: values.width } });
  fireEvent.change(screen.getByLabelText(/^height$/i), { target: { value: values.height } });
  fireEvent.change(screen.getByLabelText(/^depth$/i), { target: { value: values.depth } });
}

/** Clicks "Next" and waits for Step 2 to appear - only resolves if
 * navigation actually happened, so an unexpected block on an invalid Step
 * 1 will fail the `await` with a timeout rather than silently pass. */
export async function goToStep2(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  // Matches the step's main <h2> specifically - a plain /variations/i
  // would also match the "Variations" sub-heading over the array section,
  // and `findByRole` throws on more than one match.
  await screen.findByRole("heading", { name: /pricing, stock & variations/i });
}

/** Clicks "Next" and waits for Step 3 to appear. */
export async function goToStep3(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  await screen.findByRole("heading", { name: /shipping/i });
}

/** Clicks "Next" and waits for Step 4 (Review) to appear. */
export async function goToReview(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
  await screen.findByRole("heading", { name: /^review$/i });
}

/** Clicks "Back" - lands on whichever step precedes the current one. */
export function goBack(): void {
  fireEvent.click(screen.getByRole("button", { name: /^back$/i }));
}

/** Matches the distinguishable, valid data every `advanceToReviewWithFullData`
 * caller lands on Review with, so tests can assert against known values. */
export const FULL_WIZARD_DATA = {
  title: "Ergonomic Keyboard",
  brand: "Acme",
  category: "beauty",
  description: "A comfortable mechanical keyboard built for long typing sessions.",
  basePrice: "49.99",
  stockQuantity: "120",
  discountPercentage: "15",
  variationColor: "Midnight Blue",
  variationSize: "Full-size",
  variationSku: "SKU-ABC-1234",
  weight: "2.4",
  width: "45",
  height: "15",
  depth: "20",
};

/** Renders the wizard and advances through every step with distinguishable,
 * valid data (matching `FULL_WIZARD_DATA`), landing on Review. Returns the
 * store so callers can inspect the persisted draft. */
export async function advanceToReviewWithFullData(router?: MockRouter): Promise<AppStore> {
  const store = renderWizard(router);
  await fillBasicInfo({
    title: FULL_WIZARD_DATA.title,
    brand: FULL_WIZARD_DATA.brand,
    category: FULL_WIZARD_DATA.category,
    description: FULL_WIZARD_DATA.description,
  });
  await goToStep2();

  fillPricingAndStock({
    basePrice: FULL_WIZARD_DATA.basePrice,
    stockQuantity: FULL_WIZARD_DATA.stockQuantity,
    discountPercentage: FULL_WIZARD_DATA.discountPercentage,
  });
  fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
  fireEvent.change(screen.getByLabelText(/color/i), {
    target: { value: FULL_WIZARD_DATA.variationColor },
  });
  fireEvent.change(screen.getByLabelText(/size/i), {
    target: { value: FULL_WIZARD_DATA.variationSize },
  });
  fireEvent.change(screen.getByPlaceholderText("SKU-ABC-1234"), {
    target: { value: FULL_WIZARD_DATA.variationSku },
  });
  await goToStep3();

  fillShippingDetails({
    weight: FULL_WIZARD_DATA.weight,
    width: FULL_WIZARD_DATA.width,
    height: FULL_WIZARD_DATA.height,
    depth: FULL_WIZARD_DATA.depth,
  });
  await goToReview();

  return store;
}
