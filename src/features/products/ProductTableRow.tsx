"use client";

import { useProductActions } from "./useProductActions";
import type { Product } from "@/types/product";

interface ProductTableRowProps {
  product: Product;
  // See `ProductCard`'s identical prop for the full explanation - a
  // ledger-only product has no real cache entry to optimistically patch.
  isEditable: boolean;
  onMutationError: (message: string, retry: () => void) => void;
}

/**
 * Table-row presentation of the exact same Edit/Delete behavior as
 * `ProductCard` - both consume `useProductActions`, so there's exactly one
 * place the mutation hooks, attempt/retry logic, and edit/confirm-delete
 * state actually live. Only the markup differs.
 */
export function ProductTableRow({ product, isEditable, onMutationError }: ProductTableRowProps) {
  const {
    isEditing,
    isConfirmingDelete,
    title,
    price,
    stock,
    setTitle,
    setPrice,
    setStock,
    isMutating,
    isUpdating,
    isDeleting,
    startEdit,
    cancelEdit,
    handleSave,
    startDelete,
    cancelDelete,
    handleConfirmDelete,
  } = useProductActions(product, isEditable, onMutationError);

  if (isEditing) {
    return (
      <tr className="border-b border-zinc-200 dark:border-zinc-800">
        <td className="p-2">
          <label className="flex flex-col gap-1">
            <span className="sr-only">Title</span>
            <input
              className="w-full min-w-[10rem] rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isMutating}
            />
          </label>
        </td>
        <td className="p-2 text-zinc-500 dark:text-zinc-400">{product.category}</td>
        <td className="p-2">
          <label className="flex flex-col gap-1">
            <span className="sr-only">Price</span>
            <input
              type="number"
              step="0.01"
              className="w-24 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isMutating}
            />
          </label>
        </td>
        <td className="p-2">
          <label className="flex flex-col gap-1">
            <span className="sr-only">Stock</span>
            <input
              type="number"
              className="w-20 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              disabled={isMutating}
            />
          </label>
        </td>
        <td className="p-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isMutating}
              onClick={handleSave}
              className="rounded bg-zinc-900 px-3 py-1 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isUpdating ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={cancelEdit}
              className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-zinc-200 dark:border-zinc-800">
      <td className="p-2 font-medium">{product.title}</td>
      <td className="p-2 text-zinc-500 dark:text-zinc-400">{product.category}</td>
      <td className="p-2">${product.price.toFixed(2)}</td>
      <td className="p-2">{product.stock}</td>
      <td className="p-2">
        {!isEditable && (
          <span className="text-xs italic text-zinc-400 dark:text-zinc-500">
            Not yet saved to the catalog - editing unavailable.
          </span>
        )}

        {isEditable && isConfirmingDelete && (
          <div className="flex flex-col gap-2">
            <span className="text-sm">Confirm delete?</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isMutating}
                onClick={handleConfirmDelete}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Confirm"}
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={cancelDelete}
                className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isEditable && !isConfirmingDelete && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isMutating}
              onClick={startEdit}
              className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={startDelete}
              className="rounded border border-red-300 px-3 py-1 text-sm text-red-600 disabled:opacity-50 dark:border-red-800"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
