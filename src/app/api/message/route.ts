import { z } from "zod";
import { rateLimitResponse } from "@/lib/ai/rate-limit";
import { generateValidatedJsonWithProvider } from "@/lib/ai/client";
import { formatINR } from "@/lib/engine/format";

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  maxSentences: z.number().int().min(1).max(8).default(2),
  fallbackText: z.string().trim().min(1).max(500).default("Your current plan is still available. Please review its assumptions and confirm details with your providers."),
  inquiry: z.object({
    vendor: z.string().min(1),
    category: z.string().min(1),
    date: z.string().date(),
    guests: z.number().int().nonnegative(),
    city: z.string().min(1),
    budgetMin: z.number().nonnegative(),
    budgetMax: z.number().nonnegative(),
    questions: z.array(z.string().min(1)).length(3),
  }).optional(),
});

const inquirySchema = z.object({ whatsapp: z.string().min(1), email: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "message");
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Please provide a valid explanation request." }, { status: 400 });
  if (parsed.data.inquiry) {
    const inquiry = parsed.data.inquiry;
    const fallback = {
      whatsapp: `Hi! Are you available for our event on ${inquiry.date} in ${inquiry.city} for ${inquiry.guests.toLocaleString("en-IN")} guests? Our estimated budget range is ${formatINR(inquiry.budgetMin)}–${formatINR(inquiry.budgetMax)}. Could you please confirm: ${inquiry.questions.join(" Also, ")} Thanks!`,
      email: `Subject: Availability and estimate request — ${inquiry.date}\n\nHello ${inquiry.vendor},\n\nWe are planning an event in ${inquiry.city} on ${inquiry.date} for ${inquiry.guests.toLocaleString("en-IN")} guests and are looking for ${inquiry.category.toLowerCase()} support. Our estimated budget range is ${formatINR(inquiry.budgetMin)}–${formatINR(inquiry.budgetMax)}.\n\nCould you please let us know:\n1. ${inquiry.questions[0]}\n2. ${inquiry.questions[1]}\n3. ${inquiry.questions[2]}\n\nPlease include your availability, itemized inclusions, and payment/cancellation terms. We understand this is an initial inquiry and will confirm details directly.\n\nThank you.`,
    };
    try {
      const generated = await generateValidatedJsonWithProvider({
        model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
        contents: `Draft a concise ready-to-send WhatsApp message and formal email inquiry for this event. Include vendor ${inquiry.vendor}, date ${inquiry.date}, ${inquiry.guests} guests, ${inquiry.city}, estimated budget INR ${inquiry.budgetMin}-${inquiry.budgetMax}, and these three exact questions: ${inquiry.questions.join(" | ")}. Return JSON with whatsapp and email string fields only.`,
        temperature: 0.3,
        schema: inquirySchema,
      });
      return Response.json({ ...generated.value, fallback: false, provider: generated.provider });
    } catch (error) {
      console.error("Vendor inquiry generation failed across configured providers; using a prepared message:", error);
      return Response.json({ ...inquirySchema.parse(fallback), fallback: true });
    }
  }
  const fallbackExplanation = parsed.data.fallbackText;

  try {
    const generated = await generateValidatedJsonWithProvider({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: `${parsed.data.prompt}\nAnswer in no more than ${parsed.data.maxSentences} short, plain-language sentences. Do not invent calculations or facts.`,
      temperature: 0.3,
      schema: z.object({ text: z.string().trim().min(1) }),
    });
    return Response.json({ ...generated.value, provider: generated.provider });
  } catch (error) {
    console.error("AI message generation failed across configured providers:", error);
    return Response.json({ text: fallbackExplanation, fallback: true });
  }
}
