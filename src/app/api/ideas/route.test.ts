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

describe("theme idea generation", () => {
  it("returns a distinct new theme with a three-color palette when Gemini is unavailable", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const request = new Request("http://localhost/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "new",
        prompt: "A garden wedding in Jaipur",
        shownNames: ["Marigold modern"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.theme.name).not.toBe("Marigold modern");
    expect(data.theme.palette).toHaveLength(3);
    expect(data.theme.palette.every((color: string) => /^#[\da-fA-F]{6}$/.test(color))).toBe(true);
  });

  it("builds a variation from the selected theme instead of requesting a new theme", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const selectedTheme = {
      name: "Marigold modern",
      palette: ["#7A1F3D", "#F2A900", "#FFF8EE"],
      decor: "Layered marigolds and warm brass.",
      entertainment: "An acoustic set.",
      signatureMoment: "A shared welcome song.",
    };
    const request = new Request("http://localhost/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "variation",
        prompt: "A garden wedding in Jaipur",
        shownNames: [selectedTheme.name],
        selectedTheme,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.theme.name).toContain(selectedTheme.name);
    expect(data.theme.name).not.toBe(selectedTheme.name);
    expect(data.theme.palette).toHaveLength(3);
    expect(data.theme.palette).not.toEqual(selectedTheme.palette);
    expect([
      data.theme.decor !== selectedTheme.decor,
      data.theme.entertainment !== selectedTheme.entertainment,
      data.theme.signatureMoment !== selectedTheme.signatureMoment,
    ].filter(Boolean)).toHaveLength(3);
  });

  it("keeps new-theme fallback generation distinct after curated names are exhausted", async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GROQ_API_KEY;
    const request = new Request("http://localhost/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "new",
        prompt: "A garden wedding in Jaipur",
        shownNames: ["Marigold modern", "Garden afterglow", "Playful keepsakes", "Quiet contemporary"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.fallback).toBe(true);
    expect(data.theme.name).toContain("fresh concept");
    expect(data.theme.name).not.toContain("variation");
  });

  it("requires a selected theme for a unique variation", async () => {
    const request = new Request("http://localhost/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "variation", prompt: "A garden wedding" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
