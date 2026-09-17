import { Suspense } from "react";

import { ProductsView } from "@/features/products/ProductsView";

export default function ProductsPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading products…</p>}>
      <ProductsView />
    </Suspense>
  );
}
