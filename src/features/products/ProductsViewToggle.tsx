"use client";

export type ProductsViewMode = "card" | "table";

interface ProductsViewToggleProps {
  viewMode: ProductsViewMode;
  onChange: (mode: ProductsViewMode) => void;
}

const OPTIONS: ReadonlyArray<{ value: ProductsViewMode; label: string }> = [
  { value: "card", label: "Card" },
  { value: "table", label: "Table" },
];

export function ProductsViewToggle({ viewMode, onChange }: ProductsViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex gap-1 rounded border border-zinc-300 p-1 dark:border-zinc-700"
    >
      {OPTIONS.map((option) => {
        const isActive = viewMode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={
              isActive
                ? "rounded bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300"
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
