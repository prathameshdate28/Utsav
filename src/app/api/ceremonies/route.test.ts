import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalApiKey = process.env.GEMINI_API_KEY;
const originalGroqApiKey = process.env.GROQ_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalGroqApiKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqApiKey;
});

describe("ceremony generation", () => {
  it("keeps the existing programme and returns a user-friendly notice when providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const ceremonies = [{
      name: "Family welcome",
      order: 1,
      durationMin: 30,
      itemsNeeded: ["Welcome area"],
      responsibleRole: "Family host",
      meaning: "Guests are welcomed together. Traditions vary by family.",
      completed: false,
    }];
    const response = await POST(new Request("http://localhost/api/ceremonies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "wedding",
        event: {
          title: "A family wedding",
          city: "Jaipur",
          date: "2027-02-15",
          guests: 120,
          concept: "A relaxed family gathering",
        },
        ceremonies,
      }),
    }));
    const result = await response.json() as { ceremonies: typeof ceremonies; fallback: boolean; error: string };

    expect(response.status).toBe(200);
    expect(result.ceremonies).toEqual(ceremonies);
    expect(result.fallback).toBe(true);
    expect(result.error).toBe("We couldn't create a new programme just now. Your current suggestions are still available; please try again shortly.");
    expect(result.error).not.toContain("GEMINI_API_KEY");
  });
});
