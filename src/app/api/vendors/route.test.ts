import { afterEach, describe, expect, it } from "vitest";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import demoPlan from "../../../../data/demo/jaipur-wedding.json";
import { POST } from "./route";

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;

afterEach(() => {
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
});

describe("vendor category generation", () => {
  it("preserves the existing category when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const plan = blueprintSchema.parse(demoPlan);
    const category = plan.vendorCategories[0];
    const response = await POST(new Request("http://localhost/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: plan.event, category, budgetTotal: plan.budget.total }),
    }));
    const result = await response.json() as { category: typeof category; fallback: boolean };

    expect(response.status).toBe(200);
    expect(result.category).toEqual(category);
    expect(result.fallback).toBe(true);
  });
});
