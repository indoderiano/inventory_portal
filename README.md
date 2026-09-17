# Product & Inventory Management Portal

## Overview

A product inventory management portal built with **Next.js 16 (App Router)**, **React 19**, and **strict TypeScript**, backed by the public [DummyJSON](https://dummyjson.com) API. Client/UI state (filters, wizard drafts, view preferences) is managed with **Redux Toolkit**; all server/cache state is owned by **RTK Query**. Styling is **Tailwind CSS v4** only — no UI component library.

The application has two main surfaces:

- A **product listing** at `/products` with search, category filtering, sorting, pagination, card/table views, a responsive mobile filter drawer, and optimistic inline edit/delete.
- A **product creation wizard** at `/products/new`, a 4-stage form (Basic Information → Pricing/Stock/Variations → Shipping → Review) built on a single React Hook Form instance with Yup validation.

Because DummyJSON is a mock API — it does not persist `POST`/`PUT`/`DELETE` requests server-side — the app includes deliberate client-side reconciliation so created, updated, and deleted products still behave correctly in the UI. This is documented in detail below.

## Features

### Product Listing

- **Pagination** via `skip`/`limit`, derived from the current page and a fixed page size.
- **Debounced search** (300ms) — the input updates instantly for the user, but the committed search value (and the resulting API request) only fires after 300ms of typing inactivity.
- **Dynamic categories** fetched from `GET /products/categories`, with loading, error, and retry states.
- **Sorting** by title, price, rating, or stock, ascending/descending where exposed.
- **Card and table views**, toggled locally (not persisted, not in Redux, not in the URL).
- **Responsive mobile filter drawer** below the `md` breakpoint; the same filter controls remain inline on larger screens.
- **Loading, error, and empty states** for both the product list and the category dropdown.

### Filter State Architecture

Filter state flows through three layers with a single direction of responsibility:

```
URL  ⇄  Redux (productFilters slice)  →  RTK Query (getProducts args)
```

- **URL is the durable, shareable representation.** Search, category, sort, and page are serialized into query params (`useProductFiltersUrlSync`), so a link to a filtered view can be copied, bookmarked, or shared, and reloading the page restores the same filters from the URL rather than losing them.
- **Redux is the live UI state** every component reads from and dispatches to (`productFiltersSlice`). It is kept in sync with the URL in both directions: URL changes (deep link, browser back/forward, manual edit) hydrate Redux, and Redux changes push a new URL — guarded against feedback loops with a ref that marks "this Redux change came from the URL, don't push it back."
- **RTK Query owns server/cache state only.** A memoized selector (`selectProductsQueryArgs`) derives the exact arguments `getProducts` is called with, purely as a function of Redux state. RTK Query's cache key is therefore always a *derivation* of Redux, never an independent third source of truth — there is no duplicated filter state anywhere in the app.

**Search/category precedence:** DummyJSON cannot combine full-text search with a category-scoped listing in a single request. When both are set, `q` wins — `/products/search` is used and `category` is dropped from that request entirely. This is a deliberate, existing behavior; the category dropdown now surfaces a small note ("Category is ignored while searching") so it isn't silently confusing.

**Race conditions:** because the debounced search only commits after 300ms, and each distinct set of query args gets its own RTK Query cache entry, a slow response for an old search term can never overwrite what's currently displayed for a newer one — they simply land in different cache entries.

### Optimistic Updates

`updateProduct` and `deleteProduct` are optimistic:

- On submit, every currently-cached `getProducts` entry that actually contains the target product (found via its own per-item RTK Query tag) is patched immediately, before the network request resolves.
- DummyJSON's mock backend simulates roughly a **20% failure rate** on `PUT`/`DELETE` requests (via MSW), to exercise the failure path.
- On failure, every entry that was optimistically patched is rolled back to its exact prior state, and an error toast appears with a **Retry** button that repeats the identical request.
- Rollback restores each entry **by product id, against whatever state exists at the moment of failure** — not by blindly replaying a generic inverse patch. This matters because two different products' optimistic patches can land on the same cached list; a naive inverse-patch replay is only safe if patches to the same array are undone in strict reverse order, which concurrent mutations on different products can't guarantee.
- The `createdProducts` ledger (below) is reconciled the same way: an update/delete to a product that was created earlier this session also updates/removes its ledger entry.

**This is explicitly not production backend persistence.** DummyJSON is a mock API; nothing here is actually saved on a server. The optimistic cache state *is* the durable representation for the lifetime of the browser tab — that's a deliberate design response to the mock API's limitations, not a claim that data is safely stored anywhere.

### Created Products / DummyJSON Limitation

This is one of the more important architectural decisions in the app, so it's worth explaining directly:

- `POST /products/add` returns what looks like a fully created product, complete with a new id — but DummyJSON does **not** actually persist it. A subsequent `GET /products` returns the same static dataset it always would have, as if the product were never created.
- To make a just-created product behave correctly in the UI anyway, the app keeps a small RTK Query endpoint called `createdProducts` — a network-free query (`queryFn: () => ({ data: [] })`) that acts as a **ledger** of products this client has successfully created. It is populated by `createProduct`'s own mutation response, never fabricated.
- **This ledger is not a replacement product database.** It doesn't duplicate or shadow the real product list; it only remembers what the mock backend won't confirm on its own.
- `mergeCreatedIntoListing` is a pure function that merges remembered created products into the *current* listing at render time — it decides, for each remembered product, whether it belongs in the view currently being shown (matching the same search/category/sort/page logic the real request already applies), positions it correctly if a sort is active, and adjusts the displayed total. It never mutates RTK Query's cache.
- If no `getProducts` cache entry exists yet for a given view (e.g. the user navigated straight to `/products/new` and never visited `/products`), the app does **not** fabricate a fake cache entry to force the product to appear — that would mean inventing pagination metadata (`total`, `limit`) DummyJSON never actually reported. The ledger still remembers the product; it shows up the next time a real fetch happens to include a matching view.

### Product Creation Wizard

A single `useForm()` instance (React Hook Form + Yup resolver) is shared across all four stages via `FormProvider`/`useFormContext` — there is no per-step form instance, and Yup is the sole source of validation truth throughout.

1. **Basic Information** — title (3–100 chars), brand, category (from the DummyJSON categories list), description (20+ chars), all required.
2. **Pricing, Stock & Variations** — base price and stock quantity (required, numeric), an optional discount percentage (0–99), and a dynamic list of variations managed with `useFieldArray`. Each variation requires a color, size, extra price, and a SKU matching `SKU-XXX-0000` (3 letters, 4 digits). A cross-field Yup test rejects duplicate SKUs across the array; the same check also drives live inline feedback as the user types, so the two can never disagree.
3. **Shipping** — weight and width/height/depth (all required, greater than 0). A "requires special fragile handling" checkbox conditionally requires a hazardous-material acknowledgment and a 10+ character shipping note via Yup's `.when()`.
4. **Review** — an interactive summary of every field with per-section **Edit** buttons that jump back to the relevant step. Submitting runs the *entire* Yup schema regardless of which step is currently visible, so a duplicate SKU or an incomplete earlier step still blocks submission even if the user only ever interacted with Review's Create button.

On successful submission the draft is cleared and the app navigates to `/products`; on failure the draft and all form values are preserved, an error is shown, and the user can retry without losing any input.

### Draft Persistence

The wizard's form values are mirrored into a Redux slice (debounced 500ms) and from there into `localStorage`, so a user who navigates away mid-wizard and comes back later resumes exactly where they left off. A single shared `useForm()` instance (rather than per-step state) is what makes this possible without reconciling multiple independent sources of truth — one watch, one persisted shape, one restore path on mount.

### Responsive UI

- **Card/table toggle**: local `useState` in `ProductsView`, intentionally not persisted and not stored in Redux or the URL — it's a display preference, not query-affecting state.
- Both the card and table presentations share a single mutation implementation (`useProductActions`) — there is exactly one place the update/delete mutation hooks, retry logic, and edit/confirm-delete state actually live.
- **Mobile filter drawer**: below the `md` breakpoint, a "Filters" trigger opens a dialog containing the same filter controls used on desktop (not a separate/duplicated filter state). Implements dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`), moves focus into the panel on open, closes on Escape or backdrop click as well as an explicit Close button, and returns focus to the trigger afterward.
- **No full manual keyboard focus trap** in the drawer — this is an intentional, documented tradeoff, not a missing feature. Initial focus, Escape-to-close, and focus return are all implemented; cycling Tab/Shift+Tab back into the panel at its edges is not.
- The table scrolls horizontally on narrow screens (`overflow-x-auto`) rather than reflowing into a separate mobile-specific layout — the card view already serves that purpose.

## Technical Decisions / Rationale

### Why URL + Redux + RTK Query?

Each layer has exactly one responsibility: the URL makes state shareable and durable across reloads, Redux is the single live source every UI component reads from, and RTK Query's cache is a pure derivation of Redux, never edited directly. Collapsing any two of these would either break shareable URLs, break the ability to reason about "what does the UI currently show" from one place, or introduce a second, competing definition of the current filters.

### Search Race Conditions

The 300ms debounce means the API is never called on every keystroke, and because RTK Query caches by a serialized key derived from the request args, two different search terms are two different cache entries — a slow response for an old term resolving late simply updates a cache entry nothing is currently reading, rather than overwriting the active view.

### useFieldArray

Variations are a genuinely dynamic, user-controlled list (add/remove rows), which is exactly what `useFieldArray` is for — it keeps each row's identity stable across add/remove operations without the parent form needing to manually track array indices. The cross-row duplicate-SKU check is computed via a scoped `useWatch` at the `VariationsStep` level rather than through each row's own validation, specifically so that checking the whole array doesn't force every row's individual field-error subscription to re-evaluate.

### Optimistic Rollback

RTK Query's default optimistic-update pattern (`updateQueryData` + `patchResult.undo()`) works well for a single mutation in isolation, but its rollback replays a generic Immer inverse patch — which is only correct if every patch touching the same cached array is undone in the exact reverse order it was applied. Two *different* products being edited/deleted concurrently violates that assumption: one mutation's rollback can be applied after the other's patch has already changed the same array, corrupting the result. Instead, each entry's pre-patch product state is captured up front (from already-resolved cache data, not from inside the Immer draft) and, on failure, restored **by product id against whatever the current state actually is** — which is robust regardless of what else has changed to the array in the meantime.

### Why createdProducts?

DummyJSON's `POST /products/add` doesn't persist anything, so *something* has to remember that a product was created. Four alternatives were deliberately rejected:

- **A second Redux product list** — would duplicate server data across two competing stores and require manually keeping them in sync.
- **localStorage persistence of "server" products** — conflates client-only UI state with data that's supposed to represent server state, and doesn't fit RTK Query's cache model at all.
- **Fabricating a fake `getProducts` cache entry** — would mean inventing `total`/`limit` values that were never actually returned by any request, which is indistinguishable from lying about server data.
- **Pretending DummyJSON persists POST data** — would mean skipping this problem entirely and shipping something that appears to work only until a page reload or a cache eviction reveals it doesn't.

`createdProducts` stays inside RTK Query (the single server-state layer), is populated only from real mutation responses, and is merged into listings at render time rather than by mutating the cache — so it never becomes a second source of truth for server data.

## API

DummyJSON endpoints used by this app:

| Endpoint | Purpose |
|---|---|
| `GET /products` | Default/paginated product listing |
| `GET /products/search` | Full-text search |
| `GET /products/category/:slug` | Category-filtered listing |
| `GET /products/categories` | Category list for the filter dropdown and wizard |
| `POST /products/add` | Create a product |
| `PUT /products/:id` | Update a product |
| `DELETE /products/:id` | Delete a product |

**This is a mock API.** `POST`, `PUT`, and `DELETE` requests return realistic-looking responses but do not persist any change server-side — every reconciliation strategy described above exists specifically to compensate for that.

## Project Structure

```
src/
├── app/                       # Next.js App Router routes
│   ├── page.tsx
│   ├── providers.tsx          # Redux <Provider> + RTK Query listeners
│   └── products/
│       ├── page.tsx           # /products
│       └── new/page.tsx       # /products/new
├── features/
│   ├── products/              # Listing, filters, card/table views, mutations
│   │   ├── ProductsView.tsx / ProductsList.tsx
│   │   ├── ProductCard.tsx / ProductTableRow.tsx / ProductsTable.tsx
│   │   ├── ProductFiltersBar.tsx / ProductSearchInput.tsx
│   │   ├── ProductCategorySelect.tsx / ProductSortSelect.tsx
│   │   ├── ResponsiveProductFilters.tsx / ProductsViewToggle.tsx / ProductsPagination.tsx
│   │   ├── Toast.tsx / useProductActions.ts
│   │   ├── mergeCreatedIntoListing.ts
│   │   ├── productFiltersSlice.ts / productFiltersUrl.ts / useProductFiltersUrlSync.ts
│   │   └── *.test.ts(x)
│   └── product-wizard/        # 4-stage product creation wizard
│       ├── ProductWizardForm.tsx
│       ├── BasicInfoStep.tsx / VariationsStep.tsx / ShippingDetailsStep.tsx / ReviewStep.tsx
│       ├── schema.ts          # Yup validation - single source of truth
│       ├── numericFormValue.ts / productPayload.ts
│       ├── productWizardDraftSlice.ts / DraftSync.tsx
│       └── *.test.ts(x)
├── services/
│   └── dummyJsonApi.ts        # RTK Query API slice (queries, mutations, createdProducts ledger)
├── store/                     # Redux store + typed hooks
├── test/
│   ├── mocks/                 # MSW handlers + fixtures
│   └── utils/                 # Shared test helpers (mock router, etc.)
└── types/
    └── product.ts             # DummyJSON product types
```

## Getting Started

### Prerequisites

- Node.js (no version is pinned in `package.json`; a current LTS release is recommended)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run start
```

### Typecheck

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

### Tests

```bash
npm run test
```

### Coverage

```bash
npm run test:coverage
```

## Testing Strategy

The project uses **Vitest** with **React Testing Library** and **jsdom**, and **MSW** (Mock Service Worker) to intercept and mock every DummyJSON HTTP call at the network layer — no fetch/axios mocking, no ad hoc stubbing.

- **Yup validation tests** — every field rule and conditional (`.when()`) rule in the wizard schema, including the SKU regex and duplicate-SKU cross-field check.
- **Redux tests** — the filter slice's reducers and derived selectors, and URL serialization/parsing round-trips.
- **Wizard integration tests** — full render-tree tests that exercise the real `handleSubmit`/Yup resolver path, including a duplicate-SKU submission that must be rejected by the actual form, not just the schema in isolation, plus full success and failure/retry flows against MSW.
- **Optimistic mutation tests** — optimistic apply before a delayed response resolves, success, failure-with-exact-rollback across every matching cache entry, `createdProducts` ledger reconciliation, and concurrent-mutation safety for two different products sharing a cache entry.
- **Responsive UI tests** — card/table toggle behavior, table structure and row actions, and the mobile drawer's open/close/focus/dialog-semantics behavior (structural behavior only — CSS-driven breakpoint visibility isn't meaningfully testable in jsdom, and the test files say so explicitly rather than faking it).
- **Category loading/error/retry tests** — loading indicator, error state with a working Retry, and the search-precedence note.

