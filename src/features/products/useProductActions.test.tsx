import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/store/store";
import { mockProduct } from "@/test/mocks/fixtures";

import { useProductActions } from "./useProductActions";

function renderActions(isEditable: boolean) {
  const store = makeStore();
  const onMutationError = vi.fn();
  const { result } = renderHook(() => useProductActions(mockProduct, isEditable, onMutationError), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
  return { result, onMutationError };
}

// `ProductCard`/`ProductTableRow` never render Edit/Delete buttons at all
// when `isEditable` is false, so normal UI-driven tests can't reach these
// guards - they exist as defense-in-depth (see the hook's own doc comment:
// "enforced here, not just by the caller choosing not to render a
// button"), and are exercised directly here instead.
describe("useProductActions ledger-only restriction", () => {
  it("startEdit does nothing when isEditable is false", () => {
    const { result } = renderActions(false);

    act(() => {
      result.current.startEdit();
    });

    expect(result.current.isEditing).toBe(false);
  });

  it("startDelete does nothing when isEditable is false", () => {
    const { result } = renderActions(false);

    act(() => {
      result.current.startDelete();
    });

    expect(result.current.isConfirmingDelete).toBe(false);
  });

  it("handleSave does nothing when isEditable is false", () => {
    const { result } = renderActions(false);

    act(() => {
      result.current.handleSave();
    });

    expect(result.current.isMutating).toBe(false);
  });

  it("handleConfirmDelete does nothing when isEditable is false", () => {
    const { result } = renderActions(false);

    act(() => {
      result.current.handleConfirmDelete();
    });

    expect(result.current.isConfirmingDelete).toBe(false);
    expect(result.current.isMutating).toBe(false);
  });

  it("startEdit/startDelete work normally when isEditable is true", () => {
    const { result } = renderActions(true);

    act(() => {
      result.current.startEdit();
    });
    expect(result.current.isEditing).toBe(true);

    act(() => {
      result.current.cancelEdit();
    });
    expect(result.current.isEditing).toBe(false);

    act(() => {
      result.current.startDelete();
    });
    expect(result.current.isConfirmingDelete).toBe(true);
  });
});
