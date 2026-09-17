"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useAppSelector } from "@/store/hooks";

import { BasicInfoStep } from "./BasicInfoStep";
import { DraftSync } from "./DraftSync";
import { selectProductWizardDraft } from "./productWizardDraftSlice";
import { ReviewStep } from "./ReviewStep";
import {
  BASIC_INFO_FIELD_NAMES,
  productWizardSchema,
  SHIPPING_FIELD_NAMES,
  type ProductWizardFormValues,
} from "./schema";
import { ShippingDetailsStep } from "./ShippingDetailsStep";
import { VariationsStep } from "./VariationsStep";
import { WizardStepIndicator } from "./WizardStepIndicator";

// Widen this union (and the render/navigation branches below) as further
// steps get implemented. All four exist here now, but Step 4 (ReviewStep)
// is a placeholder - there is deliberately no "Next"/submit action past it.
type WizardStep = 1 | 2 | 3 | 4;

/**
 * Owns the wizard's single React Hook Form instance and all cross-step
 * concerns (which step is showing, the progress indicator, forward/back
 * navigation). Individual steps (`BasicInfoStep`, `VariationsStep`,
 * `ShippingDetailsStep`) only ever read/write this one form via
 * `useFormContext` - there is no per-step `useForm()` and no separate
 * navigation state system beyond the plain `currentStep` value below,
 * which is UI-only and never gates what data the form holds.
 *
 * Conceptually:
 *   ProductWizardForm
 *   ├── Step 1 (BasicInfoStep)
 *   ├── Step 2 (VariationsStep)
 *   ├── Step 3 (ShippingDetailsStep)
 *   └── Step 4 Review (ReviewStep - placeholder, no submission yet)
 */
export function ProductWizardForm() {
  // Read once, at mount, to seed the form from whatever was persisted
  // (or an empty draft). The form is the source of truth from here on;
  // `DraftSync` is what keeps Redux/localStorage caught up to it, not the
  // other way around.
  const draft = useAppSelector(selectProductWizardDraft);

  const methods = useForm<ProductWizardFormValues>({
    // `abortEarly: false` (Yup defaults to `true`) so every row's errors
    // are collected in one pass. With the default, Yup stops at the first
    // failure anywhere in the tree - an empty required field on one,
    // untouched row would silently suppress every other row's errors,
    // including the array-level duplicate-SKU check.
    resolver: yupResolver(productWizardSchema, { abortEarly: false }),
    defaultValues: draft,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  const handleNext = async () => {
    // Each step's "Next" validates only *that* step's own fields via
    // `trigger()`, scoped by the same field-name lists the step's own
    // `useFormState` uses to display errors - later/untouched steps can
    // never block leaving an earlier one.
    if (currentStep === 1) {
      const isValid = await methods.trigger(BASIC_INFO_FIELD_NAMES);
      if (isValid) {
        setCurrentStep(2);
      }
      return;
    }

    if (currentStep === 2) {
      const isValid = await methods.trigger("variations");
      if (isValid) {
        setCurrentStep(3);
      }
      return;
    }

    if (currentStep === 3) {
      const isValid = await methods.trigger(SHIPPING_FIELD_NAMES);
      if (isValid) {
        setCurrentStep(4);
      }
    }
  };

  const handleBack = () => {
    // No validation gate going backward - the user should always be able
    // to revisit a previous step regardless of the current one's state.
    setCurrentStep((step) => (step > 1 ? ((step - 1) as WizardStep) : step));
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <DraftSync />

        <WizardStepIndicator currentStep={currentStep} />

        <div className="mt-6">
          {currentStep === 1 && <BasicInfoStep />}
          {currentStep === 2 && <VariationsStep />}
          {currentStep === 3 && <ShippingDetailsStep />}
          {currentStep === 4 && <ReviewStep />}
        </div>

        <div className="mt-6 flex justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="rounded border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          {currentStep < 4 && (
            <button
              type="button"
              onClick={() => {
                void handleNext();
              }}
              className="rounded bg-zinc-900 px-4 py-1.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Next
            </button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