As of the latest verified run: **265 tests across 26 test files, all passing**, with **97.07% statement coverage / 87.4% branch coverage / 96.17% function coverage / 97.13% line coverage** (`npm run test:coverage`, v8 provider).

## Accessibility

Implemented and verified in the current codebase:

- Semantic `<table>`/`<thead>`/`<th scope="col">` markup for the table view and the wizard's variation summary.
- Every form control has an associated label (nested `<label>` or `sr-only` label text in compact table cells) — no unlabeled inputs.
- `aria-pressed` on the card/table toggle buttons.
- `role="dialog"` / `aria-modal="true"` / `aria-labelledby` on the mobile filter drawer.
- Escape-to-close, initial focus on open, and focus return to the trigger on close for the drawer.
- `role="alert"` for validation and mutation errors; `role="status"` (screen-reader-only) live regions for loading/fetching state.
- All interactive elements are native `<button>`/`<select>`/`<input>`/`<a>`, so standard keyboard operation works without custom key handling beyond the drawer's Escape listener.

The drawer intentionally does not implement a full manual Tab-cycle focus trap — a considered tradeoff given the complexity of implementing one correctly without a dedicated library, not an oversight.

## Performance

- Search is debounced 300ms client-side before it ever reaches Redux or triggers a request.
- Filter-derived RTK Query arguments are computed through a memoized (`createSelector`) selector, and narrow per-field Redux selectors avoid re-rendering components that only care about one filter value.
- Form-state subscriptions in the wizard are scoped per step (`useFormState({ name: [...] })`) so validation activity in one step doesn't re-render unrelated steps.
- The cross-row duplicate-SKU check uses a single scoped `useWatch` at the step level rather than per-row, to avoid fanning a whole-array watch out into every row's own subscription.
- `"use client"` boundaries are applied at the components that actually need interactivity/hooks, not blanket-applied higher in the tree.
- RTK Query's own cache-key-based deduplication is the only request-level caching in the app — no second, hand-rolled cache.

