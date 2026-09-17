import type { Path } from "react-hook-form";
import * as yup from "yup";

export const SKU_PATTERN = /^SKU-[A-Z]{3}-[0-9]{4}$/;

export const basicInfoSchema = yup.object({
  title: yup
    .string()
    .trim()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be at most 100 characters"),
  brand: yup.string().trim().required("Brand is required"),
  // The category *value* is a DummyJSON category slug, fetched at
  // render time from the API (see BasicInfoStep) - never hardcoded here.
  category: yup.string().trim().required("Category is required"),
  description: yup
    .string()
    .trim()
    .required("Description is required")
    .min(20, "Description must be at least 20 characters"),
});

export type ProductBasicInfo = yup.InferType<typeof basicInfoSchema>;

/**
 * Field names belonging to Step 1, typed against `basicInfoSchema` itself
 * so it can't silently drift out of sync with the schema. Used to scope
 * `trigger()` to "is Step 1 valid" without validating Step 2/3 fields.
 */
export const BASIC_INFO_FIELD_NAMES = [
  "title",
  "brand",
  "category",
  "description",
] as const satisfies ReadonlyArray<keyof ProductBasicInfo>;

export const variationSchema = yup.object({
  color: yup.string().trim().required("Color is required"),
  size: yup.string().trim().required("Size is required"),
  sku: yup
    .string()
    .trim()
    .required("SKU is required")
    .matches(SKU_PATTERN, "SKU must match SKU-XXX-0000 (3 letters, 4 digits)"),
  extraPrice: yup
    .number()
    .typeError("Extra price must be a number")
    .required("Extra price is required")
    .min(0, "Extra price cannot be negative"),
});

export type ProductVariation = yup.InferType<typeof variationSchema>;

interface SkuBearing {
  sku?: string | null;
}

/**
 * Finds duplicate SKUs across a set of variations and, if any exist,
 * returns a message describing them (which rows, which SKU); otherwise
 * `undefined`. Shared by the Yup array-level test below (the source of
 * truth for whether the form is valid) and by `VariationsStep`'s live
 * `useWatch`-derived UI feedback, so the two can never disagree.
 */
export function findDuplicateSkuMessage(variations: readonly SkuBearing[]): string | undefined {
  if (variations.length < 2) {
    return undefined;
  }

  const rowsBySku = new Map<string, number[]>();
  variations.forEach((variation, index) => {
    const sku = variation.sku;
    if (!sku) {
      return;
    }
    const rows = rowsBySku.get(sku) ?? [];
    rows.push(index + 1);
    rowsBySku.set(sku, rows);
  });

  const duplicates = [...rowsBySku.entries()].filter(([, rows]) => rows.length > 1);
  if (duplicates.length === 0) {
    return undefined;
  }

  const details = duplicates
    .map(([sku, rows]) => `${sku} (rows ${rows.join(", ")})`)
    .join("; ");

  return `Duplicate SKU: ${details}`;
}

export const variationsSchema = yup
  .array()
  .of(variationSchema)
  .min(1, "Add at least one variation")
  .test("unique-skus", "SKUs must be unique across variations", (variations, context) => {
    const message = findDuplicateSkuMessage(variations ?? []);
    return message ? context.createError({ message }) : true;
  })
  .required();

/**
 * Maps an empty raw string to `undefined` *before* Yup's own numeric cast
 * runs, so a genuinely blank field fails `.required()` ("X is required")
 * rather than `.typeError()` ("X must be a number") - those are different
 * situations and deserve different messages. This only works because the
 * corresponding `register()` call does *not* pass `{ valueAsNumber: true }`:
 * that option reads the DOM's `input.valueAsNumber`, which is already
 * `NaN` for an empty field by the time Yup ever sees it, making
 * `.required()` unreachable.
 */
function blankToUndefined(castValue: number, rawValue: unknown): number | undefined {
  return typeof rawValue === "string" && rawValue.trim() === "" ? undefined : castValue;
}

const positiveDimension = (label: string) =>
  yup
    .number()
    .transform(blankToUndefined)
    .typeError(`${label} must be a number`)
    .required(`${label} is required`)
    .moreThan(0, `${label} must be greater than 0`);

