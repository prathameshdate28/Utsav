import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Jaipur",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Nagpur",
] as const;

const TIERS = ["budget", "mid", "premium"] as const;

const COMMUNITIES = [
  "Gujarati",
  "Punjabi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Marathi",
  "Malayali",
  "Muslim Nikah",
  "Christian",
  "Sikh Anand Karaj",
] as const;

const VENDOR_CATEGORIES = [
  "Catering",
  "Venue",
  "Decor",
  "Photography",
  "DJ/Music",
  "Makeup",
  "Mehendi",
] as const;

const TEMPLATE_TYPES = ["wedding", "birthday", "community"] as const;
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TEMPERATURE = 0.3;

const estimateRangeSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
  isEstimate: z.literal(true),
});

const seasonMultiplierSchema = z.object({
  multiplier: z.number().finite(),
  isEstimate: z.literal(true),
});

const tierBenchmarkSchema = z.object({
  tier: z.enum(TIERS),
  cateringPerPlate: estimateRangeSchema,
  venuePerDay: estimateRangeSchema,
  decor: estimateRangeSchema,
  photography: estimateRangeSchema,
  djMusic: estimateRangeSchema,
  makeup: estimateRangeSchema,
  mehendi: estimateRangeSchema,
  seasonMultipliers: z.object({
    peak: seasonMultiplierSchema,
    offPeak: seasonMultiplierSchema,
    monsoon: seasonMultiplierSchema,
  }),
});

const benchmarksSchema = z.object({
  currency: z.literal("INR"),
  cities: z
    .array(
      z.object({
        city: z.enum(CITIES),
        tiers: z.array(tierBenchmarkSchema).length(TIERS.length),
      }),
    )
    .length(CITIES.length),
});

