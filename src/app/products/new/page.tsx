import { ProductWizardForm } from "@/features/product-wizard/ProductWizardForm";

export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">New product</h1>
      <ProductWizardForm />
    </main>
  );
}
