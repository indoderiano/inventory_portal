import type { Product } from "@/types/product";

import { ProductTableRow } from "./ProductTableRow";

interface ProductsTableProps {
  products: readonly Product[];
  editableProductIds: ReadonlySet<number>;
  onMutationError: (message: string, retry: () => void) => void;
}

/**
 * Semantic table rendering of the same product list `ProductsList` renders
 * as cards. Wrapped in `overflow-x-auto` rather than given a separate
 * mobile-specific layout - the card view already exists as the
 * narrow-viewport-friendly option, so the table just scrolls horizontally
 * if it doesn't fit.
 */
export function ProductsTable({ products, editableProductIds, onMutationError }: ProductsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th scope="col" className="p-2 font-medium">
              Product
            </th>
            <th scope="col" className="p-2 font-medium">
              Category
            </th>
            <th scope="col" className="p-2 font-medium">
              Price
            </th>
            <th scope="col" className="p-2 font-medium">
              Stock
            </th>
            <th scope="col" className="p-2 font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <ProductTableRow
              key={product.id}
              product={product}
              isEditable={editableProductIds.has(product.id)}
              onMutationError={onMutationError}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
