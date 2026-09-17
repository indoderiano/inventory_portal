"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  areProductFiltersEqual,
  parseProductFiltersFromSearchParams,
  productFiltersToSearchParams,
} from "./productFiltersUrl";
import { productFiltersActions, selectProductFilters } from "./productFiltersSlice";

/**
 * Keeps the URL search params and the `productFilters` Redux slice in sync
 * in both directions:
 *
 *  - URL -> Redux: on mount, and whenever the URL's search params change
 *    externally (deep link, manual edit, browser back/forward), the parsed
 *    filters are dispatched into Redux - but only if they actually differ
 *    from the current Redux state, so this never fights direction two.
 *  - Redux -> URL: whenever the committed filter state changes (a user
 *    interaction), the URL is updated to match via `router.push` - but only
 *    if it doesn't already match.
 *
 * The two effects coordinate through `skipNextPushRef` rather than a
 * mount-count flag: whenever direction one dispatches a hydration action,
 * it marks that the *next* Redux change is a reaction to the URL, not a
 * user interaction, so direction two must not push anything for it. This
 * is driven by an actual event (a dispatch happened) rather than "have I
 * rendered before", so it stays correct even when React Strict Mode
 * double-invokes both effects' setup functions on mount - a mount-count
 * ref only survives one extra invocation and produces a real infinite
 * loop under Strict Mode (verified: it strips the URL's params right
 * after mount, which re-triggers hydration, which re-triggers the strip).
 */
export function useProductFiltersUrlSync(): void {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useAppSelector(selectProductFilters);

  const skipNextPushRef = useRef(false);

  useEffect(() => {
    const urlFilters = parseProductFiltersFromSearchParams(searchParams);
    if (!areProductFiltersEqual(urlFilters, filters)) {
      skipNextPushRef.current = true;
      dispatch(productFiltersActions.filtersHydratedFromUrl(urlFilters));
    }
    // Intentionally reacts to `searchParams` only: this effect represents
    // the URL -> Redux direction, and must not re-run just because Redux
    // changed (that is direction two's job, below).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, dispatch]);

  useEffect(() => {
    if (skipNextPushRef.current) {
      // This filters change is direction one catching up to the URL, not
      // a user interaction - pushing here would just echo the URL back
      // at itself (best case) or push a stale pre-hydration value that
      // hasn't landed yet (worst case, see the note above).
      skipNextPushRef.current = false;
      return;
    }

    const nextSearch = productFiltersToSearchParams(filters).toString();
    if (nextSearch === searchParams.toString()) {
      return;
    }

    router.push(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
      scroll: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pathname, router]);
}
