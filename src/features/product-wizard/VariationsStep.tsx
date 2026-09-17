"use client";

import { useCallback, useMemo } from "react";
import { useFieldArray, useFormContext, useFormState, useWatch } from "react-hook-form";

import {
  createEmptyVariation,
  findDuplicateSkuMessage,
  type ProductWizardFormValues,
} from "./schema";
import { VariationRow } from "./VariationRow";

export function VariationsStep() {
  const { control, trigger } = useFormContext<ProductWizardFormValues>();
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

  // Scoped to the array path itself: only re-renders when the min-length
  // error changes, not when an individual row's field error changes -
  // those are handled inside each row's own `useFormState`. Errors
  // attached to the array itself (rather than a specific item) are
  // exposed by React Hook Form under a dedicated `root` key for field
  // arrays, not directly on `errors.variations` - see the write-up after
  // this file for why.
  const { errors } = useFormState<ProductWizardFormValues>({
    control,
    name: "variations",
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Variations</h2>
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
