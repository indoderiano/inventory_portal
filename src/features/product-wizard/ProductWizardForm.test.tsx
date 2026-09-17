import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  fillBasicInfo,
  fillPricingAndStock,
  fillShippingDetails,
  goBack,
  goToReview,
  goToStep2,
  goToStep3,
  renderWizard,
} from "./wizardTestHelpers";

/** Fills Step 1, pricing/stock, and one valid variation on Step 2, landing
 * on Step 3. */
async function advanceToStep3(): Promise<void> {
  await fillBasicInfo({ title: "Ergonomic Keyboard" });
  await goToStep2();

  fillPricingAndStock();
  fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
  fireEvent.change(screen.getByLabelText(/color/i), { target: { value: "Midnight Blue" } });
  fireEvent.change(screen.getByLabelText(/size/i), { target: { value: "L" } });
  fireEvent.change(screen.getByPlaceholderText("SKU-ABC-1234"), {
    target: { value: "SKU-ABC-1234" },
  });

  await goToStep3();
}

/** Advances through every step with valid data, landing on Review. */
async function advanceToReview(): Promise<void> {
  await advanceToStep3();
  fillShippingDetails({ weight: "2.25" });
  await goToReview();
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProductWizardForm navigation", () => {
  it("shows a current-step indicator", async () => {
    renderWizard();
    expect(screen.getByText(/1\. Basic Information/i)).toHaveAttribute(
      "aria-current",
      "step",
    );

    await fillBasicInfo();
    await goToStep2();

    expect(screen.getByText(/2\. Variations/i)).toHaveAttribute("aria-current", "step");
  });

  it("keeps the user on Step 1 and shows errors when Step 1 is invalid", async () => {
    renderWizard();

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    // Step 2 must never appear.
    expect(screen.queryByRole("heading", { name: /variations/i })).not.toBeInTheDocument();

    // Step 1's own errors must be visible.
    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Brand is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Category is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
  });

  it("does not let Step 2/3 requirements (e.g. an empty variations list) block leaving Step 1", async () => {
    renderWizard();
    await fillBasicInfo();

    // Nothing has been done on Step 2 - if `trigger()` weren't scoped to
    // Step 1's fields, the array's `min(1)` rule would block this.
    await goToStep2();

    expect(screen.getByRole("heading", { name: /pricing, stock & variations/i })).toBeInTheDocument();
  });

  it("allows navigating to Step 2 once Step 1 is valid", async () => {
    renderWizard();
    await fillBasicInfo();
    await goToStep2();

    expect(screen.getByRole("heading", { name: /pricing, stock & variations/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^title$/i)).not.toBeInTheDocument();
  });

  it("keeps Step 1 values after navigating to Step 2 and back", async () => {
    renderWizard();
    await fillBasicInfo({ title: "Ergonomic Keyboard" });
    await goToStep2();

    goBack();

    expect(screen.getByLabelText(/^title$/i)).toHaveValue("Ergonomic Keyboard");
    expect(screen.getByLabelText(/^brand$/i)).toHaveValue("Acme");
    expect(screen.getByLabelText(/^category$/i)).toHaveValue("beauty");
    expect(screen.getByLabelText(/^description$/i)).toHaveValue(
      "A reliable wireless mouse with an ergonomic design and long battery life.",
    );
  });

  it("keeps Step 2 variation values after navigating back to Step 1 and forward again", async () => {
    renderWizard();
    await fillBasicInfo();
    await goToStep2();

    fireEvent.click(screen.getByRole("button", { name: /add variation/i }));
    fireEvent.change(screen.getByLabelText(/color/i), { target: { value: "Midnight Blue" } });
    fireEvent.change(screen.getByLabelText(/size/i), { target: { value: "L" } });
    fireEvent.change(screen.getByPlaceholderText("SKU-ABC-1234"), {
      target: { value: "SKU-ABC-1234" },
    });

    goBack();
    // Step 2 (and its variations list) isn't rendered at all while on
    // Step 1 - the step indicator's own <li>s stay in the DOM regardless
    // of which step is active, so this checks for the *list*, not just
    // any list item.
    expect(screen.queryByRole("list", { name: /^variations$/i })).not.toBeInTheDocument();

    await goToStep2();

    expect(
      within(screen.getByRole("list", { name: /^variations$/i })).getByRole("listitem"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toHaveValue("Midnight Blue");
    expect(screen.getByLabelText(/size/i)).toHaveValue("L");
    expect(screen.getByPlaceholderText("SKU-ABC-1234")).toHaveValue("SKU-ABC-1234");
  });
});

describe("ProductWizardForm Step 3 (shipping) navigation", () => {
  it("(12) navigates from Step 2 to Step 3 without any Step 3 values filled in", async () => {
    renderWizard();
    await advanceToStep3();

    expect(
      screen.getByRole("heading", { name: /shipping & supplier/i }),
    ).toBeInTheDocument();
  });

  it("(13) keeps the user on Step 3 and shows errors when Step 3 is invalid", async () => {
    renderWizard();
    await advanceToStep3();

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.queryByRole("heading", { name: /^review$/i })).not.toBeInTheDocument();

    expect(await screen.findByText(/Weight is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Width is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Height is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Depth is required/i)).toBeInTheDocument();
  });

  it("(14) allows navigating to Review once Step 3 is valid", async () => {
    renderWizard();
    await advanceToStep3();
    fillShippingDetails();

    await goToReview();

    expect(screen.getByRole("heading", { name: /^review$/i })).toBeInTheDocument();
  });

  it("(15) preserves Step 1 values after advancing through Steps 2-4 and back", async () => {
    renderWizard();
    await advanceToReview();

    goBack(); // Review -> Step 3
    goBack(); // Step 3 -> Step 2
    goBack(); // Step 2 -> Step 1

    expect(screen.getByLabelText(/^title$/i)).toHaveValue("Ergonomic Keyboard");
    expect(screen.getByLabelText(/^brand$/i)).toHaveValue("Acme");
  });

  it("(16) preserves Step 2 variation values after advancing through Steps 3-4 and back", async () => {
    renderWizard();
    await advanceToReview();

    goBack(); // Review -> Step 3
    goBack(); // Step 3 -> Step 2

    expect(
      within(screen.getByRole("list", { name: /^variations$/i })).getByRole("listitem"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/color/i)).toHaveValue("Midnight Blue");
    expect(screen.getByPlaceholderText("SKU-ABC-1234")).toHaveValue("SKU-ABC-1234");
  });

  it("(17) preserves Step 3 values when navigating backward to Step 2 and forward again", async () => {
    renderWizard();
    await advanceToReview();

    goBack(); // Review -> Step 3
    goBack(); // Step 3 -> Step 2
    await goToStep3(); // Step 2 -> Step 3 again

    expect(screen.getByLabelText(/weight/i)).toHaveValue(2.25);
    expect(screen.getByLabelText(/^width$/i)).toHaveValue(10);
    expect(screen.getByLabelText(/^height$/i)).toHaveValue(5);
    expect(screen.getByLabelText(/^depth$/i)).toHaveValue(2);
  });
});

describe("ProductWizardForm Step 3 conditional validation (fragile handling)", () => {
  it("does not require the hazardous disclaimer or shipping notes when fragile handling is off", async () => {
    renderWizard();
    await advanceToStep3();
    fillShippingDetails();

    // Fragile handling left unchecked (its default) - neither the
    // disclaimer nor the notes should block navigation.
    await goToReview();

    expect(screen.getByRole("heading", { name: /^review$/i })).toBeInTheDocument();
  });

  it("requires the hazardous disclaimer and adequate shipping notes once fragile handling is checked, per Yup's .when() rule", async () => {
    renderWizard();
    await advanceToStep3();
    fillShippingDetails();

    fireEvent.click(screen.getByLabelText(/requires special fragile handling/i));
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.queryByRole("heading", { name: /^review$/i })).not.toBeInTheDocument();
    expect(
      await screen.findByText(/You must acknowledge the hazardous material disclaimer/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Special shipping notes are required/i)).toBeInTheDocument();

    // Check the disclaimer but leave notes too short - still blocked.
    fireEvent.click(screen.getByLabelText(/hazardous material disclaimer/i));
    fireEvent.change(screen.getByLabelText(/special shipping notes/i), {
      target: { value: "too short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(
      await screen.findByText(/Special shipping notes must be at least 10 characters/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^review$/i })).not.toBeInTheDocument();

    // Satisfy both conditional rules - navigation proceeds.
    fireEvent.change(screen.getByLabelText(/special shipping notes/i), {
      target: { value: "Handle with extreme care during transit." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));

    expect(await screen.findByRole("heading", { name: /^review$/i })).toBeInTheDocument();
  });
});