No speculative optimizations were added beyond what the above required.

## Screenshots

Screenshots will be added in a follow-up pass. Planned:

- `screenshots/products-card.png` — product listing, card view
- `screenshots/products-table.png` — product listing, table view
- `screenshots/mobile-filters.png` — mobile filter drawer
- `screenshots/product-wizard.png` — product creation wizard
- `screenshots/shipping-fragile.png` — shipping step, fragile-handling conditional fields
- `screenshots/product-review.png` — wizard review step

## Deployment

**GitHub:** https://github.com/indoderiano/inventory_portal (repository visibility not yet verified)

**Vercel:** _[not yet deployed / not yet verified]_

## Assessment Notes

A few architectural choices are particularly relevant to how this project should be evaluated:

- **The `createdProducts` ledger and `mergeCreatedIntoListing`** exist specifically to handle DummyJSON's non-persistent mock writes without fabricating server data or introducing a second product store — see "Created Products / DummyJSON Limitation" above.
- **Optimistic rollback is id-based, not patch-replay-based**, specifically to stay correct under concurrent mutations on different products sharing a cache entry — this was found to be necessary during implementation, not assumed up front.
- **Filter state has exactly one owner at each layer** (URL, Redux, RTK Query), with no duplicated or shadow state anywhere in the three-way sync.
- **The wizard uses a single `useForm()` instance** across all four stages; Yup is the only validation authority, and the UI never re-implements a validation rule it should be reading from the schema.
- The mobile drawer's missing focus trap is a **documented, intentional tradeoff**, not an unacknowledged gap.
