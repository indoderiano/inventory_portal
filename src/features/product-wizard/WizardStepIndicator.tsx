const WIZARD_STEPS = [
  { step: 1, label: "Basic Information" },
  { step: 2, label: "Variations" },
  { step: 3, label: "Shipping & Supplier" },
  { step: 4, label: "Review" },
] as const;

interface WizardStepIndicatorProps {
  currentStep: number;
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <ol aria-label="Wizard progress" className="flex flex-wrap items-center gap-2 text-sm">
      {WIZARD_STEPS.map(({ step, label }, index) => (
        <li key={step} className="flex items-center gap-2">
          <span
            aria-current={step === currentStep ? "step" : undefined}
            className={
              step === currentStep
                ? "rounded-full bg-zinc-900 px-3 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-full border border-zinc-300 px-3 py-1 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
            }
          >
            {step}. {label}
          </span>
          {index < WIZARD_STEPS.length - 1 && <span aria-hidden="true">→</span>}
        </li>
      ))}
    </ol>
  );
}
