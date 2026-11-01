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

describe("timeline generation", () => {
  it("preserves the current timeline when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const plan = blueprintSchema.parse(demoPlan);
    const response = await POST(new Request("http://localhost/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    }));
    const result = await response.json() as { timeline: typeof plan.timeline; fallback: boolean };

    expect(response.status).toBe(200);
    expect(result.timeline).toEqual(plan.timeline);
    expect(result.fallback).toBe(true);
  });
});
