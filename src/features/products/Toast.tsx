"use client";

interface ToastProps {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * Minimal, dependency-free failure toast. Deliberately has no auto-dismiss
 * timer - clearing an error before it's been read/perceived is an
 * accessibility anti-pattern, so it stays until the user explicitly
 * retries or dismisses it.
 */
export function Toast({ message, onRetry, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-auto max-w-sm flex-col gap-3 rounded border border-red-300 bg-white p-4 text-sm shadow-lg sm:inset-x-auto sm:right-4 dark:border-red-800 dark:bg-zinc-900"
    >
      <p>{message}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded bg-zinc-900 px-3 py-1.5 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
