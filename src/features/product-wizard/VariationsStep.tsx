"use client";

import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useFormState, useWatch } from "react-hook-form";

import {
  createEmptyVariation,
  findDuplicateSkuMessage,
  STEP_TWO_FIELD_NAMES,
  type ProductWizardFormValues,
} from "./schema";
import { VariationRow } from "./VariationRow";

export function VariationsStep() {
  const { control, register, trigger } = useFormContext<ProductWizardFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "variations" });

  // `useFieldArray`'s `remove` doesn't itself trigger validation, so
  // without this the "at least one variation" rule would only ever
  // surface at submit time. Wrapped in `useCallback` (over the field
  // array's own stable `remove`/`trigger`) so the function identity
  // passed to every row stays stable, keeping `React.memo` effective.
  const handleRemove = useCallback(
    (index: number) => {
      remove(index);
      void trigger("variations");
    },
    [remove, trigger],
  );

  // Scoped to Step 2's own fields (the three product-level pricing/stock
  // fields plus the array path itself): re-renders only when one of
  // *these* changes, not on unrelated Step 1/3 validation activity, and
  // not per-row either - individual row errors are handled inside each
  // row's own `useFormState`. Errors attached to the array itself (rather
  // than a specific item) are exposed by React Hook Form under a
  // dedicated `root` key for field arrays, not directly on
  // `errors.variations` - see the write-up after this file for why.
  const { errors } = useFormState<ProductWizardFormValues>({
    control,
    name: STEP_TWO_FIELD_NAMES,
  });
  const minLengthError =
    typeof errors.variations?.root?.message === "string"
      ? errors.variations.root.message
      : undefined;

  // The duplicate-SKU check is computed here, live, from a `useWatch`
  // rather than from `formState.errors` (even though the same rule also
  // lives in the Yup schema as the source of truth for submit-time
  // validity). Deliberately: surfacing it via `formState.errors` would
  // require re-validating the *whole* array on every row's blur, which
  // touched every row's scoped `useFormState` subscription regardless of
  // whether that row's own errors changed - the cross-row rule's cost
  // leaked into rows that had nothing to do with it. `useWatch` here
  // re-renders only `VariationsStep` itself; `VariationRow` stays
  // memoized against stable props, so that broad subscription is
  // contained to this component, the same way `DraftSync` contains its
  // own whole-form watch.
  const variations = useWatch({ control, name: "variations" });
  const duplicateSkuError = useMemo(
    () => findDuplicateSkuMessage(variations ?? []),
    [variations],
  );

  const arrayError = minLengthError ?? duplicateSkuError;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Pricing, stock &amp; variations</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          Base price
          <input
            type="number"
            step="0.01"
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            {...register("basePrice")}
          />
          {errors.basePrice && (
            <span role="alert" className="text-xs text-red-600">
              {errors.basePrice.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Stock quantity
          <input
            type="number"
            step="1"
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            {...register("stockQuantity")}
          />
          {errors.stockQuantity && (
            <span role="alert" className="text-xs text-red-600">
              {errors.stockQuantity.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Discount percentage
          <input
            type="number"
            step="0.01"
            className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            {...register("discountPercentage")}
          />
          {errors.discountPercentage && (
            <span role="alert" className="text-xs text-red-600">
              {errors.discountPercentage.message}
            </span>
          )}
        </label>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Variations</h3>
        <button
          type="button"
          onClick={() => append(createEmptyVariation())}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Add variation
        </button>
      </div>

      {arrayError && (
        <p role="alert" className="text-sm text-red-600">
          {arrayError}
        </p>
      )}

      <ul aria-label="Variations" className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <VariationRow key={field.id} id={field.id} index={index} onRemove={handleRemove} />
        ))}
      </ul>
    </section>
  );
}
