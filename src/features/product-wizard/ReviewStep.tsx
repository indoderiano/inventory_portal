"use client";

import type { ReactNode } from "react";
import { useFormContext, useFormState } from "react-hook-form";

import { useGetProductCategoriesQuery } from "@/services/dummyJsonApi";

import { toFormNumber, toOptionalFormNumber } from "./numericFormValue";
import type { WizardStep } from "./ProductWizardForm";
import type { ProductWizardFormValues } from "./schema";

interface ReviewStepProps {
  onEditStep: (step: WizardStep) => void;
  /** Set by `ProductWizardForm` right after a successful mutation, just
   * before it navigates away - shown for whatever brief window exists
   * between that and the route actually changing. */
  justSucceeded: boolean;
}

interface ReviewSectionProps {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}

function ReviewSection({ title, onEdit, children }: ReviewSectionProps) {
  return (
    <section className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium dark:border-zinc-700"
        >
          Edit
        </button>
      </div>
      {children}
    </section>
  );
}

function ReviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:gap-2">
      <dt className="text-zinc-500 sm:w-44 sm:shrink-0 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium break-words text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `$${toFormNumber(value).toFixed(2)}`;
}

/**
 * Reads the wizard's current values with a single `getValues()` call - no
 * `useWatch`, no local state copy of anything. Because this component
 * only ever renders while `currentStep === 4`, and reaching that step
 * requires having just navigated here (a fresh mount, since Review isn't
 * kept alive off-screen), that one read always reflects whatever was most
 * recently edited: leaving Step 1/2/3 via "Next" re-triggers this
 * component's render with the latest committed values.
 */
export function ReviewStep({ onEditStep, justSucceeded }: ReviewStepProps) {
  const { control, getValues } = useFormContext<ProductWizardFormValues>();
  const values = getValues();

  // Reuses the same category query the filter bar and BasicInfoStep
  // already use, purely to show a human-readable name instead of the raw
  // DummyJSON slug stored on the form - falls back to the slug itself if
  // categories haven't loaded (or somehow don't include it) yet.
  const { data: categories } = useGetProductCategoriesQuery();
  const categoryLabel =
    categories?.find((category) => category.slug === values.category)?.name ?? values.category;

  // `root` is RHF's reserved key for form-wide errors that don't belong
  // to any one field - exactly what an API submission failure is. Set by
  // `ProductWizardForm`'s `onValidSubmit` via `setError("root", ...)`,
  // never by a second, parallel validation system. `isSubmitting` is
  // RHF's own tracking of the in-flight `handleSubmit` promise - no
  // separate "is the mutation loading" state needed for the button.
  const { errors, isSubmitting } = useFormState<ProductWizardFormValues>({ control });
  const submitError = errors.root?.message;

  const discountPercentage = toOptionalFormNumber(values.discountPercentage);
  const discountLabel = discountPercentage !== undefined ? `${discountPercentage}%` : "No discount";

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Review</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Check every section below, then create the product.
        </p>
      </div>

      <ReviewSection title="Basic product information" onEdit={() => onEditStep(1)}>
        <dl className="flex flex-col gap-2">
          <ReviewField label="Product title" value={values.title} />
          <ReviewField label="Brand" value={values.brand} />
          <ReviewField label="Category" value={categoryLabel} />
          <ReviewField label="Description" value={values.description} />
        </dl>
      </ReviewSection>

      <ReviewSection title="Pricing & stock" onEdit={() => onEditStep(2)}>
        <dl className="flex flex-col gap-2">
          <ReviewField label="Base price" value={formatCurrency(values.basePrice)} />
          <ReviewField label="Stock quantity" value={toFormNumber(values.stockQuantity)} />
          <ReviewField label="Discount percentage" value={discountLabel} />
        </dl>
      </ReviewSection>

      <ReviewSection title="Product variations" onEdit={() => onEditStep(2)}>
        {values.variations.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No variations added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    Color
                  </th>
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    Size
                  </th>
                  <th scope="col" className="py-1.5 pr-4 font-medium">
                    SKU code
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Extra price
                  </th>
                </tr>
              </thead>
              <tbody>
                {values.variations.map((variation, index) => (
                  <tr
                    key={`${variation.sku}-${index}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                  >
                    <td className="py-1.5 pr-4">{variation.color}</td>
                    <td className="py-1.5 pr-4">{variation.size}</td>
                    <td className="py-1.5 pr-4 font-mono">{variation.sku}</td>
                    <td className="py-1.5">{formatCurrency(variation.extraPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReviewSection>

      <ReviewSection title="Shipping & supplier details" onEdit={() => onEditStep(3)}>
        <dl className="flex flex-col gap-2">
          <ReviewField label="Weight" value={`${toFormNumber(values.weight)} kg`} />
          <ReviewField label="Width" value={toFormNumber(values.dimensions.width)} />
          <ReviewField label="Height" value={toFormNumber(values.dimensions.height)} />
          <ReviewField label="Depth" value={toFormNumber(values.dimensions.depth)} />
          <ReviewField
            label="Requires special fragile handling"
            value={values.requiresSpecialFragileHandling ? "Yes" : "No"}
          />
          <ReviewField
            label="Hazardous material disclaimer"
            value={values.hazardousMaterialDisclaimer ? "Acknowledged" : "Not applicable"}
          />
          <ReviewField
            label="Special shipping notes"
            value={values.specialShippingNotes ? values.specialShippingNotes : "None provided"}
          />
        </dl>
      </ReviewSection>

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      {justSucceeded && (
        <p role="status" className="text-sm text-green-600">
          Product created successfully. Redirecting…
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isSubmitting ? "Creating…" : "Create product"}
      </button>
    </section>
  );
}
