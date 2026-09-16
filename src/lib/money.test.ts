import { describe, expect, it } from "vitest";
import { formatCents, parseAmountToCents, splitEqually } from "./money";

describe("parseAmountToCents", () => {
  it("parses whole numbers", () => {
    expect(parseAmountToCents("42")).toBe(4200);
  });

  it("parses two decimals", () => {
    expect(parseAmountToCents("22.50")).toBe(2250);
    expect(parseAmountToCents("27.35")).toBe(2735);
  });

  it("parses one decimal", () => {
    expect(parseAmountToCents("10.5")).toBe(1050);
  });

  it("strips thousand separators", () => {
    expect(parseAmountToCents("1,234.56")).toBe(123456);
  });

  it("trims whitespace", () => {
    expect(parseAmountToCents("  9.99  ")).toBe(999);
  });

  it("rejects negative amounts", () => {
    expect(parseAmountToCents("-1")).toBeNull();
  });

  it("rejects zero", () => {
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("0.00")).toBeNull();
  });

  it("rejects more than 2 decimals", () => {
    expect(parseAmountToCents("1.234")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents(".")).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats GBP", () => {
    // narrowSymbol yields "£"
    expect(formatCents(2250, "GBP")).toMatch(/£\s?22\.50/);
  });

  it("formats USD", () => {
    expect(formatCents(1000, "USD")).toMatch(/\$\s?10\.00/);
  });

  it("still formats an unknown currency code with the amount", () => {
    // Intl.NumberFormat accepts arbitrary 3-letter codes, so we assert on
    // the pieces, not the exact whitespace (may be a non-breaking space).
    const out = formatCents(150, "ZZZ");
    expect(out).toContain("ZZZ");
    expect(out).toContain("1.50");
  });
});

describe("splitEqually", () => {
  it("splits evenly when divisible", () => {
    expect(splitEqually(3000, 3)).toEqual([1000, 1000, 1000]);
  });

  it("distributes remainder cents to the first participants", () => {
    // Greendale case: £27.35 among 3
    expect(splitEqually(2735, 3)).toEqual([912, 912, 911]);
  });

  it("shares sum to the exact total", () => {
    const shares = splitEqually(10001, 7);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10001);
  });

  it("handles n = 1", () => {
    expect(splitEqually(500, 1)).toEqual([500]);
  });

  it("returns empty array when n <= 0", () => {
    expect(splitEqually(500, 0)).toEqual([]);
    expect(splitEqually(500, -3)).toEqual([]);
  });
});
