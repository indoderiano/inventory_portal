import { describe, expect, it } from "vitest";

import {
  basicInfoSchema,
  pricingAndStockSchema,
  productWizardSchema,
  shippingSchema,
  variationSchema,
  variationsSchema,
} from "./schema";

function makeVariation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    color: "Red",
    size: "M",
    sku: "SKU-ABC-1234",
    extraPrice: 5,
    ...overrides,
  };
}

function makeBasicInfo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Wireless Mouse",
    brand: "Acme",
    category: "beauty",
    description: "A reliable wireless mouse with an ergonomic design and long battery life.",
    ...overrides,
  };
}

function makePricingAndStock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    basePrice: 29.99,
    stockQuantity: 50,
    discountPercentage: 10,
    ...overrides,
  };
}

describe("variationSchema", () => {
  it("accepts a fully valid variation", async () => {
    await expect(variationSchema.validate(makeVariation())).resolves.toBeTruthy();
  });

  it.each(["SKU-ABC-1234", "SKU-XYZ-0000", "SKU-ZZZ-9999"])(
    "accepts the valid SKU format %s",
    async (sku) => {
      await expect(variationSchema.validate(makeVariation({ sku }))).resolves.toBeTruthy();
    },
  );

  it.each([
    "SKU-abc-1234", // lowercase letters
    "SKU-AB-1234", // only 2 letters
    "SKU-ABCD-1234", // 4 letters
    "SKU-ABC-123", // only 3 digits
    "SKU-ABC-12345", // 5 digits
    "SKU_ABC_1234", // wrong separators
    "ABC-1234", // missing prefix
    "",
  ])("rejects the invalid SKU format %s", async (sku) => {
    await expect(variationSchema.validate(makeVariation({ sku }))).rejects.toThrow();
  });

  it("requires color", async () => {
    await expect(variationSchema.validate(makeVariation({ color: "" }))).rejects.toThrow(
      "Color is required",
    );
  });

  it("requires size", async () => {
    await expect(variationSchema.validate(makeVariation({ size: "" }))).rejects.toThrow(
      "Size is required",
    );
  });

  it("rejects a negative extra price", async () => {
    await expect(variationSchema.validate(makeVariation({ extraPrice: -1 }))).rejects.toThrow(
      "Extra price cannot be negative",
    );
  });

  it("accepts a zero extra price", async () => {
    await expect(
      variationSchema.validate(makeVariation({ extraPrice: 0 })),
    ).resolves.toBeTruthy();
  });

  it("rejects a non-numeric extra price", async () => {
    await expect(
      variationSchema.validate(makeVariation({ extraPrice: Number.NaN })),
    ).rejects.toThrow("Extra price must be a number");
  });
});

describe("variationsSchema", () => {
  it("requires at least one variation", async () => {
    await expect(variationsSchema.validate([])).rejects.toThrow("Add at least one variation");
  });

  it("accepts multiple variations with distinct SKUs", async () => {
    await expect(
      variationsSchema.validate([
        makeVariation({ sku: "SKU-ABC-1234" }),
        makeVariation({ sku: "SKU-ABC-5678" }),
      ]),
    ).resolves.toBeTruthy();
  });

  it("rejects duplicate SKUs across variations", async () => {
    await expect(
      variationsSchema.validate([
        makeVariation({ sku: "SKU-ABC-1234" }),
        makeVariation({ sku: "SKU-ABC-1234" }),
      ]),
    ).rejects.toThrow(/Duplicate SKU: SKU-ABC-1234/);
  });

  it("identifies every affected row in the duplicate-SKU message", async () => {
    await expect(
      variationsSchema.validate([
        makeVariation({ sku: "SKU-ABC-1234" }),
        makeVariation({ sku: "SKU-DEF-0000" }),
        makeVariation({ sku: "SKU-ABC-1234" }),
      ]),
    ).rejects.toThrow(/rows 1, 3/);
  });
});