export const shippingSchema = yup.object({
  weight: positiveDimension("Weight"),
  dimensions: yup.object({
    width: positiveDimension("Width"),
    height: positiveDimension("Height"),
    depth: positiveDimension("Depth"),
  }),
  requiresSpecialFragileHandling: yup.boolean().default(false),
  // Yup is the *only* place these two conditional rules are expressed -
  // the UI never re-implements "is fragile handling on" as a validation
  // check of its own; it just renders whatever `formState.errors` says.
  hazardousMaterialDisclaimer: yup
    .boolean()
    .default(false)
    .when("requiresSpecialFragileHandling", {
      is: true,
      then: (schema) =>
        schema.oneOf([true], "You must acknowledge the hazardous material disclaimer"),
      otherwise: (schema) => schema.notRequired(),
    }),
  specialShippingNotes: yup
    .string()
    .default("")
    .when("requiresSpecialFragileHandling", {
      is: true,
      then: (schema) =>
        schema
          .trim()
          .required("Special shipping notes are required")
          .min(10, "Special shipping notes must be at least 10 characters"),
      otherwise: (schema) => schema.notRequired(),
    }),
});

export type ProductShippingInfo = yup.InferType<typeof shippingSchema>;

/**
 * Step 2 is "Pricing, Stock & Variations" - the dynamic variations array
 * plus three product-level fields that apply once, not per-variation.
 */
export const pricingAndStockSchema = yup.object({
  basePrice: yup
    .number()
    .transform(blankToUndefined)
    .typeError("Base price must be a number")
    .required("Base price is required")
    .moreThan(0, "Base price must be greater than 0"),
  stockQuantity: yup
    .number()
    .transform(blankToUndefined)
    .typeError("Stock quantity must be a number")
    .required("Stock quantity is required")
    .integer("Stock quantity must be a whole number")
    .min(0, "Stock quantity cannot be negative"),
  // Optional: `.notRequired()` (the default for a field with no
  // `.required()` call) means an empty field simply passes - `blankToUndefined`
  // still applies so a *filled-in* value is validated as a real number.
  discountPercentage: yup
    .number()
    .transform(blankToUndefined)
    .typeError("Discount percentage must be a number")
    .min(0, "Discount percentage cannot be less than 0")
    .max(99, "Discount percentage cannot be more than 99")
    .notRequired(),
});

export type ProductPricingAndStock = yup.InferType<typeof pricingAndStockSchema>;

export const productWizardSchema = basicInfoSchema
  .concat(pricingAndStockSchema)
  .concat(
    yup.object({
      variations: variationsSchema,
    }),
  )
  .concat(shippingSchema);

export type ProductWizardFormValues = yup.InferType<typeof productWizardSchema>;

/**
 * Field names belonging to Step 2 ("Pricing, Stock & Variations"): the
 * three product-level fields plus the variations array itself (which
 * covers both the array-level rules - min-length, duplicate-SKU - and,
 * because Yup always validates the whole array when validating its own
 * path, every item's own fields too).
 */
export const STEP_TWO_FIELD_NAMES = [
  "basePrice",
  "stockQuantity",
  "discountPercentage",
  "variations",
] as const satisfies ReadonlyArray<Path<ProductWizardFormValues>>;

/**
 * Field names belonging to Step 3, typed against `ProductWizardFormValues`
 * (rather than `ProductShippingInfo`, unlike `BASIC_INFO_FIELD_NAMES`)
 * because `Path<T>` is what actually produces `"dimensions.width"`-style
 * dot-paths for a nested object - `keyof ProductShippingInfo` would only
 * ever give the top-level `"dimensions"` key.
 */
export const SHIPPING_FIELD_NAMES = [
  "weight",
  "dimensions.width",
  "dimensions.height",
  "dimensions.depth",
  "requiresSpecialFragileHandling",
  "hazardousMaterialDisclaimer",
  "specialShippingNotes",
] as const satisfies ReadonlyArray<Path<ProductWizardFormValues>>;

export function createEmptyVariation(): ProductVariation {
  return { color: "", size: "", sku: "", extraPrice: 0 };
}
