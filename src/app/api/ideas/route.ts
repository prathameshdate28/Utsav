import { z } from "zod";
import { rateLimitResponse } from "@/lib/ai/rate-limit";
import { generateValidatedJsonWithProvider } from "@/lib/ai/client";

const themeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  palette: z.array(z.string().regex(/^#[\da-fA-F]{6}$/, "Palette colors must be six-digit hex values.")).length(3),
  decor: z.string().trim().min(1).max(500),
  entertainment: z.string().trim().min(1).max(300),
  signatureMoment: z.string().trim().min(1).max(300),
});

const requestSchema = z.object({
  mode: z.enum(["new", "variation"]),
  prompt: z.string().trim().min(1).max(2000),
  shownNames: z.array(z.string().trim().min(1).max(120)).max(50).default([]),
  selectedTheme: themeSchema.optional(),
}).refine(
  (request) => request.mode !== "variation" || request.selectedTheme !== undefined,
  "Choose a theme before asking for a unique variation.",
);

const fallbackThemes = [
  { name: "Marigold modern", palette: ["#7A1F3D", "#F2A900", "#FFF8EE"], decor: "Layered marigolds, warm brass and clean fabric backdrops.", entertainment: "An acoustic set with a lively family playlist.", signatureMoment: "A shared welcome with a favorite family song." },
  { name: "Garden afterglow", palette: ["#0F7C78", "#C9A24B", "#F6EDEA"], decor: "Leafy table details, locally sourced flowers and soft lanterns.", entertainment: "Gentle live music and an open dance floor.", signatureMoment: "A sunset toast with handwritten wishes." },
  { name: "Playful keepsakes", palette: ["#E35D7E", "#FFC53D", "#FFFFFF"], decor: "Colorful paper details, tactile textures and personal photographs.", entertainment: "A short, age-friendly interactive activity.", signatureMoment: "A collaborative keepsake made by guests." },
  { name: "Quiet contemporary", palette: ["#475569", "#0F7C78", "#F6EDEA"], decor: "Minimal greenery, tactile linens and warm low lighting.", entertainment: "A live instrumental duo and relaxed conversation spaces.", signatureMoment: "A shared toast with one-line stories from guests." },
] as const;

function createFallback(mode: "new" | "variation", shownNames: string[], selectedTheme?: z.infer<typeof themeSchema>) {
  const unused = fallbackThemes.find((theme) =>
    !shownNames.some((name) => name.toLowerCase() === theme.name.toLowerCase()),
  );
  if (mode === "variation" && selectedTheme) {
    const palette = fallbackThemes.find((theme) =>
      theme.palette.some((color) => !selectedTheme.palette.includes(color)),
    )?.palette ?? selectedTheme.palette;
    return {
      name: `${selectedTheme.name} · fresh variation`,
      palette: [...palette],
      decor: `A fresh interpretation of ${selectedTheme.name}: ${selectedTheme.decor} Add one unexpected focal detail that reflects the event.`,
      entertainment: `A distinctive twist on ${selectedTheme.entertainment} that invites guests to participate.`,
      signatureMoment: `Reimagine ${selectedTheme.signatureMoment} with a personal detail chosen by the hosts.`,
    };
  }
  const fallback = unused ?? fallbackThemes[shownNames.length % fallbackThemes.length];
  if (unused) return fallback;
  return {
    ...fallback,
    name: `${fallback.name} · fresh concept ${shownNames.length + 1}`,
    decor: `A distinct visual direction: ${fallback.decor}`,
    entertainment: `A new experience built around ${fallback.entertainment.toLowerCase()}`,
    signatureMoment: `A completely new highlight: ${fallback.signatureMoment}`,
  };
}

export async function POST(request: Request): Promise<Response> {
  const limited = rateLimitResponse(request, "ideas");
  if (limited) return limited;
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Choose a theme action and provide a valid event concept." }, { status: 400 });
  }

  const { mode, prompt, shownNames, selectedTheme } = parsed.data;
  const fallback = createFallback(mode, shownNames, selectedTheme);
  const task = mode === "new"
    ? `Create ONE completely new celebration theme for this event: ${prompt}. It must be a distinct concept, not a variation or restatement of the existing themes: ${shownNames.join(", ") || "none"}.`
    : `Create ONE imaginative, clearly differentiated variation of this selected theme for the event: ${prompt}. Selected theme: ${JSON.stringify(selectedTheme)}. Preserve its recognizable core identity, but add a genuinely unexpected visual or experiential idea. Reconsider the palette, decor, entertainment, and signature moment to express that twist. Give the variation a distinct name that still references the selected theme.`;

  try {
    const generated = await generateValidatedJsonWithProvider({
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite",
      contents: `You are a thoughtful event designer. ${task} Choose a cohesive original three-color palette yourself based on the theme. Return each color as a six-digit CSS hex value in #RRGGBB format. Avoid stereotypes and do not invent facts about the event. Return JSON with one theme object containing name, palette (exactly 3 hex colors), decor, entertainment, and signatureMoment.`,
      temperature: 0.8,
      schema: themeSchema,
      validate: (candidate) => {
        const theme = themeSchema.parse(candidate);
        if (
          shownNames.some((name) => name.toLowerCase() === theme.name.toLowerCase())
          || (mode === "variation" && theme.name.toLowerCase() === selectedTheme?.name.toLowerCase())
        ) {
          throw new Error("The generated theme was not distinct enough.");
        }
        if (mode === "variation" && selectedTheme) {
          const changedFields = [
            theme.decor !== selectedTheme.decor,
            theme.entertainment !== selectedTheme.entertainment,
            theme.signatureMoment !== selectedTheme.signatureMoment,
          ].filter(Boolean).length;
          const paletteChanged = theme.palette.some((color, index) => color !== selectedTheme.palette[index]);
          if (changedFields < 2 || !paletteChanged) {
            throw new Error("The generated variation must meaningfully change the selected theme's experience and palette.");
          }
        }
        return theme;
      },
    });
    const theme = generated.value;
    return Response.json({ theme, fallback: false, provider: generated.provider });
  } catch (error) {
    console.error("Theme generation failed; serving a clearly marked local suggestion:", error);
    return Response.json({ theme: fallback, fallback: true });
  }
}
