import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

export type GenerateOptions<T> = {
  model: string;
  contents: string;
  temperature: number;
  schema: z.ZodType<T>;
  validate?: (candidate: unknown) => T;
  timeoutMs?: number;
  retries?: number;
  maxOutputTokens?: number;
};

export type TextProvider = "gemini" | "groq";
export type GeneratedJson<T> = { value: T; provider: TextProvider };

function describeGenerationError(error: unknown): string {
  if (error instanceof z.ZodError) {
    const visibleIssues = error.issues.slice(0, 4).map((issue) => {
      const path = issue.path.map(String).join(".") || "response";
      return `${path}: ${issue.message}`;
    });
    const remaining = error.issues.length - visibleIssues.length;
    return `Response validation failed: ${visibleIssues.join("; ")}${remaining > 0 ? `; and ${remaining} more issue(s)` : ""}`.slice(0, 600);
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 400);
}

function retryDelay(error: unknown, attempt: number, timedOut: boolean): number | null {
  if (timedOut) return 500 * (attempt + 1);
  if (error instanceof ApiError || error instanceof ProviderRequestError) {
    if (error.status === 429) {
      const delayMatch = error.message.match(/retryDelay["']?\s*:\s*["']([\d,.]+)\s*(ms|s|m|h)?/i)
        ?? error.message.match(/retry in ([\d,.]+)\s*(ms|s|m|h)/i);
      if (!delayMatch) {
        return /resource_exhausted|quota exceeded|daily limit|free.?tier|rate.?limit/i.test(error.message)
          ? null
          : 750 * (attempt + 1);
      }
      const value = Number(delayMatch[1].replaceAll(",", ""));
      const multiplier = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 }[
        (delayMatch[2] ?? "s").toLowerCase() as "ms" | "s" | "m" | "h"
      ];
      const delayMs = value * multiplier;
      return delayMs <= 5_000 ? delayMs : null;
    }
    return error.status >= 500 ? 500 * (attempt + 1) : null;
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) return 250;
  return 500 * (attempt + 1);
}

class ProviderRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAndValidate<T>(
  text: string,
  schema: z.ZodType<T>,
  validate?: (candidate: unknown) => T,
): T {
  const withoutFence = text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let index = 0; index < withoutFence.length; index += 1) {
    const character = withoutFence[index];
    if (start < 0) {
      if (character === "{" || character === "[") {
        start = index;
        depth = 1;
      }
      continue;
    }
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") inString = true;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  const candidateText = withoutFence.slice(Math.max(start, 0), end > 0 ? end : undefined);
  let cleaned = "";
  inString = false;
  escaped = false;
  for (let index = 0; index < candidateText.length; index += 1) {
    const character = candidateText[index];
    if (inString) {
      cleaned += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
    } else if (character === "\"") {
      inString = true;
      cleaned += character;
    } else if (character === ",") {
      let next = index + 1;
      while (/\s/.test(candidateText[next] ?? "")) next += 1;
      if (candidateText[next] !== "}" && candidateText[next] !== "]") cleaned += character;
    } else {
      cleaned += character;
    }
  }

  const candidate: unknown = JSON.parse(cleaned);
  return validate ? validate(candidate) : schema.parse(candidate);
}

function repairPrompt(contents: string, issue: string): string {
  return `${contents}\n\nREPAIR REQUIRED: The previous complete response failed parsing or validation: ${issue}. Return the entire value again as strict JSON only. Do not use markdown, comments, trailing commas, or omit fields. Keep text fields concise and preserve every required item and exact count. Ensure all strings and JSON brackets are fully closed.`;
}

async function generateWithGemini<T>(
  options: GenerateOptions<T>,
  apiKey: string,
): Promise<T> {
  const client = new GoogleGenAI({ apiKey });
  let issue = "No response";
  const retries = options.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    try {
      timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
      const response = await client.models.generateContent({
        model: options.model,
        contents: attempt === 0
          ? options.contents
          : repairPrompt(options.contents, issue),
        config: {
          temperature: options.temperature,
          responseMimeType: "application/json",
          maxOutputTokens: options.maxOutputTokens ?? 8_192,
          abortSignal: controller.signal,
        },
      });
      if (!response.text) throw new Error("Gemini returned an empty response.");
      return parseAndValidate(response.text, options.schema, options.validate);
    } catch (error) {
      const timedOut = controller.signal.aborted;
      issue = timedOut
        ? `Gemini request timed out after ${options.timeoutMs ?? 20_000}ms.`
        : describeGenerationError(error);
      const delay = attempt < retries ? retryDelay(error, attempt, timedOut) : null;
      if (delay === null) {
        throw new Error(`Gemini failed after ${attempt + 1} attempt(s): ${issue}`);
      }
      if (timer) clearTimeout(timer);
      timer = undefined;
      await wait(delay);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw new Error(`Gemini output could not be validated: ${issue}`);
}

async function generateWithGroq<T>(options: GenerateOptions<T>, apiKey: string): Promise<T> {
  const retries = options.retries ?? 1;
  let issue = "No response";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? 20_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b",
          messages: [{
            role: "user",
            content: attempt === 0
              ? `${options.contents}\n\nReturn one complete strict JSON value only. Do not use markdown, comments, or trailing commas. Keep text fields concise and ensure every JSON string and bracket is fully closed.`
              : repairPrompt(options.contents, issue),
          }],
          temperature: Math.min(options.temperature, 1),
          max_completion_tokens: options.maxOutputTokens ?? 8_192,
        }),
        signal: controller.signal,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail = typeof result === "object" && result !== null && "error" in result
          ? JSON.stringify(result.error)
          : `HTTP ${response.status}`;
        throw new ProviderRequestError(`Groq request failed: ${detail.slice(0, 400)}`, response.status);
      }
      if (
        typeof result !== "object"
        || result === null
        || !("choices" in result)
        || !Array.isArray(result.choices)
      ) {
        throw new Error("Groq returned an invalid chat response.");
      }
      const content = result.choices[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Groq returned an empty response.");
      }
      if (result.choices[0]?.finish_reason === "length") {
        throw new Error("Groq response reached its output-token limit before the JSON was complete.");
      }
      return parseAndValidate(content, options.schema, options.validate);
    } catch (error) {
      issue = controller.signal.aborted
        ? `Groq request timed out after ${timeoutMs}ms.`
        : describeGenerationError(error);
      const delay = attempt < retries ? retryDelay(error, attempt, controller.signal.aborted) : null;
      if (delay === null) throw new Error(`Groq failed after ${attempt + 1} attempt(s): ${issue}`);
      await wait(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Groq output could not be validated: ${issue}`);
}

export async function generateValidatedJsonWithProvider<T>(
  options: GenerateOptions<T>,
): Promise<GeneratedJson<T>> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!geminiKey && !groqKey) {
    throw new Error("No AI text provider is configured. Set GEMINI_API_KEY and/or GROQ_API_KEY in .env.local.");
  }

  const errors: string[] = [];
  if (geminiKey) {
    try {
      return { value: await generateWithGemini(options, geminiKey), provider: "gemini" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      console.error("Gemini generation failed; trying the Groq backup:", message);
    }
  }
  if (groqKey) {
    try {
      return { value: await generateWithGroq(options, groqKey), provider: "groq" };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join(" | "));
}

export async function generateValidatedJson<T>(options: GenerateOptions<T>): Promise<T> {
  const result = await generateValidatedJsonWithProvider(options);
  return result.value;
}
