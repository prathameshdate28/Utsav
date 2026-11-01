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

describe("budget generation", () => {
  it("preserves the current budget when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const plan = blueprintSchema.parse(demoPlan);
    const response = await POST(new Request("http://localhost/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: plan.event, budget: plan.budget }),
    }));
    const result = await response.json() as { budget: typeof plan.budget; fallback: boolean };

    expect(response.status).toBe(200);
    expect(result.budget).toEqual(plan.budget);
    expect(result.fallback).toBe(true);
  });
});
