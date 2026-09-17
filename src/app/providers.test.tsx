import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "@/app/providers";
import { useAppStore } from "@/store/hooks";

function StoreProbe() {
  const store = useAppStore();
  return <div>store-ready:{String(Boolean(store.getState))}</div>;
}

describe("Providers", () => {
  it("renders children wrapped with a live Redux store", () => {
    render(
      <Providers>
        <StoreProbe />
      </Providers>,
    );

    expect(screen.getByText("store-ready:true")).toBeInTheDocument();
  });
});
