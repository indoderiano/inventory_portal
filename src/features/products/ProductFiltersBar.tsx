import { ProductCategorySelect } from "./ProductCategorySelect";
import { ProductSearchInput } from "./ProductSearchInput";
import { ProductSortSelect } from "./ProductSortSelect";

export function ProductFiltersBar() {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <ProductSearchInput />
      <ProductCategorySelect />
      <ProductSortSelect />
    </div>
  );
}
