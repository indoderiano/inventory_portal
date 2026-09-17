import { describe, expect, it } from "vitest";

import { buildCreateProductPayload } from "./productPayload";
import type { ProductWizardFormValues } from "./schema";

function makeFormValues(
  overrides: Partial<ProductWizardFormValues> = {},
): ProductWizardFormValues {
  return {
    title: "Wireless Mouse",
    brand: "Acme",
    category: "beauty",
    description: "A reliable wireless mouse with an ergonomic design and long battery life.",
    basePrice: 29.99,
    stockQuantity: 50,
    discountPercentage: undefined,
    variations: [{ color: "Red", size: "M", sku: "SKU-ABC-1234", extraPrice: 5 }],
    weight: 1.5,
    dimensions: { width: 10, height: 5, depth: 2 },
    requiresSpecialFragileHandling: false,
    hazardousMaterialDisclaimer: false,
    specialShippingNotes: "",
    ...overrides,
  };
}

describe("buildCreateProductPayload", () => {
  it("maps Step 1 fields directly", () => {
    const payload = buildCreateProductPayload(makeFormValues());
    expect(payload.title).toBe("Wireless Mouse");
    expect(payload.brand).toBe("Acme");
    expect(payload.category).toBe("beauty");
    expect(payload.description).toBe(
      "A reliable wireless mouse with an ergonomic design and long battery life.",
    );
  });

  it("normalizes basePrice/stockQuantity to real numbers", () => {
    // Simulates what actually happens at runtime: these fields are
    // registered without `valueAsNumber`, so raw form state holds strings.
    const payload = buildCreateProductPayload(
      makeFormValues({
        basePrice: "29.99" as unknown as number,
        stockQuantity: "50" as unknown as number,
      }),
    );
    expect(payload.price).toBe(29.99);
    expect(typeof payload.price).toBe("number");
    expect(payload.stock).toBe(50);
    expect(typeof payload.stock).toBe("number");
  });

  it("normalizes weight and dimensions to real numbers", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({
        weight: "1.5" as unknown as number,
        dimensions: {
          width: "10" as unknown as number,
          height: "5" as unknown as number,
          depth: "2" as unknown as number,
        },
      }),
    );
    expect(payload.weight).toBe(1.5);
    expect(payload.dimensions).toEqual({ width: 10, height: 5, depth: 2 });
  });

  it("omits discountPercentage when not provided", () => {
    const payload = buildCreateProductPayload(makeFormValues({ discountPercentage: undefined }));
    expect(payload.discountPercentage).toBeUndefined();
    expect("discountPercentage" in payload).toBe(false);
  });

  it("includes a normalized discountPercentage when provided", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({ discountPercentage: "15" as unknown as number }),
    );
    expect(payload.discountPercentage).toBe(15);
  });

  it("includes a discountPercentage of 0", () => {
    const payload = buildCreateProductPayload(makeFormValues({ discountPercentage: 0 }));
    expect(payload.discountPercentage).toBe(0);
  });

  it("uses the first variation's SKU as the product's SKU", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({
        variations: [
          { color: "Red", size: "M", sku: "SKU-AAA-0001", extraPrice: 0 },
          { color: "Blue", size: "L", sku: "SKU-BBB-0002", extraPrice: 3 },
        ],
      }),
    );
    expect(payload.sku).toBe("SKU-AAA-0001");
  });

  it("does not send per-variation color/size/extraPrice - DummyJSON has no field for them", () => {
    const payload = buildCreateProductPayload(makeFormValues());
    expect(payload).not.toHaveProperty("variations");
    expect(payload).not.toHaveProperty("color");
    expect(payload).not.toHaveProperty("size");
  });

  it("does not send the fragile-handling booleans - DummyJSON has no field for them", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({ requiresSpecialFragileHandling: true, hazardousMaterialDisclaimer: true }),
    );
    expect(payload).not.toHaveProperty("requiresSpecialFragileHandling");
    expect(payload).not.toHaveProperty("hazardousMaterialDisclaimer");
  });

  it("maps special shipping notes to shippingInformation when fragile handling produced notes", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({
        requiresSpecialFragileHandling: true,
        hazardousMaterialDisclaimer: true,
        specialShippingNotes: "Handle with extreme care during transit.",
      }),
    );
    expect(payload.shippingInformation).toBe("Handle with extreme care during transit.");
  });

  it("omits shippingInformation when fragile handling is off", () => {
    const payload = buildCreateProductPayload(
      makeFormValues({ requiresSpecialFragileHandling: false, specialShippingNotes: "" }),
    );
    expect(payload).not.toHaveProperty("shippingInformation");
  });
});
