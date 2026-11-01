import { z } from "zod";
import { createFallbackBlueprint } from "@/lib/ai/fallback";
import { rateLimitResponse } from "@/lib/ai/rate-limit";
import { normalizeBlueprint } from "@/lib/ai/normalize";
import { generateValidatedJsonWithProvider } from "@/lib/ai/client";
import { preparePlanPrompt } from "@/lib/ai/plan-prompt";
import { findIncompletePlanFields } from "@/lib/ai/validate-generated-plan";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import { localISODate, reflow } from "@/lib/engine/planner";

const requestSchema = z.object({
  prompt: z.string().trim().min(12).max(2000),
});

function failureNotice(): string {
  return "Your editable plan is ready as a starting point. You can refine it now or try AI generation again later.";
}

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "plan");
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Please describe your event in at least 12 characters." }, { status: 400 });
  }
  const fallbackBlueprint = createFallbackBlueprint(parsed.data.prompt);
  const fallbackPlan = reflow(fallbackBlueprint, fallbackBlueprint.event.date, localISODate());
  const prompt = preparePlanPrompt(parsed.data.prompt, fallbackPlan);

  const fallback = (notice: string) =>
    Response.json({
      plan: fallbackPlan,
      fallback: true,
      notice,
    });
  try {
    const generated = await generateValidatedJsonWithProvider({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: prompt,
      temperature: 0.3,
      schema: blueprintSchema,
      validate: (candidate) => {
        const missing = findIncompletePlanFields(candidate, fallbackPlan);
        if (missing.length > 0) {
          throw new Error(`The plan is incomplete: ${missing.join("; ")}. Regenerate the entire JSON object and include every required field.`);
        }
        const normalized = normalizeBlueprint(candidate, {
          total: fallbackPlan.budget.total,
          baseGuests: fallbackPlan.budget.baseGuests,
        }, fallbackPlan);
        return reflow(normalized, normalized.event.date, localISODate());
      },
      timeoutMs: 90_000,
      retries: 2,
      maxOutputTokens: 32_768,
    });
    const providerName = generated.provider === "groq" ? "Groq (backup)" : "Gemini";
    return Response.json({
      plan: generated.value,
      fallback: false,
      provider: generated.provider,
      notice: `AI-generated draft by ${providerName}. Utsav calculates budget totals and due dates in code.`,
    });
  } catch (error) {
    console.error("Plan generation failed after retry; using a local fallback:", error);
    return fallback(failureNotice());
  }
}
