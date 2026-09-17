/**
 * Indexes into an array with a runtime bounds check, for use with
 * `noUncheckedIndexedAccess` in tests where a prior assertion already
 * guarantees the length (e.g. `expect(items).toHaveLength(3)`).
 */
export function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(
      `Expected an element at index ${index}, but the array only has ${items.length} entries.`,
    );
  }
  return item;
}
