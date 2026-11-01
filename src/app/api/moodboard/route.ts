import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { rateLimitResponse } from "@/lib/ai/rate-limit";
import { generateOpenRouterImage } from "@/lib/ai/openrouter-image";

const FALLBACK_CAPTIONS = ["Entrance", "Stage", "Tables", "Lighting", "Florals", "Signature moment"] as const;
const FALLBACK_NOTICE = "We're showing a curated visual for this tile. You can try generating it again later.";

const requestSchema = z.object({
  caption: z.string().trim().min(1).max(100),
  fallbackCaption: z.enum(FALLBACK_CAPTIONS).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  palette: z.array(z.string().regex(/^#[\da-fA-F]{6}$/)).min(3).max(8),
  prompt: z.string().trim().min(1).max(1000),
});

function describeImageGenerationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    error instanceof ApiError && error.status === 429
    || /429|quota|resource_exhausted|rate.?limit/i.test(message)
  ) {
    return "Gemini image quota is exhausted for the configured model. Check image-generation quota and billing in Google AI Studio before retrying.";
  }
  try {
    const parsed: unknown = JSON.parse(message);
    if (
      typeof parsed === "object"
      && parsed !== null
      && "error" in parsed
      && typeof parsed.error === "object"
      && parsed.error !== null
      && "message" in parsed.error
      && typeof parsed.error.message === "string"
    ) {
      return parsed.error.message.slice(0, 300);
    }
  } catch {
    return message.slice(0, 300);
  }
  return message.slice(0, 300);
}

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "moodboard");
  if (limited) return limited;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please choose a valid mood-board tile and palette." }, { status: 400 });
  const fallbackCaption = parsed.data.fallbackCaption
    ?? (parsed.data.caption === "Theme inspiration" ? "Florals" : parsed.data.caption);
  const knownFallbackCaption = FALLBACK_CAPTIONS.find((caption) => caption === fallbackCaption) ?? "Florals";
  const tile = knownFallbackCaption.toLowerCase().replaceAll(" ", "-");
  const location = (parsed.data.city ?? parsed.data.prompt).toLowerCase();
  const scenarioDirectory = location.includes("pune")
    ? "pune-birthday"
    : location.includes("thane")
      ? "thane-community"
      : "jaipur-wedding";
  const fallbackUrl = `/demo/${scenarioDirectory}/${encodeURIComponent(tile)}.svg`;
  let fallbackReason: "not_configured" | "quota" | "unavailable" = "not_configured";
  let issue = "Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is configured.";
  const prompt = `Locked style prefix: palette ${parsed.data.palette.join(", ")}; warm natural golden-hour lighting; editorial 35mm film photography with soft grain, consistent composition and color grade. ${parsed.data.prompt}. Subject: ${parsed.data.caption}. No text, logos, or identifiable real people.`;
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (geminiKey) {
    fallbackReason = "unavailable";
    issue = "Gemini image generation failed.";
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Image generation exceeded the 20-second limit.")), 20_000);
        });
        const generation = new GoogleGenAI({ apiKey: geminiKey }).models.generateContent({
          model: process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image",
          contents: `${prompt}${attempt === 2 ? ` Retry instruction: the prior attempt failed: ${issue}. Return one image only.` : ""}`,
          config: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.3 },
        });
        const response = await Promise.race([generation, timeout]);
        const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
        if (!image?.data) throw new Error("Image generation returned no image.");
        return Response.json({
          imageUrl: `data:${image.mimeType || "image/png"};base64,${image.data}`,
          fallback: false,
          provider: "gemini",
        });
      } catch (error) {
        issue = describeImageGenerationError(error);
        console.error(`Mood-board Gemini image attempt ${attempt} failed:`, error);
        if (
          error instanceof ApiError && error.status === 429
          || /quota|resource_exhausted|rate.?limit/i.test(issue)
        ) {
          fallbackReason = "quota";
          break;
        }
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  if (process.env.OPENROUTER_API_KEY?.trim()) {
    try {
      const imageUrl = await generateOpenRouterImage(prompt, new URL(request.url).origin);
      return Response.json({ imageUrl, fallback: false, provider: "openrouter" });
    } catch (error) {
      const openRouterIssue = error instanceof Error ? error.message : String(error);
      console.error("OpenRouter image backup failed:", openRouterIssue);
      return Response.json({
        imageUrl: fallbackUrl,
        fallback: true,
        fallbackReason: "unavailable",
        error: FALLBACK_NOTICE,
      });
    }
  }

  if (!geminiKey) {
    return Response.json({
      imageUrl: fallbackUrl,
      fallback: true,
      fallbackReason: "not_configured",
      error: FALLBACK_NOTICE,
    });
  }
  console.error("Mood-board image generation failed; serving a curated visual:", issue);
  return Response.json({ imageUrl: fallbackUrl, fallback: true, fallbackReason, error: FALLBACK_NOTICE });
}
