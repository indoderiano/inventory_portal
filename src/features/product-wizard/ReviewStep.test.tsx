import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  advanceToReviewWithFullData,
  goBack,
  goToReview,
  goToStep2,
  goToStep3,
} from "./wizardTestHelpers";

beforeEach(() => {
  window.localStorage.clear();
});

/** Every `ReviewSection` renders as a `<section>` containing its own
 * heading and "Edit" button - scoping queries to it is what disambiguates
 * identical field/button text ("Edit", a shared color/size, etc.) that
 * appears in more than one section. */
function sectionFor(headingName: RegExp): HTMLElement {
  const heading = screen.getByRole("heading", { name: headingName });
  const section = heading.closest("section");
  if (!(section instanceof HTMLElement)) {
    throw new Error(`Expected heading matching ${headingName.toString()} to be inside a <section>`);
  }
  return section;
}

function clickEditIn(headingName: RegExp): void {
  fireEvent.click(within(sectionFor(headingName)).getByRole("button", { name: /^edit$/i }));
}

describe("ReviewStep", () => {
  it("(1) displays Step 1 values correctly", async () => {
    await advanceToReviewWithFullData();

    const section = sectionFor(/basic product information/i);
    expect(within(section).getByText("Ergonomic Keyboard")).toBeInTheDocument();
    expect(within(section).getByText("Acme")).toBeInTheDocument();
    expect(await within(section).findByText("Beauty")).toBeInTheDocument();
    expect(
      within(section).getByText(/A comfortable mechanical keyboard/i),
    ).toBeInTheDocument();
  });

  it("(2) displays Step 2 pricing & stock values correctly", async () => {
    await advanceToReviewWithFullData();

    const section = sectionFor(/^pricing & stock$/i);
    expect(within(section).getByText("$49.99")).toBeInTheDocument();
    expect(within(section).getByText("120")).toBeInTheDocument();
    expect(within(section).getByText("15%")).toBeInTheDocument();
  });

  it("(3) displays all SKU variations", async () => {
    await advanceToReviewWithFullData();

    const section = sectionFor(/product variations/i);
    expect(within(section).getByText("Midnight Blue")).toBeInTheDocument();
    expect(within(section).getByText("Full-size")).toBeInTheDocument();
    expect(within(section).getByText("SKU-ABC-1234")).toBeInTheDocument();
    expect(within(section).getByText("$0.00")).toBeInTheDocument();
  });

  it("(4) displays Step 3 shipping values correctly", async () => {
    await advanceToReviewWithFullData();

    const section = sectionFor(/shipping & supplier/i);
    expect(within(section).getByText("2.4 kg")).toBeInTheDocument();
    expect(within(section).getByText("45")).toBeInTheDocument();
    expect(within(section).getByText("15")).toBeInTheDocument();
    expect(within(section).getByText("20")).toBeInTheDocument();
  });

  it("(5) displays fragile-handling values correctly, both off and on", async () => {
    await advanceToReviewWithFullData();

    const offSection = sectionFor(/shipping & supplier/i);
    expect(within(offSection).getByText("No")).toBeInTheDocument();
    expect(within(offSection).getByText("Not applicable")).toBeInTheDocument();
    expect(within(offSection).getByText("None provided")).toBeInTheDocument();

    clickEditIn(/shipping & supplier/i);
    fireEvent.click(screen.getByLabelText(/requires special fragile handling/i));
    fireEvent.click(screen.getByLabelText(/hazardous material disclaimer/i));
    fireEvent.change(screen.getByLabelText(/special shipping notes/i), {
      target: { value: "Pack with extra padding on all sides." },
    });
    await goToReview();

    const onSection = sectionFor(/shipping & supplier/i);
    expect(within(onSection).getByText("Yes")).toBeInTheDocument();
    expect(within(onSection).getByText("Acknowledged")).toBeInTheDocument();
    expect(
      within(onSection).getByText("Pack with extra padding on all sides."),
    ).toBeInTheDocument();
  });

  it("(6) Edit on Basic Information navigates to Step 1", async () => {
    await advanceToReviewWithFullData();

    clickEditIn(/basic product information/i);

    expect(screen.getByLabelText(/^title$/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Basic Information/i)).toHaveAttribute("aria-current", "step");
  });

  it("(7) Edit on Pricing & stock, and on Product variations, both navigate to Step 2", async () => {
    await advanceToReviewWithFullData();

    clickEditIn(/^pricing & stock$/i);
    expect(
      screen.getByRole("heading", { name: /pricing, stock & variations/i }),
    ).toBeInTheDocument();

    await goToStep3();
    await goToReview();

    clickEditIn(/product variations/i);
    expect(
      screen.getByRole("heading", { name: /pricing, stock & variations/i }),
    ).toBeInTheDocument();
  });

  it("(8) Edit on Shipping & supplier navigates to Step 3", async () => {
    await advanceToReviewWithFullData();

    clickEditIn(/shipping & supplier/i);

    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
  });

  it("(9) editing a value and returning to Review shows the updated value", async () => {
    await advanceToReviewWithFullData();

    clickEditIn(/basic product information/i);
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Wireless Ergonomic Keyboard" },
    });
    await goToStep2();
    await goToStep3();
    await goToReview();

    const section = sectionFor(/basic product information/i);
    expect(within(section).getByText("Wireless Ergonomic Keyboard")).toBeInTheDocument();
    expect(within(section).queryByText("Ergonomic Keyboard")).not.toBeInTheDocument();
  });

  it("(10) Back from Review preserves Step 3 values", async () => {
    await advanceToReviewWithFullData();

    goBack();

    expect(screen.getByLabelText(/weight/i)).toHaveValue(2.4);
    expect(screen.getByLabelText(/^width$/i)).toHaveValue(45);
    expect(screen.getByLabelText(/^height$/i)).toHaveValue(15);
    expect(screen.getByLabelText(/^depth$/i)).toHaveValue(20);
  });

  it("(11) all wizard values remain preserved across a full Review round trip", async () => {
    await advanceToReviewWithFullData();

    // Visit Step 3 via Edit, change nothing, come back - everything else
    // (Steps 1 and 2) must still be exactly as filled in.
    clickEditIn(/shipping & supplier/i);
    await goToReview();

    expect(within(sectionFor(/basic product information/i)).getByText("Ergonomic Keyboard")).toBeInTheDocument();
    expect(within(sectionFor(/^pricing & stock$/i)).getByText("$49.99")).toBeInTheDocument();
    expect(within(sectionFor(/product variations/i)).getByText("SKU-ABC-1234")).toBeInTheDocument();
    expect(within(sectionFor(/shipping & supplier/i)).getByText("2.4 kg")).toBeInTheDocument();
  });
});
