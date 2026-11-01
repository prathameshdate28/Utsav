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

describe("panic backup generation", () => {
  it("returns prepared scenario guidance when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const plan = blueprintSchema.parse(demoPlan);
    const response = await POST(new Request("http://localhost/api/panic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "caterer cancelled", details: "", plan }),
    }));
    const result = await response.json() as { actions: string[]; fallback: boolean; message: string };

    expect(response.status).toBe(200);
    expect(result.actions).toHaveLength(3);
    expect(result.fallback).toBe(true);
    expect(result.message).toContain(plan.event.city);
    expect(result.message).not.toContain("GEMINI_API_KEY");
  });
});
