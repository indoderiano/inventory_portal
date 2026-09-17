"use client";

import { memo } from "react";
import { useFormContext, useFormState } from "react-hook-form";

import { useRenderCount } from "@/hooks/useRenderCount";

import type { ProductWizardFormValues } from "./schema";

interface VariationRowProps {
  id: string;
  index: number;
  onRemove: (index: number) => void;
}

function VariationRowComponent({ id, index, onRemove }: VariationRowProps) {
  const { control, register } = useFormContext<ProductWizardFormValues>();
  const renderCount = useRenderCount();

  // Scoped subscription: this row only re-renders when *its own* fields'
  // validation state changes, not when any other row's does. Passing the
  // full leaf paths (rather than just `variations.${index}`) is what
  // narrows the subscription - see the explanation after this component.
  const { errors } = useFormState<ProductWizardFormValues>({
    control,
    name: [
      `variations.${index}.color`,
      `variations.${index}.size`,
      `variations.${index}.sku`,
      `variations.${index}.extraPrice`,
    ],
  });

  const rowErrors = errors.variations?.[index];

  return (
    <li
      data-row-id={id}
      data-render-count={renderCount}
      className="grid grid-cols-2 gap-3 rounded border border-zinc-200 p-4 sm:grid-cols-5 sm:items-start dark:border-zinc-800"
    >
      <label className="flex flex-col gap-1 text-sm">
        Color
        <input
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register(`variations.${index}.color`)}
        />
        {rowErrors?.color && (
          <span role="alert" className="text-xs text-red-600">
            {rowErrors.color.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Size
        <input
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register(`variations.${index}.size`)}
        />
        {rowErrors?.size && (
          <span role="alert" className="text-xs text-red-600">
            {rowErrors.size.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        SKU
        <input
          className="rounded border border-zinc-300 px-2 py-1 font-mono dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="SKU-ABC-1234"
          {...register(`variations.${index}.sku`)}
        />
        {rowErrors?.sku && (
          <span role="alert" className="text-xs text-red-600">
            {rowErrors.sku.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Extra price
        <input
          type="number"
          step="0.01"
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register(`variations.${index}.extraPrice`, { valueAsNumber: true })}
        />
        {rowErrors?.extraPrice && (
          <span role="alert" className="text-xs text-red-600">
            {rowErrors.extraPrice.message}
          </span>
        )}
      </label>

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="self-start rounded border border-zinc-300 px-3 py-1 text-sm sm:mt-6 dark:border-zinc-700"
      >
        Remove
      </button>
    </li>
  );
}

export const VariationRow = memo(VariationRowComponent);
