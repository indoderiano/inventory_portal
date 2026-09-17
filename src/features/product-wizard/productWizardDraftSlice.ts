import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { DeepPartialSkipArrayKey } from "react-hook-form";

import type { RootState } from "@/store/store";

import type { ProductVariation, ProductWizardFormValues } from "./schema";

const DRAFT_STORAGE_KEY = "inventory-portal:product-wizard-draft";

// A draft is, by definition, allowed to be incomplete - it's whatever the
// user had typed when they last left the wizard, not a validated
// submission. `DeepPartialSkipArrayKey` is the exact type RHF's own
// `useWatch({control})` (no `name`) returns, so this type lines up with
// what `DraftSync` actually hands us instead of fighting it with a cast.
export type ProductWizardDraft = DeepPartialSkipArrayKey<ProductWizardFormValues>;

const EMPTY_DRAFT: ProductWizardDraft = { variations: [] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Coerces one persisted variation entry to a well-typed `ProductVariation`,
 * defaulting any missing/malformed field to its "empty" value (`""` / `0`)
 * rather than rejecting the whole draft. A draft is expected to be
 * incomplete - it must never be discarded just because the user hadn't
 * finished filling in a row when they navigated away.
 */
function toSafeVariation(value: unknown): ProductVariation {
  const record = isPlainObject(value) ? value : {};
  return {
    color: typeof record.color === "string" ? record.color : "",
    size: typeof record.size === "string" ? record.size : "",
    sku: typeof record.sku === "string" ? record.sku : "",
    extraPrice: typeof record.extraPrice === "number" ? record.extraPrice : 0,
  };
}

/** Coerces one persisted scalar field, defaulting to `undefined` (a valid,
 * "not filled in yet" value for a partial draft) if missing or the wrong
 * type - same reasoning as `toSafeVariation`, applied to the plain
 * scalar fields Step 1 and Step 3 added to the same shared form. */
function toSafeString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toSafeNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toSafeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function toSafeDimensions(
  value: unknown,
): { width?: number; height?: number; depth?: number } | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }
  return {
    width: toSafeNumber(value.width),
    height: toSafeNumber(value.height),
    depth: toSafeNumber(value.depth),
  };
}

/**
 * Reads and validates the persisted draft. The localStorage payload is a
 * system boundary (user/browser-editable, can be corrupted or stale across
 * app versions) and must never be trusted blindly - malformed data falls
 * back to an empty draft instead of throwing.
 *
 * Called explicitly from `makeStore()` (via `preloadedState`) rather than
 * wired up as the slice's `initialState` - `createSlice` only runs once,
 * at module-evaluation time, so an `initialState: loadPersistedDraft()`
 * would freeze whatever localStorage contained the *first* time this
 * module was imported and never re-read it for any store created after.
 */
export function loadPersistedDraft(): ProductWizardDraft {
  if (typeof window === "undefined") {
    return EMPTY_DRAFT;
  }

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return EMPTY_DRAFT;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
      return EMPTY_DRAFT;
    }

    return {
      title: toSafeString(parsed.title),
      brand: toSafeString(parsed.brand),
      category: toSafeString(parsed.category),
      description: toSafeString(parsed.description),
      basePrice: toSafeNumber(parsed.basePrice),
      stockQuantity: toSafeNumber(parsed.stockQuantity),
      discountPercentage: toSafeNumber(parsed.discountPercentage),
      variations: Array.isArray(parsed.variations)
        ? parsed.variations.map(toSafeVariation)
        : [],
      weight: toSafeNumber(parsed.weight),
      dimensions: toSafeDimensions(parsed.dimensions),
      requiresSpecialFragileHandling: toSafeBoolean(parsed.requiresSpecialFragileHandling),
      hazardousMaterialDisclaimer: toSafeBoolean(parsed.hazardousMaterialDisclaimer),
      specialShippingNotes: toSafeString(parsed.specialShippingNotes),
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

const productWizardDraftSlice = createSlice({
  name: "productWizardDraft",
  initialState: EMPTY_DRAFT,
  reducers: {
    draftUpdated(_state, action: PayloadAction<ProductWizardDraft>) {
      return action.payload;
    },
    /** Dispatched after a successful product creation. Resets to the same
     * `EMPTY_DRAFT` reference `initialState` uses, so a fresh page load
     * afterward has nothing to restore - and `persistProductWizardDraft`'s
     * reference-equality check picks up the change and overwrites
     * localStorage with it, same as any other draft update. */
    draftCleared() {
      return EMPTY_DRAFT;
    },
  },
});

export const productWizardDraftActions = productWizardDraftSlice.actions;
export const productWizardDraftReducer = productWizardDraftSlice.reducer;

export function selectProductWizardDraft(state: RootState): ProductWizardDraft {
  return state.productWizardDraft;
}

interface SubscribableStore {
  getState: () => RootState;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Wires the `productWizardDraft` slice to localStorage: `watch -> Redux`
 * happens in `DraftSync`; this is the `Redux -> localStorage` half. Kept
 * separate from that slice-change-triggered write so it only fires when
 * the draft itself actually changed (reference check), not on every
 * unrelated action passing through the store.
 */
export function persistProductWizardDraft(store: SubscribableStore): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  let lastDraft = selectProductWizardDraft(store.getState());

  return store.subscribe(() => {
    const nextDraft = selectProductWizardDraft(store.getState());
    if (nextDraft !== lastDraft) {
      lastDraft = nextDraft;
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
    }
  });
}
