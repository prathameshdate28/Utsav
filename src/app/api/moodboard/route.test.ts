import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalApiKey = process.env.GEMINI_API_KEY;
const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalOpenRouterApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
  vi.unstubAllGlobals();
});

describe("moodboard image generation", () => {
  it("returns a curated fallback with a user-friendly notice when image providers are unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const request = new Request("http://localhost/api/moodboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: "A candlelit garden dinner",
        fallbackCaption: "Tables",
        city: "Pune",
        palette: ["#7A1F3D", "#F2A900", "#FFF8EE"],
        prompt: "A warm, intimate dinner beneath flowering branches.",
      }),
    });

    const response = await POST(request);
    const result = await response.json() as { imageUrl: string; fallback: boolean; fallbackReason: string; error: string };

    expect(response.status).toBe(200);
    expect(result).toEqual({
      imageUrl: "/demo/pune-birthday/tables.svg",
      fallback: true,
      fallbackReason: "not_configured",
      error: "We're showing a curated visual for this tile. You can try generating it again later.",
    });
    expect(result.error).not.toContain("API_KEY");
    expect(result.error).not.toContain("quota");
  });

  it("uses OpenRouter when Gemini is not configured", async () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ b64_json: "aGVsbG8=", media_type: "image/png" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const request = new Request("http://localhost/api/moodboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: "A candlelit garden dinner",
        fallbackCaption: "Tables",
        city: "Pune",
        palette: ["#7A1F3D", "#F2A900", "#FFF8EE"],
        prompt: "A warm, intimate dinner beneath flowering branches.",
      }),
    });

    const response = await POST(request);
    const result = await response.json() as { imageUrl: string; fallback: boolean; provider: string };

    expect(response.status).toBe(200);
    expect(result.fallback).toBe(false);
    expect(result.provider).toBe("openrouter");
    expect(result.imageUrl).toBe("data:image/png;base64,aGVsbG8=");
  });
});
