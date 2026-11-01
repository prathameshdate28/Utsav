import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { geminiGenerate } = vi.hoisted(() => ({ geminiGenerate: vi.fn() }));

vi.mock("@google/genai", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(options: { status?: number; message?: string } = {}) {
      super(options.message);
      this.status = options.status ?? 500;
    }
  },
  GoogleGenAI: class GoogleGenAI {
    models = { generateContent: geminiGenerate };
    apiKey: string;
    constructor(options: { apiKey: string }) {
      this.apiKey = options.apiKey;
    }
  },
}));

import { generateValidatedJsonWithProvider } from "./client";

const originalGeminiKey = process.env.GEMINI_API_KEY;
const originalGroqKey = process.env.GROQ_API_KEY;
const originalGroqModel = process.env.GROQ_MODEL;
const resultSchema = z.object({ text: z.string() });

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-gemini-key";
  process.env.GROQ_API_KEY = "test-groq-key";
  delete process.env.GROQ_MODEL;
  geminiGenerate.mockReset();
});

afterEach(() => {
  if (originalGeminiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiKey;
  if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalGroqKey;
  if (originalGroqModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = originalGroqModel;
  vi.unstubAllGlobals();
});

describe("text provider failover", () => {
  it("uses Groq and validates its response when Gemini fails", async () => {
    geminiGenerate.mockRejectedValue(new Error("Gemini quota exhausted."));
    const groqFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ text: "Created by backup." }) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", groqFetch);

    const result = await generateValidatedJsonWithProvider({
      model: "test-gemini-model",
      contents: "Return an object with a text field.",
      temperature: 0.2,
      schema: resultSchema,
      retries: 0,
      maxOutputTokens: 1_600,
    });

    expect(result).toEqual({ value: { text: "Created by backup." }, provider: "groq" });
    expect(groqFetch).toHaveBeenCalledOnce();
    expect(groqFetch.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    const request = groqFetch.mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer test-groq-key");
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "openai/gpt-oss-20b",
      max_completion_tokens: 1_600,
    });
  });

  it("extracts JSON wrapped in prose and repairs truncated output", async () => {
    geminiGenerate.mockRejectedValue(new Error("Gemini quota exhausted."));
    const groqFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: '{"text":"unfinished' }, finish_reason: "length" }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{
          message: { content: 'Here is the result:\n```json\n{"text":"repaired",}\n```' },
          finish_reason: "stop",
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", groqFetch);

    const result = await generateValidatedJsonWithProvider({
      model: "test-gemini-model",
      contents: "Return an object with a text field.",
      temperature: 0.2,
      schema: resultSchema,
      retries: 1,
    });

    expect(result).toEqual({ value: { text: "repaired" }, provider: "groq" });
    expect(groqFetch).toHaveBeenCalledTimes(2);
    const retryRequest = JSON.parse(String(groqFetch.mock.calls[1][1].body));
    expect(retryRequest.messages[0].content).toContain("REPAIR REQUIRED");
    expect(retryRequest).not.toHaveProperty("response_format");
  });

  it("does not call Groq when Gemini succeeds", async () => {
    geminiGenerate.mockResolvedValue({ text: JSON.stringify({ text: "Created by Gemini." }) });
    const groqFetch = vi.fn();
    vi.stubGlobal("fetch", groqFetch);

    const result = await generateValidatedJsonWithProvider({
      model: "test-gemini-model",
      contents: "Return an object with a text field.",
      temperature: 0.2,
      schema: resultSchema,
      retries: 0,
    });

    expect(result).toEqual({ value: { text: "Created by Gemini." }, provider: "gemini" });
    expect(geminiGenerate.mock.calls[0][0].config.maxOutputTokens).toBe(8_192);
    expect(groqFetch).not.toHaveBeenCalled();
  });
});
