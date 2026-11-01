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

describe("page translation", () => {
  it("returns an explicit configuration error when Gemini is unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const response = await POST(new Request("http://localhost/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "hi", texts: ["Welcome to Utsav"] }),
    }));
    const result = await response.json() as { error: string };

    expect(response.status).toBe(503);
    expect(result.error).toContain("GEMINI_API_KEY and/or GROQ_API_KEY");
  });

  it("rejects unsupported translation languages", async () => {
    const response = await POST(new Request("http://localhost/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "fr", texts: ["Welcome to Utsav"] }),
    }));

    expect(response.status).toBe(400);
  });
});