describe("basicInfoSchema", () => {
  it("accepts fully valid basic info", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo())).resolves.toBeTruthy();
  });

  it("requires a title", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo({ title: "" }))).rejects.toThrow(
      "Title is required",
    );
  });

  it("requires a brand", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo({ brand: "" }))).rejects.toThrow(
      "Brand is required",
    );
  });

  it("requires a category", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo({ category: "" }))).rejects.toThrow(
      "Category is required",
    );
  });

  it("requires a description", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo({ description: "" }))).rejects.toThrow(
      "Description is required",
    );
  });

  it("rejects a title shorter than 3 characters", async () => {
    await expect(basicInfoSchema.validate(makeBasicInfo({ title: "ab" }))).rejects.toThrow(
      "Title must be at least 3 characters",
    );
  });

  it("accepts a title exactly 3 characters long", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ title: "abc" })),
    ).resolves.toBeTruthy();
  });

  it("rejects a title longer than 100 characters", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ title: "a".repeat(101) })),
    ).rejects.toThrow("Title must be at most 100 characters");
  });

  it("accepts a title exactly 100 characters long", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ title: "a".repeat(100) })),
    ).resolves.toBeTruthy();
  });

  it("rejects a description shorter than 20 characters", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ description: "too short" })),
    ).rejects.toThrow("Description must be at least 20 characters");
  });

  it("accepts a description exactly 20 characters long", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ description: "a".repeat(20) })),
    ).resolves.toBeTruthy();
  });

  it("trims whitespace before checking length, so padding can't fake the minimum", async () => {
    await expect(
      basicInfoSchema.validate(makeBasicInfo({ title: " ab " })),
    ).rejects.toThrow("Title must be at least 3 characters");
  });
});

describe("pricingAndStockSchema", () => {
  it("accepts fully valid pricing and stock data", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock()),
    ).resolves.toBeTruthy();
  });

  it("requires a base price", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ basePrice: undefined })),
    ).rejects.toThrow("Base price is required");
  });

  it("rejects a base price of 0 or less", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ basePrice: 0 })),
    ).rejects.toThrow("Base price must be greater than 0");
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ basePrice: -1 })),
    ).rejects.toThrow("Base price must be greater than 0");
  });

  it("requires a stock quantity", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ stockQuantity: undefined })),
    ).rejects.toThrow("Stock quantity is required");
  });

  it("requires stock quantity to be an integer", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ stockQuantity: 12.5 })),
    ).rejects.toThrow("Stock quantity must be a whole number");
  });

  it("rejects a negative stock quantity, but accepts zero", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ stockQuantity: -1 })),
    ).rejects.toThrow("Stock quantity cannot be negative");
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ stockQuantity: 0 })),
    ).resolves.toBeTruthy();
  });

  it("treats discount percentage as optional", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ discountPercentage: undefined })),
    ).resolves.toBeTruthy();
  });

  it("accepts a discount percentage of 0", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ discountPercentage: 0 })),
    ).resolves.toBeTruthy();
  });

  it("accepts a discount percentage of 99", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ discountPercentage: 99 })),
    ).resolves.toBeTruthy();
  });

  it("rejects a discount percentage below 0", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ discountPercentage: -1 })),
    ).rejects.toThrow("Discount percentage cannot be less than 0");
  });

  it("rejects a discount percentage above 99", async () => {
    await expect(
      pricingAndStockSchema.validate(makePricingAndStock({ discountPercentage: 100 })),
    ).rejects.toThrow("Discount percentage cannot be more than 99");
  });
});

function makeShippingInfo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    weight: 1.5,
    dimensions: { width: 10, height: 5, depth: 2 },
    requiresSpecialFragileHandling: false,
    hazardousMaterialDisclaimer: false,
    specialShippingNotes: "",
    ...overrides,
  };
}

