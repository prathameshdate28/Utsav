import { describe, it, expect } from "vitest";
import { formatINR, formatCompactINR } from "./format";

describe("formatINR pure engine function", () => {
  it("formats zero correctly", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("formats amounts under 1000", () => {
    expect(formatINR(750)).toBe("₹750");
  });

  it("formats thousands with Indian comma grouping", () => {
    expect(formatINR(5000)).toBe("₹5,000");
    expect(formatINR(50000)).toBe("₹50,000");
  });

  it("formats lakhs and crores with Indian grouping", () => {
    expect(formatINR(150000)).toBe("₹1,50,000");
    expect(formatINR(1250000)).toBe("₹12,50,000");
    expect(formatINR(10000000)).toBe("₹1,00,00,000");
  });

  it("handles negative values", () => {
    expect(formatINR(-25000)).toBe("-₹25,000");
  });

  it("handles non-finite values safely", () => {
    expect(formatINR(NaN)).toBe("₹0");
    expect(formatINR(Infinity)).toBe("₹0");
  });
});

describe("formatCompactINR pure engine function", () => {
  it("formats thousands", () => {
    expect(formatCompactINR(25000)).toBe("₹25k");
  });

  it("formats lakhs", () => {
    expect(formatCompactINR(500000)).toBe("₹5 L");
    expect(formatCompactINR(1250000)).toBe("₹12.50 L");
  });

  it("formats crores", () => {
    expect(formatCompactINR(20000000)).toBe("₹2 Cr");
  });
});
