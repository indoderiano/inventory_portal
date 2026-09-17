import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store/store";

import { ProductWizardForm } from "./ProductWizardForm";

export function renderWizard(): AppStore {
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
  await screen.findByRole("heading", { name: /variations/i });
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