function hasTwoSentences(text: string): boolean {
  return (text.match(/[.!?](?:["')\]]*)?(?=\s|$)/g) ?? []).length === 2;
}

const ritualSchema = z.object({
  name: z.string().trim().min(1),
  durationMin: z.number().int().positive(),
  itemsNeeded: z.array(z.string().trim().min(1)).min(1),
  responsibleRole: z.string().trim().min(1),
  meaning: z
    .string()
    .trim()
    .refine(hasTwoSentences, "Meaning must be exactly two plain-language sentences."),
});

const ritualsSchema = z.object({
  communities: z
    .array(
      z.object({
        community: z.enum(COMMUNITIES),
        ceremonies: z.array(ritualSchema).min(1),
      }),
    )
    .length(COMMUNITIES.length),
});

const templateTaskSchema = z.object({
  title: z.string().trim().min(1),
  leadTimeDays: z.number().int().nonnegative(),
});

const eventTemplateSchema = z.object({
  eventType: z.enum(TEMPLATE_TYPES),
  phases: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        tasks: z.array(templateTaskSchema).min(1),
        hiddenCostWarnings: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .min(3),
  vendorCategories: z
    .array(
      z.object({
        category: z.enum(VENDOR_CATEGORIES),
        mustAskQuestions: z.array(z.string().trim().min(1)).min(1),
        redFlags: z.array(z.string().trim().min(1)).min(1),
      }),
    )
    .min(1)
    .refine(
      (categories) =>
        new Set(categories.map(({ category }) => category)).size === categories.length,
      "Vendor categories must be unique.",
    ),
});

const templatesSchema = z.object({
  wedding: eventTemplateSchema,
  birthday: eventTemplateSchema,
  community: eventTemplateSchema,
}).superRefine((templates, context) => {
  for (const type of TEMPLATE_TYPES) {
    if (templates[type].eventType !== type) {
      context.addIssue({
        code: "custom",
        path: [type, "eventType"],
        message: `eventType must be "${type}".`,
      });
    }
  }
});

const generatedVendorSchema = z.object({
  tier: z.enum(TIERS),
  priceRange: estimateRangeSchema,
  rating: z.number().min(1).max(5),
  tags: z.array(z.string().trim().min(1)).min(2).max(6),
});

const vendorCitySchema = z.object({
  categories: z
    .array(
      z.object({
        category: z.enum(VENDOR_CATEGORIES),
        vendors: z.array(generatedVendorSchema).length(8),
      }),
    )
    .length(VENDOR_CATEGORIES.length),
});

const vendorsSchema = z.object({
  currency: z.literal("INR"),
  cities: z
    .array(
      z.object({
        city: z.enum(CITIES),
        categories: z
          .array(
            z.object({
              category: z.enum(VENDOR_CATEGORIES),
              vendors: z
                .array(
                  z.object({
                    name: z.string().trim().min(1),
                    ...generatedVendorSchema.shape,
                  }),
                )
                .length(8),
            }),
          )
          .length(VENDOR_CATEGORIES.length),
      }),
    )
    .length(CITIES.length),
});

type Benchmarks = z.infer<typeof benchmarksSchema>;
type Rituals = z.infer<typeof ritualsSchema>;
type EventTemplate = z.infer<typeof eventTemplateSchema>;
type GeneratedVendor = z.infer<typeof generatedVendorSchema>;

function canonicalizeBenchmarks(data: Benchmarks): Benchmarks {
  return {
    currency: "INR",
    cities: [...data.cities]
      .sort((left, right) => CITIES.indexOf(left.city) - CITIES.indexOf(right.city))
      .map((city) => ({
        city: city.city,
        tiers: [...city.tiers]
          .sort((left, right) => TIERS.indexOf(left.tier) - TIERS.indexOf(right.tier))
          .map((tier) => ({
            tier: tier.tier,
            cateringPerPlate: tier.cateringPerPlate,
            venuePerDay: tier.venuePerDay,
            decor: tier.decor,
            photography: tier.photography,
            djMusic: tier.djMusic,
            makeup: tier.makeup,
            mehendi: tier.mehendi,
            seasonMultipliers: tier.seasonMultipliers,
          })),
      })),
  };
}

function canonicalizeRituals(data: Rituals): Rituals {
  return {
    communities: COMMUNITIES.map((community) => {
      const entry = data.communities.find((item) => item.community === community);

      if (!entry) {
        throw new Error(`Missing rituals for ${community}.`);
      }

      return entry;
    }),
  };
}

function assertUniqueValues(
  label: string,
  values: readonly string[],
  expected: readonly string[],
): void {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  const missing = expected.filter((value) => !values.includes(value));

  if (duplicates.length > 0 || missing.length > 0) {
    throw new Error(
      `${label} has duplicate values (${duplicates.join(", ") || "none"}) or missing values (${missing.join(", ") || "none"}).`,
    );
  }
}

function assertBenchmarkCoverage(data: Benchmarks): void {
  assertUniqueValues(
    "Benchmark cities",
    data.cities.map(({ city }) => city),
    CITIES,
  );

  for (const city of data.cities) {
    assertUniqueValues(
      `${city.city} benchmark tiers`,
      city.tiers.map(({ tier }) => tier),
      TIERS,
    );
  }
}

function assertRitualCoverage(data: Rituals): void {
  assertUniqueValues(
    "Ritual communities",
    data.communities.map(({ community }) => community),
    COMMUNITIES,
  );
}

function assertVendorCoverage(
  city: string,
  categories: z.infer<typeof vendorCitySchema>["categories"],
): void {
  assertUniqueValues(
    `${city} vendor categories`,
    categories.map(({ category }) => category),
    VENDOR_CATEGORIES,
  );
}

function assertRange(
  label: string,
  range: { min: number; max: number },
  issues: string[],
): void {
  if (range.min < 0 || range.max < 0) {
    issues.push(`${label} has a negative price.`);
  }

  if (range.min > range.max) {
    issues.push(`${label} has a minimum greater than its maximum.`);
  }
}

function assertSeedSanity(
  benchmarks: Benchmarks,
  vendors: {
    cities: {
      city: string;
      categories: { category: string; vendors: GeneratedVendor[] }[];
    }[];
  },
): void {
  const issues: string[] = [];
  const priceFields = [
    "cateringPerPlate",
    "venuePerDay",
    "decor",
    "photography",
    "djMusic",
    "makeup",
    "mehendi",
  ] as const;

  for (const city of benchmarks.cities) {
    for (const tier of city.tiers) {
      for (const field of priceFields) {
        assertRange(
          `benchmarks.${city.city}.${tier.tier}.${field}`,
          tier[field],
          issues,
        );
      }

      for (const [season, estimate] of Object.entries(tier.seasonMultipliers)) {
        if (estimate.multiplier < 0) {
          issues.push(
            `benchmarks.${city.city}.${tier.tier}.${season} has a negative multiplier.`,
          );
        }
      }
    }
  }

  for (const city of vendors.cities) {
    for (const category of city.categories) {
      category.vendors.forEach((vendor, index) => {
        assertRange(
          `vendors.${city.city}.${category.category}[${index}]`,
          vendor.priceRange,
          issues,
        );
      });
    }
  }

  if (issues.length > 0) {
    throw new Error(`Seed sanity check failed:\n- ${issues.join("\n- ")}`);
  }
}

function assertBenchmarkPlausibility(data: Benchmarks): void {
  const issues: string[] = [];
  const limits = {
    cateringPerPlate: 100_000,
    venuePerDay: 100_000_000,
    decor: 100_000_000,
    photography: 100_000_000,
    djMusic: 100_000_000,
    makeup: 100_000_000,
    mehendi: 100_000_000,
  } as const;
  for (const city of data.cities) {
    for (const tier of city.tiers) {
      for (const [field, maximum] of Object.entries(limits)) {
        const range = tier[field as keyof typeof limits];
        if (range.max > maximum) {
          issues.push(`${city.city}.${tier.tier}.${field} exceeds its plausible maximum.`);
        }
      }
      for (const [season, estimate] of Object.entries(tier.seasonMultipliers)) {
        if (estimate.multiplier < 0.5 || estimate.multiplier > 4) {
          issues.push(`${city.city}.${tier.tier}.${season} multiplier is implausible.`);
        }
      }
    }
  }
  if (issues.length > 0) throw new Error(issues.join("\n"));
}

function assertVendorPlausibility(
  data: z.infer<typeof vendorsSchema>,
): void {
  const issues: string[] = [];
  for (const city of data.cities) {
    for (const category of city.categories) {
      category.vendors.forEach((vendor, index) => {
        if (vendor.priceRange.max > 100_000_000) {
          issues.push(`${city.city}.${category.category}[${index}] price range is implausible.`);
        }
      });
    }
  }
  if (issues.length > 0) throw new Error(issues.join("\n"));
}

async function generateJson<S extends z.ZodType>(
  client: GoogleGenAI,
  model: string,
  label: string,
  prompt: string,
  schema: S,
  sanityCheck?: (data: z.infer<S>) => void,
): Promise<z.infer<S>> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.info(`Generating ${label}${attempt === 2 ? " (regeneration)" : ""}...`);
    try {
      const response = await client.models.generateContent({
        model,
        contents:
          attempt === 1
            ? prompt
            : `${prompt}\n\nThe previous response failed validation: ${lastError instanceof Error ? lastError.message : "invalid output"}. Regenerate the entire section and correct every issue.`,
        config: {
          temperature: TEMPERATURE,
          responseMimeType: "application/json",
        },
      });
      const text = response.text;
      if (!text) throw new Error(`Gemini returned an empty response for ${label}.`);
      const data = schema.parse(JSON.parse(text));
      sanityCheck?.(data);
      return data;
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        throw new Error(
          `${label} failed validation after regeneration: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
  throw new Error(`${label} could not be generated.`);
}

async function writeJson(
  outputDirectory: string,
  filename: string,
  data: unknown,
  schema: z.ZodType,
): Promise<void> {
  const validatedData = schema.parse(data);
  const outputPath = path.join(outputDirectory, filename);
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(validatedData, null, 2)}\n`, "utf8");
  await rename(temporaryPath, outputPath);
}

function canonicalizeTemplate(template: EventTemplate): EventTemplate {
  return {
    eventType: template.eventType,
    phases: template.phases.map((phase) => ({
      name: phase.name,
      tasks: phase.tasks.map((task) => ({
        title: task.title,
        leadTimeDays: task.leadTimeDays,
      })),
      hiddenCostWarnings: phase.hiddenCostWarnings,
    })),
    vendorCategories: [...template.vendorCategories].sort(
      (left, right) =>
        VENDOR_CATEGORIES.indexOf(left.category) -
        VENDOR_CATEGORIES.indexOf(right.category),
    ),
  };
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is required. Set it in .env.local or in the shell environment.",
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const client = new GoogleGenAI({ apiKey });

  const benchmarks = await generateJson(
    client,
    model,
    "city and tier benchmarks",
    `Create planning price estimates in INR for these exact cities, in this order: ${CITIES.join(", ")}.
For each city provide exactly these tiers in order: ${TIERS.join(", ")}.
Each tier must include cateringPerPlate, venuePerDay, decor, photography, djMusic, makeup, and mehendi. Each is an object with numeric min, numeric max, and isEstimate: true. Catering is per plate; venue is per day; all other prices are typical event-level ranges in INR.
Also include seasonMultipliers with peak, offPeak, and monsoon objects; each object has a positive multiplier and isEstimate: true. Use plausible local market ranges and moderate seasonal multipliers; these are illustrative estimates, not quotes.
Return exactly this JSON shape: {"currency":"INR","cities":[{"city":"Mumbai","tiers":[{"tier":"budget","cateringPerPlate":{"min":0,"max":0,"isEstimate":true},"venuePerDay":{"min":0,"max":0,"isEstimate":true},"decor":{"min":0,"max":0,"isEstimate":true},"photography":{"min":0,"max":0,"isEstimate":true},"djMusic":{"min":0,"max":0,"isEstimate":true},"makeup":{"min":0,"max":0,"isEstimate":true},"mehendi":{"min":0,"max":0,"isEstimate":true},"seasonMultipliers":{"peak":{"multiplier":1,"isEstimate":true},"offPeak":{"multiplier":1,"isEstimate":true},"monsoon":{"multiplier":1,"isEstimate":true}}}]}]}. Include all 10 cities and all 3 tiers; no markdown.`,
    benchmarksSchema,
    assertBenchmarkPlausibility,
  );
  assertBenchmarkCoverage(benchmarks);
  const orderedBenchmarks = canonicalizeBenchmarks(benchmarks);

  const generatedRituals = await generateJson(
    client,
    model,
    "community ceremony traditions",
    `Create ceremony guides for exactly these traditions, in this order: ${COMMUNITIES.join(", ")}.
For each, list ceremonies in a commonly followed sequence for that tradition, from preparation or welcome through the central ceremony and customary closing where appropriate. Keep each tradition distinct; do not imply that one sequence is universal. For each ceremony provide name, positive durationMin (minutes), itemsNeeded (a short array), responsibleRole (a practical role such as family or officiant), and meaning: exactly two short plain-language sentences.
Use neutral and respectful wording. Acknowledge variation through careful phrasing such as "often" and "may"; do not prescribe belief, invent requirements, or treat a community as monolithic. Represent Muslim Nikah and Sikh Anand Karaj respectfully, and recognize the diversity of Christian and regional practices.
Return {"communities":[{"community":"Gujarati","ceremonies":[{"name":"Example","durationMin":30,"itemsNeeded":["Example item"],"responsibleRole":"Family","meaning":"First sentence. Second sentence."}]}]} with every requested community, valid JSON only.`,
    ritualsSchema,
  );
  assertRitualCoverage(generatedRituals);
  const rituals = canonicalizeRituals(generatedRituals);

  const generatedTemplates = await generateJson(
    client,
    model,
    "event planning templates",
    `Create exactly three practical event planning templates: wedding, birthday, and community. Return a JSON object with keys wedding, birthday, and community. For each value include eventType matching its key, phases in chronological order (at least 3), and vendorCategories relevant to that event.
Each phase has name, tasks (standard actionable tasks with title and leadTimeDays as a non-negative integer counted back from event day), and hiddenCostWarnings (specific common extra costs). Each vendor category must be one of ${VENDOR_CATEGORIES.join(", ")} and include at least two mustAskQuestions and two redFlags. Use respectful, inclusive, plain language, and do not present cost or cultural practices as universal.
Each template must include at least 3 populated phases and at least one populated vendor category, using exactly the fields described above. Return only valid JSON.`,
    templatesSchema,
  );
  const templates = {
    wedding: eventTemplateSchema.parse(canonicalizeTemplate(generatedTemplates.wedding)),
    birthday: eventTemplateSchema.parse(canonicalizeTemplate(generatedTemplates.birthday)),
    community: eventTemplateSchema.parse(canonicalizeTemplate(generatedTemplates.community)),
  };

  const vendorCities: {
    city: (typeof CITIES)[number];
    categories: {
      category: (typeof VENDOR_CATEGORIES)[number];
      vendors: (GeneratedVendor & { name: string })[];
    }[];
  }[] = [];

  for (const city of CITIES) {
    const generatedCity = await generateJson(
      client,
      model,
      `fictional demo vendors for ${city}`,
      `Generate exactly 8 vendor profiles for each category in this exact order: ${VENDOR_CATEGORIES.join(", ")}. The city is ${city}, India.
For each category return vendors in index order 1 through 8. Each vendor must include tier (budget, mid, or premium), priceRange with numeric min and max in INR and isEstimate: true, rating from 1 to 5, and 2 to 4 short descriptive tags. Use plausible illustrative event-level service prices for the category and city. Include a balanced mix of all three tiers in each category. Avoid real people, businesses, brands, contact details, and claims of actual reviews; names are assigned locally and will not be generated.
Return only JSON in this shape: {"categories":[{"category":"Catering","vendors":[{"tier":"budget","priceRange":{"min":0,"max":0,"isEstimate":true},"rating":4.2,"tags":["local","flexible"]}]}]}. Include exactly ${VENDOR_CATEGORIES.length} categories and 8 vendors per category.`,
      vendorCitySchema,
      (data) => {
        for (const category of data.categories) {
          for (const [index, vendor] of category.vendors.entries()) {
            if (vendor.priceRange.min < 0 || vendor.priceRange.max > 100_000_000) {
              throw new Error(`${category.category}[${index}] has an implausible price range.`);
            }
          }
        }
      },
    );
    assertVendorCoverage(city, generatedCity.categories);
    vendorCities.push({
      city,
      categories: [...generatedCity.categories]
        .sort(
          (left, right) =>
            VENDOR_CATEGORIES.indexOf(left.category) -
            VENDOR_CATEGORIES.indexOf(right.category),
        )
        .map(({ category, vendors }) => ({
          category,
          vendors: vendors.map((vendor, index) => ({
            name: `Fictional Demo - ${city} ${category} ${String(index + 1).padStart(2, "0")}`,
            ...vendor,
          })),
        })),
    });
  }

  const vendors = vendorsSchema.parse({ currency: "INR", cities: vendorCities });
  assertVendorPlausibility(vendors);
  assertSeedSanity(orderedBenchmarks, vendors);

  const seedDirectory = path.join(process.cwd(), "data", "seed");
  const templateDirectory = path.join(seedDirectory, "templates");
  await mkdir(templateDirectory, { recursive: true });

  const outputs = [
    ["benchmarks.json", orderedBenchmarks, benchmarksSchema],
    ["rituals.json", rituals, ritualsSchema],
    ["templates/wedding.json", templates.wedding, eventTemplateSchema],
    ["templates/birthday.json", templates.birthday, eventTemplateSchema],
    ["templates/community.json", templates.community, eventTemplateSchema],
    ["vendors.json", vendors, vendorsSchema],
  ] as const;

  for (const [filename, data, schema] of outputs) {
    await writeJson(seedDirectory, filename, data, schema);
  }

  const ceremonyCount = rituals.communities.reduce(
    (total, community) => total + community.ceremonies.length,
    0,
  );
  const vendorCount = vendors.cities.reduce(
    (total, city) =>
      total +
      city.categories.reduce((categoryTotal, category) => categoryTotal + category.vendors.length, 0),
    0,
  );

  console.info("Seed generation complete:");
  console.info(`- ${path.join(seedDirectory, "benchmarks.json")}: ${CITIES.length} cities, ${CITIES.length * TIERS.length} city/tier estimates`);
  console.info(`- ${path.join(seedDirectory, "rituals.json")}: ${rituals.communities.length} traditions, ${ceremonyCount} ceremonies`);
  console.info(`- ${templateDirectory}: ${TEMPLATE_TYPES.length} event templates`);
  console.info(`- ${path.join(seedDirectory, "vendors.json")}: ${vendors.cities.length} cities, ${VENDOR_CATEGORIES.length} categories each, ${vendorCount} fictional demo vendors`);
}

main().catch((error: unknown) => {
  console.error("Seed generation failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
