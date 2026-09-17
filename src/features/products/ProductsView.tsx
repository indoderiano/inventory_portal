"use client";

import { useGetProductsQuery } from "@/services/dummyJsonApi";
import { useAppSelector } from "@/store/hooks";

import { ProductFiltersBar } from "./ProductFiltersBar";
import { ProductsList } from "./ProductsList";
import { ProductsPagination } from "./ProductsPagination";
import { selectProductsQueryArgs } from "./productFiltersSlice";
import { useProductFiltersUrlSync } from "./useProductFiltersUrlSync";

export function ProductsView() {
  useProductFiltersUrlSync();

  const queryArgs = useAppSelector(selectProductsQueryArgs);
  const { data, error, isLoading, isFetching } = useGetProductsQuery(queryArgs);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Products</h1>
      <ProductFiltersBar />
      <ProductsList data={data} error={error} isLoading={isLoading} isFetching={isFetching} />
      <ProductsPagination total={data?.total} />
    </div>
  );
}
