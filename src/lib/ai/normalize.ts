import { allocate } from "@/lib/engine/planner";
import {
  blueprintSchema,
  budgetCategorySchema,
  ceremonySchema,
  moodboardTileSchema,
  taskSchema,
  themeSchema,
  vendorCategorySchema,
  type Blueprint,
} from "@/lib/schemas/blueprint";
import { z } from "zod";

const candidateBudgetCategoriesSchema = z.array(
  budgetCategorySchema.extend({
    hiddenCostWarnings: z.preprocess(
      (value) => typeof value === "string" ? [value] : value,
      z.array(z.string().trim().min(1)),
    ),
  }),
).max(14);

const candidateBudgetSchema = z.object({
  total: z.number().int().nonnegative().optional(),
  baseGuests: z.number().int().nonnegative().optional(),
  categories: candidateBudgetCategoriesSchema.optional(),
}).passthrough();

const eventSchema = z.object({
  title: z.string().trim().min(1),
  city: z.string().trim().min(1),
  date: z.string().date(),
  guests: z.number().int().nonnegative(),
  concept: z.string().trim().min(1),
  accentColor: z.string().regex(/^#[\da-fA-F]{6}$/).optional(),
});
const menuSchema = z.array(z.object({
  course: z.string().trim().min(1),
  dishes: z.array(z.object({
    name: z.string().trim().min(1),
    dietaryTags: z.array(z.string().trim().min(1)),
  })).min(1),
}));
const assumptionsSchema = z.array(z.object({
  text: z.string().trim().min(1),
  reason: z.string().trim().min(1),
}));

type TimelinePhase = Blueprint["timeline"][number]["phase"];

function phaseFromLeadTime(leadTimeDays: unknown): TimelinePhase | undefined {
  if (typeof leadTimeDays !== "number" || !Number.isFinite(leadTimeDays)) return undefined;
  if (leadTimeDays > 120) return "6 months";
  if (leadTimeDays > 45) return "3 months";
  if (leadTimeDays > 14) return "1 month";
  if (leadTimeDays > 0) return "1 week";
  return "day-of";
}

function normalizePhase(value: unknown, leadTimeDays: unknown, fallbackPhase?: TimelinePhase): TimelinePhase {
  if (typeof value === "string") {
    const phase = value.trim().toLowerCase().replace(/[_-]+/g, " ");
    if (/\bday\s*of\b|\bevent day\b|\bwedding day\b|\bsame day\b/.test(phase)) return "day-of";
    if (/\b6\s*(?:months?|mos?)\b|\bhalf year\b/.test(phase)) return "6 months";
    if (/\b3\s*(?:months?|mos?)\b/.test(phase)) return "3 months";
    if (/\b1\s*(?:month|mo)\b/.test(phase)) return "1 month";
    if (/\b1\s*(?:week|wk)\b/.test(phase)) return "1 week";
    if (phase === "day") return "day-of";
    if (phase === "week") return "1 week";
    if (phase === "month") return "1 month";
  }
  return phaseFromLeadTime(leadTimeDays) ?? fallbackPhase ?? "6 months";
}

function normalizeTimeline(value: unknown, fallbackTimeline?: Blueprint["timeline"]): unknown {
  if (!Array.isArray(value)) return fallbackTimeline ?? value;
  return value.map((task, index) => {
    if (typeof task !== "object" || task === null || Array.isArray(task)) return task;
    const record = task as Record<string, unknown>;
    return {
      ...record,
      phase: normalizePhase(record.phase, record.leadTimeDays, fallbackTimeline?.[index]?.phase),
    };
  });
}

function normalizeEventType(value: unknown, fallback: Blueprint["eventType"]): Blueprint["eventType"] {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (/^(wedding|marriage|marital|engagement|reception)$/.test(normalized)) return "wedding";
  if (/^(birthday|birth day|anniversary birthday)$/.test(normalized)) return "birthday";
  if (/^(community|community event|festival|festive|social gathering|utsav)$/.test(normalized)) return "community";
  if (/^(other|celebration|anniversary|graduation|baby shower|housewarming|retirement|reunion)$/.test(normalized)) return "other";
  return fallback;
}

function normalizeMenuDishes(value: unknown): unknown[] {
  const dishes = Array.isArray(value) ? value : [value];
  return dishes.map((dish) => {
    if (typeof dish === "string") return { name: dish, dietaryTags: [] };
    if (typeof dish !== "object" || dish === null || Array.isArray(dish)) return dish;
    const record = dish as Record<string, unknown>;
    return {
      ...record,
      name: record.name ?? record.dish ?? record.item,
      dietaryTags: Array.isArray(record.dietaryTags) ? record.dietaryTags : [],
    };
  });
}

function normalizeMenu(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((course) => {
      if (typeof course !== "object" || course === null || Array.isArray(course)) return course;
      const record = course as Record<string, unknown>;
      return { ...record, dishes: normalizeMenuDishes(record.dishes) };
    });
  }
  if (typeof value !== "object" || value === null) return value;

  const menu = value as Record<string, unknown>;
  if (Array.isArray(menu.courses)) return normalizeMenu(menu.courses);
  if ("course" in menu && "dishes" in menu) {
    return [{ ...menu, dishes: normalizeMenuDishes(menu.dishes) }];
  }
  return Object.entries(menu).map(([course, dishes]) => ({
    course,
    dishes: normalizeMenuDishes(dishes),
  }));
}

