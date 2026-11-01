import { describe, expect, it } from "vitest";
import { createFallbackBlueprint } from "./fallback";
import { findIncompletePlanFields } from "./validate-generated-plan";

function completeGeminiCandidate() {
  const plan = createFallbackBlueprint("Birthday in Pune for 40 guests, budget ₹60,000, dinosaurs and butterflies");
  return {
    ...plan,
    vendorCategories: plan.vendorCategories.map((category) => ({
      ...category,
      shortlist: category.shortlist.slice(0, 3),
    })),
    assumptions: plan.assumptions.slice(0, 2),
  };
}

describe("generated plan completeness", () => {
  it("accepts a complete plan matching the prompt-derived event facts", () => {
    const plan = createFallbackBlueprint("Birthday in Pune for 40 guests, budget ₹60,000, dinosaurs and butterflies");

    expect(findIncompletePlanFields(completeGeminiCandidate(), plan)).toEqual([]);
  });

  it("identifies omitted fields for a targeted Gemini repair attempt", () => {
    const plan = createFallbackBlueprint("Birthday in Pune for 40 guests, budget ₹60,000, dinosaurs and butterflies");
    const candidate = completeGeminiCandidate();
    candidate.moodboard.pop();
    candidate.ideas.menu.pop();

    expect(findIncompletePlanFields(candidate, plan)).toEqual([
      "3 valid menu courses (value: Too small: expected array to have exactly 3 items)",
      "6 valid moodboard tiles (value: Too small: expected array to have exactly 6 items)",
    ]);
  });
});
