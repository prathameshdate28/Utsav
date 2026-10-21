import { describe, it, expect } from "vitest";
import { calculateBudgetEstimate } from "./budget";

describe("calculateBudgetEstimate pure engine", () => {
  it("calculates intimate tier accurately", () => {
    const result = calculateBudgetEstimate({
      guestCount: 100,
      tier: "intimate",
      ceremonyCount: 2,
    });

    expect(result.cateringCost).toBeGreaterThan(0);
    expect(result.decorCost).toBeGreaterThan(0);
    expect(result.venueCost).toBeGreaterThan(0);
    expect(result.contingencyCost).toBe(
      Math.round((result.cateringCost + result.decorCost + result.venueCost) * 0.1)
    );
    expect(result.totalEstimatedCost).toBe(
      result.cateringCost + result.decorCost + result.venueCost + result.contingencyCost
    );
    expect(result.perGuestCost).toBe(Math.round(result.totalEstimatedCost / 100));
  });

  it("handles edge cases and bounds guest limits", () => {
    const resultLow = calculateBudgetEstimate({
      guestCount: 0,
      tier: "grand",
      ceremonyCount: 0,
    });
    // Clamped to at least 10 guests and 1 ceremony
    expect(resultLow.perGuestCost).toBeGreaterThan(0);
  });

  it("scales up appropriately for royal tier with multiple ceremonies", () => {
    const intimate = calculateBudgetEstimate({
      guestCount: 300,
      tier: "intimate",
      ceremonyCount: 3,
    });
    const royal = calculateBudgetEstimate({
      guestCount: 300,
      tier: "royal",
      ceremonyCount: 3,
    });
    expect(royal.totalEstimatedCost).toBeGreaterThan(intimate.totalEstimatedCost);
  });
});
