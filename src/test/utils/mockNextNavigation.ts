import { useSyncExternalStore } from "react";

/**
 * A minimal, in-memory stand-in for the App Router's client navigation
 * hooks, controllable from tests. Real `next/navigation` hooks require a
 * live router context that doesn't exist in a Vitest/jsdom environment, so
 * URL-sync tests mock the module wholesale via:
 *
 *   vi.mock("next/navigation", () => import("@/test/utils/mockNextNavigation"));
 *
 * and drive it with `createMockRouter` / `setActiveMockRouter`.
 */
export interface MockRouter {
  subscribe: (listener: () => void) => () => void;
  getPathnameSnapshot: () => string;
  getSearchParamsSnapshot: () => URLSearchParams;
  push: (url: string) => void;
  replace: (url: string) => void;
  back: () => void;
  forward: () => void;
}

const ORIGIN = "http://localhost";

export function createMockRouter(initialUrl = "/products"): MockRouter {
  const history: string[] = [initialUrl];
  let historyIndex = 0;
  let currentUrl = new URL(initialUrl, ORIGIN);
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function navigateTo(url: string) {
    currentUrl = new URL(url, ORIGIN);
    notify();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getPathnameSnapshot() {
      return currentUrl.pathname;
    },
    getSearchParamsSnapshot() {
      return currentUrl.searchParams;
    },
    push(url) {
      history.splice(historyIndex + 1);
      history.push(url);
      historyIndex = history.length - 1;
      navigateTo(url);
    },
    replace(url) {
      history[historyIndex] = url;
      navigateTo(url);
    },
    back() {
      if (historyIndex > 0) {
        historyIndex -= 1;
        const entry = history[historyIndex];
        if (entry !== undefined) {
          navigateTo(entry);
        }
      }
    },
    forward() {
      if (historyIndex < history.length - 1) {
        historyIndex += 1;
        const entry = history[historyIndex];
        if (entry !== undefined) {
          navigateTo(entry);
        }
      }
    },
  };
}

let activeRouter: MockRouter = createMockRouter();

export function setActiveMockRouter(router: MockRouter): void {
  activeRouter = router;
}

// Hoisted to module scope, and delegating to the *current* `activeRouter` on
// every call, so these stay referentially stable across renders regardless
// of which router instance is active - mirroring the real Next.js hooks,
// whose identities don't change from render to render. An unstable
// `subscribe`/`getSnapshot` pair fed into `useSyncExternalStore` causes
// React to tear down and rebuild the subscription every render, which can
// cascade into a "Maximum update depth exceeded" loop.
function subscribe(listener: () => void): () => void {
  return activeRouter.subscribe(listener);
}

function getPathnameSnapshot(): string {
  return activeRouter.getPathnameSnapshot();
}

function getSearchParamsSnapshot(): URLSearchParams {
  return activeRouter.getSearchParamsSnapshot();
}

const routerHandle = {
  push: (url: string) => activeRouter.push(url),
  replace: (url: string) => activeRouter.replace(url),
  back: () => activeRouter.back(),
  forward: () => activeRouter.forward(),
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return routerHandle;
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, getPathnameSnapshot, getPathnameSnapshot);
}

export function useSearchParams(): URLSearchParams {
  return useSyncExternalStore(
    subscribe,
    getSearchParamsSnapshot,
    getSearchParamsSnapshot,
  );
}
