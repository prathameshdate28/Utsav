import { z } from "zod";
import { rateLimitResponse } from "@/lib/ai/rate-limit";
import { generateValidatedJsonWithProvider } from "@/lib/ai/client";

const requestSchema = z.object({
  language: z.enum(["hi", "sa"]),
  texts: z.array(z.string().trim().min(1).max(1200)).min(1).max(80),
});

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "translate");
  if (limited) return limited;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Please provide a valid batch of page text to translate." }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.GROQ_API_KEY?.trim()) {
    return Response.json(
      { error: "Page translation requires GEMINI_API_KEY and/or GROQ_API_KEY. Configure a text provider on the server and try again." },
      { status: 503 },
    );
  }

  const languageName = parsed.data.language === "hi" ? "Hindi" : "Sanskrit";
  const schema = z.object({
    translations: z.array(z.string().trim().min(1).max(1800)).length(parsed.data.texts.length),
  });

  try {
    const generated = await generateValidatedJsonWithProvider({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: `Translate each string in this JSON array into natural, readable ${languageName}, using Devanagari script. Return a JSON object with a translations array in the exact same order and with exactly ${parsed.data.texts.length} strings. Preserve meaning, punctuation, numbers, dates, currency amounts, URLs, product names, personal names, and any placeholder tokens. Do not omit, combine, explain, or add text. Translate labels and descriptions as well as sentences. Source strings: ${JSON.stringify(parsed.data.texts)}`,
      temperature: 0.1,
      schema,
    });
    return Response.json({ ...generated.value, provider: generated.provider });
  } catch (error) {
    console.error(`${languageName} page translation failed:`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "The configured text providers could not translate this page." },
      { status: 502 },
    );
  }
}
