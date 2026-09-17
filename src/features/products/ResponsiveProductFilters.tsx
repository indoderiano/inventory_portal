"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ProductFiltersBar } from "./ProductFiltersBar";

/**
 * Desktop keeps `ProductFiltersBar` inline, unconditionally mounted, shown
 * via `hidden md:flex` - unchanged from before this component existed.
 * Below `md`, a *second*, separate `ProductFiltersBar` instance is mounted
 * only while the drawer is open. Both instances read from and dispatch to
 * the exact same Redux `productFilters` slice - there is no draft/local
 * copy of filter state here, and no new source of truth: opening the
 * drawer just gives the one, existing source of truth a second place to
 * temporarily render. Search stays 300ms-debounced and category/sort stay
 * immediate, because it's the same `ProductSearchInput`/etc. underneath.
 *
 * Accessibility: initial focus moves into the panel on open, Escape and an
 * explicit Close button both close it (and return focus to the trigger),
 * and a backdrop click closes it too. This deliberately does NOT implement
 * a full manual Tab-cycle focus trap (redirecting Tab/Shift+Tab back into
 * the panel at its edges) - that's a real, acknowledged gap, not an
 * oversight: a hand-rolled trap is easy to get subtly wrong without a
 * library, and none is available here.
 */
export function ResponsiveProductFilters() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDrawer]);

  return (
    <>
      <div className="hidden md:flex">
        <ProductFiltersBar />
      </div>

      <div className="md:hidden">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Filters
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50" onClick={closeDrawer} aria-hidden="true" />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-filters-heading"
              tabIndex={-1}
              className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-lg bg-white p-4 shadow-lg dark:bg-zinc-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 id="mobile-filters-heading" className="text-lg font-semibold">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                >
                  Close
                </button>
              </div>
              <ProductFiltersBar />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
