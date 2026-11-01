import { afterEach, describe, expect, it } from "vitest";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import demoPlan from "../../../../../data/demo/jaipur-wedding.json";
import { POST } from "./route";

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;

afterEach(() => {
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
});

describe("Ideas Studio content generation", () => {
  it("preserves existing menu and invitations when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const plan = blueprintSchema.parse(demoPlan);
    const response = await POST(new Request("http://localhost/api/ideas/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "menu",
        event: plan.event,
        themes: plan.ideas.themes.map(({ name, decor }) => ({ name, decor })),
        menu: plan.ideas.menu,
        invitations: plan.ideas.invitations,
      }),
    }));
    const result = await response.json() as { menu: typeof plan.ideas.menu; fallback: boolean };

    expect(response.status).toBe(200);
    expect(result.menu).toEqual(plan.ideas.menu);
    expect(result.fallback).toBe(true);
  });
});
