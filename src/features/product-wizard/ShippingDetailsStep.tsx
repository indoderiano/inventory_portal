"use client";

import { useFormContext, useFormState } from "react-hook-form";

import { SHIPPING_FIELD_NAMES, type ProductWizardFormValues } from "./schema";

export function ShippingDetailsStep() {
  const { control, register } = useFormContext<ProductWizardFormValues>();

  // A single scoped subscription for the whole step, same pattern as
  // BasicInfoStep: re-renders only when one of *these* fields' errors
  // change, not on unrelated Step 1/2 validation activity.
  const { errors } = useFormState<ProductWizardFormValues>({
    control,
    name: SHIPPING_FIELD_NAMES,
  });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Shipping &amp; supplier details</h2>

      <label className="flex flex-col gap-1 text-sm">
        Weight (kg)
        <input
          type="number"
          step="0.01"
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register("weight")}
        />
        {errors.weight && (
          <span role="alert" className="text-xs text-red-600">
            {errors.weight.message}
          </span>
        )}
      </label>

      <fieldset className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Dimensions</legend>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Width
            <input
              type="number"
              step="0.01"
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              {...register("dimensions.width")}
            />
            {errors.dimensions?.width && (
              <span role="alert" className="text-xs text-red-600">
                {errors.dimensions.width.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Height
            <input
              type="number"
              step="0.01"
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              {...register("dimensions.height")}
            />
            {errors.dimensions?.height && (
              <span role="alert" className="text-xs text-red-600">
                {errors.dimensions.height.message}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Depth
            <input
              type="number"
              step="0.01"
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              {...register("dimensions.depth")}
            />
            {errors.dimensions?.depth && (
              <span role="alert" className="text-xs text-red-600">
                {errors.dimensions.depth.message}
              </span>
            )}
          </label>
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("requiresSpecialFragileHandling")} />
        Requires special fragile handling
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register("hazardousMaterialDisclaimer")} />
        Hazardous material disclaimer
      </label>
      {errors.hazardousMaterialDisclaimer && (
        <span role="alert" className="-mt-2 text-xs text-red-600">
          {errors.hazardousMaterialDisclaimer.message}
        </span>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Special shipping notes
        <textarea
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          rows={3}
          {...register("specialShippingNotes")}
        />
        {errors.specialShippingNotes && (
          <span role="alert" className="text-xs text-red-600">
            {errors.specialShippingNotes.message}
          </span>
        )}
      </label>
    </section>
  );
}
