import type { CreateProductRequest } from "@/types/product";

import { toFormNumber, toOptionalFormNumber } from "./numericFormValue";
import type { ProductWizardFormValues } from "./schema";

/**
 * Maps the wizard's form values onto DummyJSON's `CreateProductRequest`
 * shape at the submission boundary - the one place raw form values (some
 * still strings, per `toFormNumber`'s doc comment) become the normalized,
 * correctly-typed payload the API expects.
 *
 * Deliberately omits several wizard concepts that DummyJSON's product
 * model has no field for, rather than inventing content for them:
 *
 *  - `requiresSpecialFragileHandling` / `hazardousMaterialDisclaimer`:
 *    no corresponding boolean fields exist on `Product`.
 *  - Per-variation `color` / `size` / `extraPrice`: DummyJSON has no
 *    concept of variants; only a single top-level `sku` string. The
 *    first variation's SKU is used as the product's SKU (a reasonable
 *    "primary variant" mapping), and the rest of each variation's detail
 *    has nowhere to go in this API.
 *
 * `specialShippingNotes` *does* have a natural home - DummyJSON's
 * `shippingInformation` free-text field - so it's carried across
 * whenever fragile handling produced actual notes to send.
 */
export function buildCreateProductPayload(
  values: ProductWizardFormValues,
): CreateProductRequest {
  const [firstVariation] = values.variations;

  const payload: CreateProductRequest = {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    brand: values.brand.trim(),
    price: toFormNumber(values.basePrice),
    stock: toFormNumber(values.stockQuantity),
    weight: toFormNumber(values.weight),
    dimensions: {
      width: toFormNumber(values.dimensions.width),
      height: toFormNumber(values.dimensions.height),
      depth: toFormNumber(values.dimensions.depth),
    },
  };

  const discountPercentage = toOptionalFormNumber(values.discountPercentage);
  if (discountPercentage !== undefined) {
    payload.discountPercentage = discountPercentage;
  }

  if (firstVariation) {
    payload.sku = firstVariation.sku;
  }

  if (values.requiresSpecialFragileHandling && values.specialShippingNotes.trim().length > 0) {
    payload.shippingInformation = values.specialShippingNotes.trim();
  }

  return payload;
}
