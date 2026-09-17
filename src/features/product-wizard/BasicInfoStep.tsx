"use client";

import { useFormContext, useFormState } from "react-hook-form";

import { useGetProductCategoriesQuery } from "@/services/dummyJsonApi";

import { BASIC_INFO_FIELD_NAMES, type ProductWizardFormValues } from "./schema";

export function BasicInfoStep() {
  const { control, register } = useFormContext<ProductWizardFormValues>();
  // Categories come from the DummyJSON API - the same query the /products
  // filter bar already uses - and are never hardcoded here.
  const { data: categories } = useGetProductCategoriesQuery();

  const { errors } = useFormState<ProductWizardFormValues>({
    control,
    name: BASIC_INFO_FIELD_NAMES,
  });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Basic information</h2>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register("title")}
        />
        {errors.title && (
          <span role="alert" className="text-xs text-red-600">
            {errors.title.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Brand
        <input
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          {...register("brand")}
        />
        {errors.brand && (
          <span role="alert" className="text-xs text-red-600">
            {errors.brand.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Category
        <select
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          defaultValue=""
          {...register("category")}
        >
          <option value="" disabled>
            Select a category
          </option>
          {categories?.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category && (
          <span role="alert" className="text-xs text-red-600">
            {errors.category.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Description
        <textarea
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          rows={4}
          {...register("description")}
        />
        {errors.description && (
          <span role="alert" className="text-xs text-red-600">
            {errors.description.message}
          </span>
        )}
      </label>
    </section>
  );
}
