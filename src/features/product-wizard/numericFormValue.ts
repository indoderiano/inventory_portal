/**
 * Coerces a Yup-typed `number` field to an actual number.
 *
 * Fields registered *without* `{ valueAsNumber: true }` - weight,
 * dimensions, basePrice, stockQuantity, discountPercentage (see the
 * comment on `blankToUndefined` in schema.ts) - hold the raw string typed
 * into the DOM input in React Hook Form's own internal state. Yup casts
 * that string to a real number only *during validation*; neither
 * `getValues()` nor the value `handleSubmit` hands to its callback
 * reflects that cast. TypeScript's `number` type on these fields
 * describes the *validated output*, not a guarantee about what's
 * actually sitting in memory before this function runs.
 *
 * A type assertion (`value as number`) would not perform this
 * conversion - it only tells the compiler to stop checking, while the
 * actual runtime value stays an unconverted string. `Number(value)` is
 * what performs the real, observable string -> number conversion.
 *
 * Genuinely invalid input (e.g. a non-numeric string) converts to `NaN`
 * rather than throwing - the same "safe, recognizable-as-invalid" result
 * `Number()` itself produces. Reaching this function with such input
 * shouldn't happen for a *required* field once Yup has already validated
 * it (that's the whole point of the schema), but the function itself
 * doesn't assume that - it just converts, predictably, and lets the
 * caller decide what an unexpected NaN means for them.
 */
export function toFormNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

/**
 * Same idea as `toFormNumber`, for a field that's genuinely optional
 * (`discountPercentage`): a blank, `null`, or `undefined` value stays
 * absent (`undefined`) rather than becoming `0` or `NaN`. A non-empty but
 * non-numeric value still converts to `NaN` via `toFormNumber`, rather
 * than being silently swallowed into `undefined` - that distinction (an
 * absent optional field vs. genuinely bad data) is worth preserving.
 */
export function toOptionalFormNumber(
  value: number | string | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return toFormNumber(value);
}
