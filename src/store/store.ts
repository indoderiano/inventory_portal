import { configureStore } from "@reduxjs/toolkit";

import {
  loadPersistedDraft,
  persistProductWizardDraft,
  productWizardDraftReducer,
} from "@/features/product-wizard/productWizardDraftSlice";
import { productFiltersReducer } from "@/features/products/productFiltersSlice";
import { dummyJsonApi } from "@/services/dummyJsonApi";

export function makeStore() {
  const store = configureStore({
    reducer: {
      [dummyJsonApi.reducerPath]: dummyJsonApi.reducer,
      productFilters: productFiltersReducer,
      productWizardDraft: productWizardDraftReducer,
    },
    // Loaded here, per store instance, rather than baked into the slice's
    // `initialState` - see the comment on `loadPersistedDraft`.
    preloadedState: {
      productWizardDraft: loadPersistedDraft(),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(dummyJsonApi.middleware),
  });

  persistProductWizardDraft(store);

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
