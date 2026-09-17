import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Toast } from "./Toast";

describe("Toast", () => {
  it("renders as an accessible alert containing the message", () => {
    render(<Toast message="Something failed" onRetry={() => {}} onDismiss={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
  });

  it("Retry invokes the onRetry callback", () => {
    const onRetry = vi.fn();
    render(<Toast message="Something failed" onRetry={onRetry} onDismiss={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("Dismiss invokes the onDismiss callback", () => {
    const onDismiss = vi.fn();
    render(<Toast message="Something failed" onRetry={() => {}} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not auto-dismiss on its own", async () => {
    const onDismiss = vi.fn();
    render(<Toast message="Something failed" onRetry={() => {}} onDismiss={onDismiss} />);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
