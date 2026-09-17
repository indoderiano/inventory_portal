"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { useCreateProductMutation } from "@/services/dummyJsonApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { BasicInfoStep } from "./BasicInfoStep";
import { DraftSync } from "./DraftSync";
import { buildCreateProductPayload } from "./productPayload";
import { productWizardDraftActions, selectProductWizardDraft } from "./productWizardDraftSlice";
import { ReviewStep } from "./ReviewStep";
import {
  BASIC_INFO_FIELD_NAMES,
  productWizardSchema,
  SHIPPING_FIELD_NAMES,
  STEP_TWO_FIELD_NAMES,
  type ProductWizardFormValues,
} from "./schema";
import { ShippingDetailsStep } from "./ShippingDetailsStep";
import { VariationsStep } from "./VariationsStep";
import { WizardStepIndicator } from "./WizardStepIndicator";

// Widen this union (and the render/navigation branches below) as further
// steps get implemented. Exported so `ReviewStep`'s "Edit" buttons can
// target a step without a second, parallel definition of what steps exist.
export type WizardStep = 1 | 2 | 3 | 4;

const SUBMIT_ERROR_MESSAGE = "We couldn't create this product. Please try again.";

/**
 * Owns the wizard's single React Hook Form instance and all cross-step
 * concerns (which step is showing, the progress indicator, forward/back
 * navigation, and final submission). Individual steps (`BasicInfoStep`,
 * `VariationsStep`, `ShippingDetailsStep`, `ReviewStep`) only ever
 * read/write this one form via `useFormContext` - there is no per-step
 * `useForm()` and no separate navigation state system beyond the plain
 * `currentStep` value below, which is UI-only and never gates what data
 * the form holds.
 *
 * Submission flow: the `<form>`'s native `onSubmit` is wired to
 * `methods.handleSubmit(onValidSubmit)` - RHF runs the *entire* Yup
 * schema first, regardless of which step is currently showing, and only
 * calls `onValidSubmit` if it passes. `ReviewStep`'s "Create product"
 * button is a plain `type="submit"`, so clicking it (or, for that
 * matter, submitting the form by any other native means) goes through
 * that same resolver - there is no separate path that could bypass it.
 *
 * Conceptually:
 *   ProductWizardForm
 *   ├── Step 1 (BasicInfoStep)
 *   ├── Step 2 (VariationsStep - pricing, stock & variations)
 *   ├── Step 3 (ShippingDetailsStep)
 *   └── Step 4 Review (ReviewStep - summary, edit links, and submission)
 */
export function ProductWizardForm() {
  // Read once, at mount, to seed the form from whatever was persisted
  // (or an empty draft). The form is the source of truth from here on;
  // `DraftSync` is what keeps Redux/localStorage caught up to it, not the
  // other way around.
  const draft = useAppSelector(selectProductWizardDraft);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [createProduct] = useCreateProductMutation();

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
  const [justSucceeded, setJustSucceeded] = useState(false);

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
      const isValid = await methods.trigger(STEP_TWO_FIELD_NAMES);
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

  // Only ever called by RHF's `handleSubmit` below, which means the full
  // Yup schema has *already* passed by the time this runs - `values` here
  // is genuinely valid data, not merely "whatever the user typed".
  const onValidSubmit = async (values: ProductWizardFormValues) => {
    methods.clearErrors("root");
    try {
      // `createProduct` already invalidates the "Product" LIST tag (and
      // "Category"), so the /products list will refetch on its own once
      // we navigate there - no manual cache poking, no reload.
      await createProduct(buildCreateProductPayload(values)).unwrap();
      dispatch(productWizardDraftActions.draftCleared());
      setJustSucceeded(true);
      router.push("/products");
    } catch {
      // DummyJSON's mock failure responses aren't meant to be shown
      // verbatim to a user; a fixed, honest message plus "try again" is
      // more useful than surfacing whatever the mock happened to return.
      // The draft is untouched - nothing above this point mutated it.
      methods.setError("root", { type: "submit", message: SUBMIT_ERROR_MESSAGE });
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValidSubmit)}>
        <DraftSync />

        <WizardStepIndicator currentStep={currentStep} />

        <div className="mt-6">
          {currentStep === 1 && <BasicInfoStep />}
          {currentStep === 2 && <VariationsStep />}
          {currentStep === 3 && <ShippingDetailsStep />}
          {currentStep === 4 && (
            <ReviewStep onEditStep={setCurrentStep} justSucceeded={justSucceeded} />
          )}
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
