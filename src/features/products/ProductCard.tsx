"use client";

import { useProductActions } from "./useProductActions";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  // False for a product that's only visible because it's remembered in the
  // `createdProducts` ledger (created this session, DummyJSON never
  // actually persisted it) and isn't present in any real `getProducts`
  // cache entry - there's no real cache entry to optimistically patch for
  // it, and fabricating one just to allow a mutation button to exist would
  // repeat exactly the mistake the create-cache work already ruled out.
  // The product still displays normally; only Edit/Delete are unavailable.
  isEditable: boolean;
  onMutationError: (message: string, retry: () => void) => void;
}

export function ProductCard({ product, isEditable, onMutationError }: ProductCardProps) {
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
      <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Title
            <input
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isMutating}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price
            <input
              type="number"
              step="0.01"
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isMutating}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Stock
            <input
              type="number"
              className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              disabled={isMutating}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isMutating}
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
        </form>
      </li>
    );
  }

  return (
    <li className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="font-medium">{product.title}</p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{product.category}</p>
      <p className="text-sm">${product.price.toFixed(2)}</p>

      {!isEditable && (
        <p className="mt-3 text-xs italic text-zinc-400 dark:text-zinc-500">
          Not yet saved to the catalog - editing unavailable.
        </p>
      )}

      {isEditable && isConfirmingDelete && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm">Confirm delete?</p>
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
        <div className="mt-3 flex gap-2">
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
    </li>
  );
}
