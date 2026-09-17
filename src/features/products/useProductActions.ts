import { useState } from "react";

import { useDeleteProductMutation, useUpdateProductMutation } from "@/services/dummyJsonApi";
import type { Product, UpdateProductRequest } from "@/types/product";

export interface ProductActions {
  isEditing: boolean;
  isConfirmingDelete: boolean;
  title: string;
  price: string;
  stock: string;
  setTitle: (value: string) => void;
  setPrice: (value: string) => void;
  setStock: (value: string) => void;
  isMutating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  handleSave: () => void;
  startDelete: () => void;
  cancelDelete: () => void;
  handleConfirmDelete: () => void;
}

/**
 * All optimistic-update/delete behavior for a single product, shared by
 * every place a product is rendered with Edit/Delete actions (currently
 * `ProductCard` and `ProductTableRow`) - the card and table are markup-only
 * consumers of this; the mutation hooks, attempt/retry logic, and edit/
 * confirm-delete state live here exactly once.
 *
 * `isEditable` is false for a product that's only visible because it's
 * remembered in the `createdProducts` ledger and isn't present in any real
 * `getProducts` cache entry - there's no real cache entry to optimistically
 * patch for it. This is enforced here, not just by the caller choosing not
 * to render a button: `startEdit`/`startDelete` (and, transitively,
 * `handleSave`/`handleConfirmDelete`, which can only be reached after one of
 * those) are no-ops when `isEditable` is false, so the restriction holds
 * even if a caller's rendering logic ever gets it wrong.
 */
export function useProductActions(
  product: Product,
  isEditable: boolean,
  onMutationError: (message: string, retry: () => void) => void,
): ProductActions {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));

  // Each caller creates its own hook instance, so `isLoading` here reflects
  // only *this* product's in-flight mutation - other cards/rows' Edit/
  // Delete controls are never affected by one instance's pending request.
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const isMutating = isUpdating || isDeleting;

  function resetFields() {
    setTitle(product.title);
    setPrice(String(product.price));
    setStock(String(product.stock));
  }

  // Shared by the initial Save click and by a toast's Retry action, so
  // retrying genuinely repeats the exact same request rather than
  // re-reading whatever the form fields happen to say by the time Retry is
  // clicked (edit mode may have already been exited by then).
  async function attemptUpdate(patch: UpdateProductRequest) {
    try {
      await updateProduct(patch).unwrap();
      setIsEditing(false);
    } catch {
      onMutationError("We couldn't save your changes to this product. Please try again.", () => {
        void attemptUpdate(patch);
      });
    }
  }

  async function attemptDelete() {
    try {
      await deleteProduct(product.id).unwrap();
    } catch {
      onMutationError("We couldn't delete this product. Please try again.", () => {
        void attemptDelete();
      });
    }
  }

  function handleSave() {
    if (!isEditable) {
      return;
    }
    void attemptUpdate({
      id: product.id,
      title: title.trim(),
      price: Number(price),
      stock: Number(stock),
    });
  }

  function startEdit() {
    if (!isEditable) {
      return;
    }
    setIsEditing(true);
  }

  function cancelEdit() {
    resetFields();
    setIsEditing(false);
  }

  function startDelete() {
    if (!isEditable) {
      return;
    }
    setIsConfirmingDelete(true);
  }

  function cancelDelete() {
    setIsConfirmingDelete(false);
  }

  function handleConfirmDelete() {
    if (!isEditable) {
      return;
    }
    setIsConfirmingDelete(false);
    void attemptDelete();
  }

  return {
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
  };
}
