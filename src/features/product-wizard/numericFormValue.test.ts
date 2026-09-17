import { describe, expect, it } from "vitest";

import { toFormNumber, toOptionalFormNumber } from "./numericFormValue";

describe("toFormNumber", () => {
  it("passes a real number through unchanged", () => {
    expect(toFormNumber(29.99)).toBe(29.99);
    expect(toFormNumber(0)).toBe(0);
  });

  it("converts a numeric string to a number", () => {
    expect(toFormNumber("29.99")).toBe(29.99);
    expect(toFormNumber("50")).toBe(50);
    expect(toFormNumber("0")).toBe(0);
  });

  it("converts a negative numeric string", () => {
    expect(toFormNumber("-5")).toBe(-5);
  });

  it("does not require `any` or a type assertion to accept either input shape", () => {
    // This is a compile-time property, not a runtime one - if this file
    // type-checks (see `npm run typecheck`), `toFormNumber` genuinely
    // accepts `number | string` without `any` anywhere in its signature.
    const fromNumber: number = toFormNumber(5);
    const fromString: number = toFormNumber("5");
    expect(fromNumber).toBe(5);
    expect(fromString).toBe(5);
  });

  it("returns NaN, predictably, for a non-numeric string rather than throwing", () => {
    expect(() => toFormNumber("not-a-number")).not.toThrow();
    expect(Number.isNaN(toFormNumber("not-a-number"))).toBe(true);
  });

  it("returns 0 (not NaN) for an empty string, per Number()'s own coercion rule", () => {
    // `Number("")` is 0 by JS's own (surprising) coercion rule; `toFormNumber`
    // doesn't special-case it, matching its "just convert, predictably"
    // contract - callers that need "blank means absent" use
    // `toOptionalFormNumber` instead, which does handle this.
    expect(toFormNumber("")).toBe(0);
  });
});

describe("toOptionalFormNumber", () => {
  it("converts a numeric string to a number", () => {
    expect(toOptionalFormNumber("15")).toBe(15);
    expect(toOptionalFormNumber(15)).toBe(15);
  });

  it("treats undefined as absent", () => {
    expect(toOptionalFormNumber(undefined)).toBeUndefined();
  });

  it("treats null as absent", () => {
    expect(toOptionalFormNumber(null)).toBeUndefined();
  });

  it("treats an empty string as absent, not 0", () => {
    expect(toOptionalFormNumber("")).toBeUndefined();
  });

  it("treats a whitespace-only string as absent", () => {
    expect(toOptionalFormNumber("   ")).toBeUndefined();
  });

  it("accepts a genuine zero", () => {
    expect(toOptionalFormNumber(0)).toBe(0);
    expect(toOptionalFormNumber("0")).toBe(0);
  });

  it("converts a non-empty, non-numeric string to NaN rather than swallowing it as absent", () => {
    const result = toOptionalFormNumber("abc");
    expect(result).toBeDefined();
    expect(Number.isNaN(result)).toBe(true);
  });
});
