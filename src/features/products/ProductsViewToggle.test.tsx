import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductsViewToggle } from "./ProductsViewToggle";

describe("ProductsViewToggle", () => {
  it("renders Card and Table buttons inside a labelled group", () => {
    render(<ProductsViewToggle viewMode="card" onChange={() => {}} />);

    expect(screen.getByRole("group", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^card$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^table$/i })).toBeInTheDocument();
  });

  it("marks the active mode aria-pressed=true and the other aria-pressed=false", () => {
    render(<ProductsViewToggle viewMode="table" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: /^card$/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /^table$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange with the clicked mode", () => {
    const onChange = vi.fn();
    render(<ProductsViewToggle viewMode="card" onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /^table$/i }));

    expect(onChange).toHaveBeenCalledWith("table");
  });
});
