import { copyFile as copyFileAsync, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { blueprintSchema } from "../src/lib/schemas/blueprint";
import { createFallbackBlueprint } from "../src/lib/ai/fallback";
import { normalizeBlueprint } from "../src/lib/ai/normalize";

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";
const SCENARIOS = [
  {
    name: "jaipur-wedding",
    prompt: "My sister's wedding in Jaipur, 300 guests, ₹25 lakh, February, mix of traditional and modern",
  },
  {
    name: "pune-birthday",
    prompt: "A 5th birthday for my daughter in Pune, 40 guests, ₹60,000, she loves dinosaurs and butterflies",
  },
  {
    name: "thane-community",
    prompt: "Society Ganesh Utsav in Thane, 400 residents, ₹2 lakh, eco-friendly",
  },
] as const;

const critiqueSchema = z.object({
  score: z.number().int().min(0).max(100),
  strengths: z.array(z.string().trim().min(1)).min(1),
  improvements: z.array(z.string().trim().min(1)).min(1),
});

const tiles = ["entrance", "stage", "table", "lighting", "florals", "signature-moment"] as const;
type Blueprint = z.infer<typeof blueprintSchema>;

async function generateJson<S extends z.ZodType>(
  client: GoogleGenAI,
  model: string,
  prompt: string,
  schema: S,
  label: string,
  normalize?: (candidate: unknown) => z.infer<S>,
): Promise<z.infer<S>> {
  let issue = "No response";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await client.models.generateContent({
      model,
      contents:
        attempt === 1
          ? prompt
          : `${prompt}\n\nThe previous response was invalid: ${issue}. Return corrected JSON only.`,
      config: { temperature: 0.3, responseMimeType: "application/json" },
    });
    const text = response.text;
    if (!text) {
      issue = "empty model response";
      continue;
    }
    try {
      const candidate = JSON.parse(text) as unknown;
      return normalize ? normalize(candidate) : schema.parse(candidate);
    } catch (error) {
      issue = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`${label} did not pass validation after one regeneration: ${issue}`);
}

function planPrompt(prompt: string): string {
  return `Create an Indian celebration planning blueprint for this request: "${prompt}".
Return JSON only and follow the exact Blueprint structure. Include eventType, event (title, city, ISO date, guests, concept, accentColor), budget (integer total, baseGuests, categories), timeline, vendorCategories, ideas, and assumptions.
Include 10 to 14 budget categories. Every category has id, name, amount 0 (placeholder), share, kind (per_head, fixed, or semi), isEstimate true, saveTip, hiddenCostWarnings. Shares must add to exactly 100. The application calculates category amounts; do not calculate them.
Include 20 to 30 timeline tasks. Each task has id, title, phase (6 months, 3 months, 1 month, 1 week, day-of), leadTimeDays, ownerRole, reason, dependencies (task IDs), completed false. Dependencies must exist and be acyclic.
Include 8 to 12 vendorCategories with name, bookByDays, mustAskQuestions, redFlags, and exactly eight fictional shortlist vendors each with id, name, tier, priceMin, priceMax, rating, tags.
Include at least three ceremonies with name, order, durationMin, itemsNeeded, responsibleRole, neutral two-sentence meaning, completed false, and exactly six moodboard tiles (id, caption, prompt).
Include at least 3 distinct ideas.themes with name, palette, decor, entertainment, signatureMoment; ideas.menu with named dishes and dietaryTags; ideas.invitations with warm and formal text.
Use neutral, accessible language. Keep all price suggestions estimates and avoid real vendor identities. Never invent precise religious requirements.`;
}

async function critique(
  client: GoogleGenAI,
  model: string,
  plan: Blueprint,
  prompt: string,
): Promise<z.infer<typeof critiqueSchema>> {
  return generateJson(
    client,
    model,
    `Critique this event plan for fit to the request, cultural respect, actionable tasks, budget-share validity, and internal consistency. Do not recalculate totals. Return JSON with score (0-100 integer), strengths (array), improvements (array). Request: ${prompt}\nPlan: ${JSON.stringify(plan)}`,
    critiqueSchema,
    "Plan critique",
  );
}

async function generateImages(
  client: GoogleGenAI,
  imageModel: string,
  scenario: (typeof SCENARIOS)[number],
  plan: Blueprint,
  publicDirectory: string,
): Promise<string[]> {
  const imageDirectory = path.join(publicDirectory, scenario.name);
  await mkdir(imageDirectory, { recursive: true });
  const palette = plan.ideas.themes[0].palette.join(", ");
  const stylePrefix = `Locked visual style for this complete set: palette ${palette}; warm natural festive lighting with gentle golden highlights; editorial 35mm film photography, soft grain, realistic Indian event styling, same color grade and camera style across every image. `;
  const failures: string[] = [];

  for (const tile of tiles) {
    const prompt = `${stylePrefix}Create one polished, unlettered mood-board photograph for a ${scenario.prompt}. Subject: ${tile.replaceAll("-", " ")}. Avoid text, logos, identifiable real people, and vendor branding.`;
    try {
      const response = await client.models.generateContent({
        model: imageModel,
        contents: prompt,
        config: { responseModalities: ["TEXT", "IMAGE"], temperature: 0.3 },
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
      if (!imagePart?.inlineData?.data) {
        throw new Error("Gemini returned no image data.");
      }
      const extension = imagePart.inlineData.mimeType?.includes("jpeg") ? "jpg" : "png";
      const imagePath = path.join(imageDirectory, `${tile}.${extension}`);
      await writeFile(imagePath, Buffer.from(imagePart.inlineData.data, "base64"));
      console.info(`Saved mood-board tile: ${imagePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${scenario.name}/${tile}: ${message}`);
      console.error(`Mood-board tile generation failed for ${scenario.name}/${tile}: ${message}`);
    }
  }
  return failures;
}

async function copyRun(runFile: string, name: string, demoDirectory: string): Promise<void> {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error("Demo name must contain only lowercase letters, digits, and hyphens.");
  }
  const runDirectory = path.resolve(demoDirectory, "_runs");
  const source = path.resolve(runFile);
  if (!source.startsWith(`${runDirectory}${path.sep}`)) {
    throw new Error("Choose a run file located inside data/demo/_runs/.");
  }
  const parsed = JSON.parse(await readFile(source, "utf8")) as { plan?: unknown };
  const plan = blueprintSchema.parse(parsed.plan);
  await mkdir(demoDirectory, { recursive: true });
  const target = path.join(demoDirectory, `${name}.json`);
  await writeFile(target, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.info(`Validated selected run and copied it to ${target}`);
}

function optionValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const args = process.argv.slice(2);
  const demoDirectory = path.join(process.cwd(), "data", "demo");
  const selectedRunPath = optionValue(args, "--copy");
  if (selectedRunPath) {
    const name = optionValue(args, "--name");
    if (!name) throw new Error("--copy requires --name <demo-name>.");
    await copyRun(selectedRunPath, name, demoDirectory);
    return;
  }

  if (args.includes("--offline")) {
    const offlineCount = Number(optionValue(args, "--count") ?? "1");
    if (!Number.isInteger(offlineCount) || offlineCount < 1 || offlineCount > 20) {
      throw new Error("--count must be an integer from 1 to 20.");
    }
    await mkdir(demoDirectory, { recursive: true });
    const runDirectory = path.join(demoDirectory, "_runs");
    await mkdir(runDirectory, { recursive: true });
    const publicDemoDirectory = path.join(process.cwd(), "public", "demo");
    const fallbackDirectory = path.join(publicDemoDirectory, "fallback");
    const imageNames = ["entrance", "stage", "tables", "lighting", "florals", "signature-moment"] as const;
    for (const scenario of SCENARIOS) {
      const scenarioRuns = path.join(runDirectory, scenario.name);
      await mkdir(scenarioRuns, { recursive: true });
      let plan = blueprintSchema.parse(createFallbackBlueprint(scenario.prompt));
      const critique = {
        score: 82,
        strengths: ["Event details are parsed from the prompt.", "Budget shares and amounts validate deterministically.", "Timeline, fictional vendors, ideas, ceremonies and mood-board tiles are present."],
        improvements: ["Replace the generic offline copy with personalized Gemini critique and refinement when a key is available.", "Verify local prices and event traditions with the family."],
      };
      for (let index = 1; index <= offlineCount; index += 1) {
        const refinedPlan = normalizeBlueprint(plan);
        const runPath = path.join(scenarioRuns, `run-${String(index).padStart(2, "0")}.json`);
        await writeFile(runPath, `${JSON.stringify({
          scenario: scenario.name,
          run: index,
          prompt: scenario.prompt,
          score: critique.score,
          critique: { initial: critique, final: critique },
          plan: refinedPlan,
          offlineFallback: true,
        }, null, 2)}\n`, "utf8");
        plan = refinedPlan;
        console.info(`Saved deterministic offline run ${index}/${offlineCount}: ${runPath}`);
      }
      const output = path.join(demoDirectory, `${scenario.name}.json`);
      await writeFile(output, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
      console.info(`Generated deterministic offline fallback: ${output}`);
      const scenarioImages = path.join(publicDemoDirectory, scenario.name);
      await mkdir(scenarioImages, { recursive: true });
      for (const image of imageNames) {
        await copyFileAsync(path.join(fallbackDirectory, `${image}.svg`), path.join(scenarioImages, `${image}.svg`));
      }
    }
    return;
  }

  const count = Number(optionValue(args, "--count") ?? "1");
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error("--count must be an integer from 1 to 20.");
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for demo generation.");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const imageModel = process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  const client = new GoogleGenAI({ apiKey });
  const runDirectory = path.join(demoDirectory, "_runs");
  await mkdir(runDirectory, { recursive: true });

  for (const scenario of SCENARIOS) {
    const scenarioRuns = path.join(runDirectory, scenario.name);
    await mkdir(scenarioRuns, { recursive: true });
    let bestPlan: Blueprint | undefined;
    let bestScore = -1;
    for (let index = 1; index <= count; index += 1) {
      console.info(`Generating ${scenario.name}, run ${index}/${count}...`);
      const initialPlan = await generateJson(
        client,
        model,
        planPrompt(scenario.prompt),
        blueprintSchema,
        `${scenario.name} initial plan`,
        normalizeBlueprint,
      );
      const firstCritique = await critique(client, model, initialPlan, scenario.prompt);
      const refinedPlan = await generateJson(
        client,
        model,
        `Refine this plan using the critique. Return the complete corrected Blueprint JSON only. Request: ${scenario.prompt}\nCritique: ${JSON.stringify(firstCritique)}\nPlan: ${JSON.stringify(initialPlan)}\nKeep budget amounts consistent with their total, preserve a 100% share, and preserve valid task dependencies.`,
        blueprintSchema,
        `${scenario.name} refined plan`,
        normalizeBlueprint,
      );
      const finalCritique = await critique(client, model, refinedPlan, scenario.prompt);
      const run = {
        scenario: scenario.name,
        run: index,
        prompt: scenario.prompt,
        score: finalCritique.score,
        critique: { initial: firstCritique, final: finalCritique },
        plan: refinedPlan,
      };
      const runPath = path.join(scenarioRuns, `run-${String(index).padStart(2, "0")}.json`);
      await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
      console.info(`Saved score ${finalCritique.score}/100: ${runPath}`);
      if (finalCritique.score > bestScore) {
        bestPlan = refinedPlan;
        bestScore = finalCritique.score;
      }
    }
    if (bestPlan) {
      const failures = await generateImages(client, imageModel, scenario, bestPlan, path.join(process.cwd(), "public", "demo"));
      if (failures.length > 0) {
        console.warn(`${failures.length} mood-board image(s) failed for ${scenario.name}; see errors above.`);
      }
    }
  }
  console.info(`Generated ${SCENARIOS.length * count} scored runs. Review data/demo/_runs/ and promote a selection with --copy <run-file> --name <name>.`);
}

main().catch((error: unknown) => {
  console.error("Demo generation failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
