import { useRef } from "react";

/**
 * Counts how many times the calling component has rendered. Read-only,
 * has no effect on behavior or re-rendering itself - exists so render
 * counts can be asserted on in tests rather than inferred from theory.
 *
 * Deliberately mutates a ref during render, which `react-hooks/refs`
 * flags on the assumption that render should stay pure for the React
 * Compiler's benefit. That doesn't apply here: this hook's entire purpose
 * is to observe every render pass as it happens (a `useEffect`-based
 * counter would itself schedule an extra render and lag by one count),
 * the mutation has no bearing on what's rendered, and this hook is
 * intentionally opting out of memoization, not fighting it.
 */
export function useRenderCount(): number {
  const countRef = useRef(0);
  /* eslint-disable react-hooks/refs -- see doc comment above */
  countRef.current += 1;
  return countRef.current;
  /* eslint-enable react-hooks/refs */
}
