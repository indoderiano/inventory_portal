"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAppDispatch } from "@/store/hooks";

import { productWizardDraftActions, type ProductWizardDraft } from "./productWizardDraftSlice";
import type { ProductWizardFormValues } from "./schema";

const DRAFT_SYNC_DEBOUNCE_MS = 500;

/**
 * Bridges React Hook Form's live values into Redux (which in turn persists
 * to localStorage - see `persistProductWizardDraft`). This is the one
 * place in the wizard that deliberately watches the *whole* form, and it's
 * kept in its own component, rendering nothing, specifically so that
 * necessary re-subscription doesn't touch the variation rows: `DraftSync`
 * is a sibling of `VariationsStep`, not a parent of it, so re-rendering
 * here never cascades into row components.
 */
export function DraftSync() {
  const { control } = useFormContext<ProductWizardFormValues>();
  const dispatch = useAppDispatch();
  const values = useWatch<ProductWizardFormValues>({ control });

  const commitDraft = useDebouncedCallback((next: ProductWizardDraft) => {
    dispatch(productWizardDraftActions.draftUpdated(next));
  }, DRAFT_SYNC_DEBOUNCE_MS);

  useEffect(() => {
    commitDraft(values);
  }, [values, commitDraft]);

  return null;
}