describe("shippingSchema", () => {
  it("accepts fully valid, non-fragile shipping info", async () => {
    await expect(shippingSchema.validate(makeShippingInfo())).resolves.toBeTruthy();
  });

  it("requires a weight", async () => {
    await expect(
      shippingSchema.validate(makeShippingInfo({ weight: undefined })),
    ).rejects.toThrow("Weight is required");
  });

  it("rejects a weight of 0 or less", async () => {
    await expect(
      shippingSchema.validate(makeShippingInfo({ weight: 0 })),
    ).rejects.toThrow("Weight must be greater than 0");
    await expect(
      shippingSchema.validate(makeShippingInfo({ weight: -5 })),
    ).rejects.toThrow("Weight must be greater than 0");
  });

  it("requires width, and rejects a non-positive width", async () => {
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: undefined, height: 5, depth: 2 } }),
      ),
    ).rejects.toThrow("Width is required");
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: 0, height: 5, depth: 2 } }),
      ),
    ).rejects.toThrow("Width must be greater than 0");
  });

  it("requires height, and rejects a non-positive height", async () => {
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: 10, height: undefined, depth: 2 } }),
      ),
    ).rejects.toThrow("Height is required");
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: 10, height: 0, depth: 2 } }),
      ),
    ).rejects.toThrow("Height must be greater than 0");
  });

  it("requires depth, and rejects a non-positive depth", async () => {
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: 10, height: 5, depth: undefined } }),
      ),
    ).rejects.toThrow("Depth is required");
    await expect(
      shippingSchema.validate(
        makeShippingInfo({ dimensions: { width: 10, height: 5, depth: 0 } }),
      ),
    ).rejects.toThrow("Depth must be greater than 0");
  });

  describe("conditional validation via .when('requiresSpecialFragileHandling')", () => {
    it("does not require the hazardous material disclaimer when fragile handling is false", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: false,
            hazardousMaterialDisclaimer: false,
          }),
        ),
      ).resolves.toBeTruthy();
    });

    it("does not require special shipping notes when fragile handling is false", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: false,
            specialShippingNotes: "",
          }),
        ),
      ).resolves.toBeTruthy();
    });

    it("requires the hazardous material disclaimer to be checked when fragile handling is true", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: true,
            hazardousMaterialDisclaimer: false,
            specialShippingNotes: "Handle with extreme care during transit.",
          }),
        ),
      ).rejects.toThrow("You must acknowledge the hazardous material disclaimer");
    });

    it("requires special shipping notes when fragile handling is true", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: true,
            hazardousMaterialDisclaimer: true,
            specialShippingNotes: "",
          }),
        ),
      ).rejects.toThrow("Special shipping notes are required");
    });

    it("requires special shipping notes to be at least 10 characters when fragile handling is true", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: true,
            hazardousMaterialDisclaimer: true,
            specialShippingNotes: "too short",
          }),
        ),
      ).rejects.toThrow("Special shipping notes must be at least 10 characters");
    });

    it("accepts valid fragile=true data with the disclaimer checked and adequate notes", async () => {
      await expect(
        shippingSchema.validate(
          makeShippingInfo({
            requiresSpecialFragileHandling: true,
            hazardousMaterialDisclaimer: true,
            specialShippingNotes: "Handle with extreme care during transit.",
          }),
        ),
      ).resolves.toBeTruthy();
    });
  });
});

describe("productWizardSchema", () => {
  it("validates the full wizard shape", async () => {
    await expect(
      productWizardSchema.validate({
        ...makeBasicInfo(),
        ...makePricingAndStock(),
        variations: [makeVariation()],
        ...makeShippingInfo(),
      }),
    ).resolves.toBeTruthy();
  });

  it("rejects the full wizard shape when Step 1 fields are missing", async () => {
    await expect(
      productWizardSchema.validate({
        ...makePricingAndStock(),
        variations: [makeVariation()],
        ...makeShippingInfo(),
      }),
    ).rejects.toThrow();
  });

  it("rejects the full wizard shape when Step 2 pricing/stock fields are missing", async () => {
    await expect(
      productWizardSchema.validate({
        ...makeBasicInfo(),
        variations: [makeVariation()],
        ...makeShippingInfo(),
      }),
    ).rejects.toThrow();
  });

  it("rejects the full wizard shape when Step 3 fields are missing", async () => {
    await expect(
      productWizardSchema.validate({
        ...makeBasicInfo(),
        ...makePricingAndStock(),
        variations: [makeVariation()],
      }),
    ).rejects.toThrow();
  });
});