function normalizeVendorCategories(
  value: unknown[],
  fallbackCategories: Blueprint["vendorCategories"] | undefined,
): unknown[] {
  return value.map((category, index) => {
    if (typeof category !== "object" || category === null || Array.isArray(category)) return category;
    const record = category as Record<string, unknown>;
    const categoryName = typeof record.name === "string" ? record.name.trim().toLowerCase() : "";
    const fallbackCategory = fallbackCategories?.find(
      (fallback) => fallback.name.trim().toLowerCase() === categoryName,
    ) ?? fallbackCategories?.[index];
    const normalizeList = (candidate: unknown, fallback: string[] | undefined) => {
      if (Array.isArray(candidate)) return candidate;
      if (typeof candidate === "string" && candidate.trim()) return [candidate.trim()];
      return fallback ?? candidate;
    };

    return {
      ...record,
      mustAskQuestions: normalizeList(record.mustAskQuestions, fallbackCategory?.mustAskQuestions),
      redFlags: normalizeList(record.redFlags, fallbackCategory?.redFlags),
    };
  });
}

export function normalizeBlueprint(
  candidate: unknown,
  budgetDefaults?: Pick<Blueprint["budget"], "total" | "baseGuests">,
  fallbackBlueprint?: Blueprint,
): Blueprint {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return blueprintSchema.parse(candidate);
  }
  const root = z.object({
    budget: z.unknown().optional(),
    eventType: z.unknown().optional(),
    ideas: z.unknown().optional(),
    vendorCategories: z.unknown().optional(),
    event: z.unknown().optional(),
    timeline: z.unknown().optional(),
    assumptions: z.unknown().optional(),
    ceremonies: z.unknown().optional(),
    moodboard: z.unknown().optional(),
  }).passthrough().parse(candidate);
  const rawBudgetCandidate = Array.isArray(root.budget) ? { categories: root.budget } : root.budget;
  const rawBudgetResult = candidateBudgetSchema.safeParse(rawBudgetCandidate);
  const rawBudget = rawBudgetResult.success ? rawBudgetResult.data : {};
  const candidateCategories = candidateBudgetCategoriesSchema.safeParse(rawBudget.categories);
  const parsedCategories = candidateCategories.success ? candidateCategories.data : undefined;
  const validShares = parsedCategories
    && parsedCategories.length >= 10
    && Math.abs(parsedCategories.reduce((sum, category) => sum + category.share, 0) - 100) <= 0.001
    && new Set(parsedCategories.map((category) => category.id)).size === parsedCategories.length;
  const budgetCategories = validShares
    ? candidateCategories.data
    : fallbackBlueprint?.budget.categories
      ?? (parsedCategories && parsedCategories.length >= 10 ? parsedCategories : undefined);
  if (!budgetCategories) {
    if (!candidateCategories.success) throw candidateCategories.error;
    throw new Error("The generated budget needs at least 10 unique categories with shares totaling 100% and no fallback plan was supplied.");
  }
  const budget = z.object({
    total: z.number().int().nonnegative(),
    baseGuests: z.number().int().nonnegative(),
    categories: candidateBudgetCategoriesSchema,
  }).passthrough().parse({
    ...rawBudget,
    total: budgetDefaults?.total ?? rawBudget.total ?? fallbackBlueprint?.budget.total,
    baseGuests: budgetDefaults?.baseGuests ?? rawBudget.baseGuests ?? fallbackBlueprint?.budget.baseGuests,
    categories: budgetCategories,
  });
  const amounts = allocate(budget.total, budget.categories);
  const fallbackIdeas = fallbackBlueprint?.ideas;
  const candidateIdeas = typeof root.ideas === "object" && root.ideas !== null
    ? root.ideas as Record<string, unknown>
    : {};
  const candidateThemes = Array.isArray(candidateIdeas.themes) ? candidateIdeas.themes : [];
  const normalizedThemes = fallbackIdeas
    ? Array.from({ length: Math.max(fallbackIdeas.themes.length, candidateThemes.length) }, (_, index) => {
        const theme = candidateThemes[index];
        const fallbackTheme = fallbackIdeas.themes[index % fallbackIdeas.themes.length];
        if (typeof theme !== "object" || theme === null || Array.isArray(theme)) return fallbackTheme;
        const candidateTheme = theme as Record<string, unknown>;
        const validPalette = Array.isArray(candidateTheme.palette)
          && candidateTheme.palette.length === 3
          && candidateTheme.palette.every((color) => typeof color === "string" && /^#[\da-fA-F]{6}$/.test(color));
        const mergedTheme = {
          ...fallbackTheme,
          ...candidateTheme,
          palette: validPalette ? candidateTheme.palette : fallbackTheme.palette,
        };
        const parsedTheme = themeSchema.safeParse(mergedTheme);
        return parsedTheme.success ? parsedTheme.data : fallbackTheme;
      })
    : candidateThemes;
  const candidateMenu = candidateIdeas.menu === undefined
    ? undefined
    : menuSchema.safeParse(normalizeMenu(candidateIdeas.menu));
  const ideas = fallbackIdeas
    ? {
        ...fallbackIdeas,
        ...candidateIdeas,
        themes: normalizedThemes,
        menu: candidateMenu?.success ? candidateMenu.data : fallbackIdeas.menu,
      }
    : {
        ...candidateIdeas,
        ...(candidateMenu?.success ? { menu: candidateMenu.data } : {}),
      };
  const fallbackEvent = fallbackBlueprint?.event;
  const candidateEvent = typeof root.event === "object" && root.event !== null
    ? root.event as Record<string, unknown>
    : {};
  const eventDate = z.string().date().safeParse(candidateEvent.date);
  const mergedEvent = fallbackEvent
    ? {
        ...fallbackEvent,
        ...candidateEvent,
        date: eventDate.success ? eventDate.data : fallbackEvent.date,
      }
    : root.event;
  const parsedEvent = eventSchema.safeParse(mergedEvent);
  const event = parsedEvent.success ? parsedEvent.data : fallbackEvent ?? mergedEvent;
  const parsedAssumptions = assumptionsSchema.safeParse(root.assumptions);
  const assumptions = parsedAssumptions.success ? parsedAssumptions.data : fallbackBlueprint?.assumptions;
  const normalizedTimeline = normalizeTimeline(root.timeline, fallbackBlueprint?.timeline);
  const validTimeline = z.array(taskSchema).min(20).max(30).safeParse(normalizedTimeline);
  const normalizedVendors = Array.isArray(root.vendorCategories)
    ? normalizeVendorCategories(root.vendorCategories, fallbackBlueprint?.vendorCategories)
    : fallbackBlueprint?.vendorCategories;
  const validVendors = z.array(vendorCategorySchema).min(8).max(12).safeParse(normalizedVendors);
  const validCeremonies = z.array(ceremonySchema).min(1).safeParse(root.ceremonies);
  const validMoodboard = z.array(moodboardTileSchema).length(6).safeParse(root.moodboard);
  return blueprintSchema.parse({
    ...root,
    event,
    eventType: normalizeEventType(root.eventType, fallbackBlueprint?.eventType ?? "wedding"),
    timeline: validTimeline.success ? validTimeline.data : fallbackBlueprint?.timeline ?? normalizedTimeline,
    vendorCategories: validVendors.success ? validVendors.data : fallbackBlueprint?.vendorCategories ?? normalizedVendors,
    ideas,
    assumptions,
    ceremonies: validCeremonies.success ? validCeremonies.data : fallbackBlueprint?.ceremonies ?? root.ceremonies,
    moodboard: validMoodboard.success ? validMoodboard.data : fallbackBlueprint?.moodboard ?? root.moodboard,
    budget: {
      ...budget,
      categories: budget.categories.map((category) => ({
        ...category,
        amount: amounts[category.id],
      })),
    },
  });
}
