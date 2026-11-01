import { z } from "zod";
import {
  budgetCategorySchema,
  ceremonySchema,
  moodboardTileSchema,
  taskSchema,
  themeSchema,
  vendorCategorySchema,
  type Blueprint,
} from "@/lib/schemas/blueprint";

const generatedBudgetCategorySchema = budgetCategorySchema.extend({
  hiddenCostWarnings: z.preprocess(
    (value) => typeof value === "string" ? [value] : value,
    z.array(z.string().trim().min(1)),
  ),
});
const eventSchema = z.object({
  title: z.string().trim().min(1),
  city: z.string().trim().min(1),
  date: z.string().date(),
  guests: z.number().int().nonnegative(),
  concept: z.string().trim().min(1),
  accentColor: z.string().regex(/^#[\da-fA-F]{6}$/),
});
const generatedMenuSchema = z.array(z.object({
  course: z.string().trim().min(1),
  dishes: z.array(z.object({
    name: z.string().trim().min(1),
    dietaryTags: z.array(z.string().trim().min(1)),
  })).min(1),
})).length(3);
const assumptionsSchema = z.array(z.object({
  text: z.string().trim().min(1),
  reason: z.string().trim().min(1),
})).length(2);
const invitationsSchema = z.object({
  warm: z.string().trim().min(1),
  formal: z.string().trim().min(1),
});

function formatIssues(error: z.ZodError): string {
  return error.issues.slice(0, 3).map((issue) => {
    const path = issue.path.map(String).join(".") || "value";
    return `${path}: ${issue.message}`;
  }).join("; ");
}

export function findIncompletePlanFields(candidate: unknown, fallbackPlan: Blueprint): string[] {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    return ["complete JSON object"];
  }
  const record = candidate as Record<string, unknown>;
  const missing: string[] = [];
  if (record.eventType !== fallbackPlan.eventType) missing.push("eventType matching the request");
  const event = eventSchema.safeParse(record.event);
  if (!event.success) {
    missing.push(`event details (${formatIssues(event.error)})`);
  } else {
    const mismatches = [
      event.data.city !== fallbackPlan.event.city ? "city" : null,
      event.data.date !== fallbackPlan.event.date ? "date" : null,
      event.data.guests !== fallbackPlan.event.guests ? "guest count" : null,
    ].filter((field): field is string => field !== null);
    if (mismatches.length > 0) missing.push(`event details must match the request (${mismatches.join(", ")})`);
  }
  const timeline = z.array(taskSchema).length(20).safeParse(record.timeline);
  if (!timeline.success) {
    missing.push(`20 valid timeline tasks (${formatIssues(timeline.error)})`);
  }
  const vendors = z.array(vendorCategorySchema).length(8).safeParse(record.vendorCategories);
  if (!vendors.success) {
    missing.push(`8 valid vendor categories (${formatIssues(vendors.error)})`);
  } else if (vendors.data.some((category) => category.shortlist.length !== 3)) {
    missing.push("8 complete vendor categories with 3 fictional options each");
  }
  const budget = typeof record.budget === "object" && record.budget !== null
    ? record.budget as Record<string, unknown>
    : null;
  const categories = z.array(generatedBudgetCategorySchema).length(10).safeParse(budget?.categories);
  const validCategories = categories.success
    && new Set(categories.data.map((category) => category.id)).size === categories.data.length
    && Math.abs(categories.data.reduce((sum, category) => sum + category.share, 0) - 100) <= 0.001;
  if (!categories.success) {
    missing.push(`10 valid budget categories (${formatIssues(categories.error)})`);
  } else if (!validCategories) {
    missing.push("10 unique budget categories with shares totaling 100%");
  }
  if (budget?.total !== fallbackPlan.budget.total || budget.baseGuests !== fallbackPlan.budget.baseGuests) {
    missing.push("the exact budget total and guest count from the request");
  }
  const ideas = typeof record.ideas === "object" && record.ideas !== null
    ? record.ideas as Record<string, unknown>
    : null;
  const themes = z.array(themeSchema).length(3).safeParse(ideas?.themes);
  if (!themes.success) {
    missing.push(`3 valid themes (${formatIssues(themes.error)})`);
  } else if (themes.data.some((theme) => theme.palette.some((color) => !/^#[\da-fA-F]{6}$/.test(color)))) {
    missing.push("3 complete themes with exactly 3 valid hex colors each");
  }
  const menu = generatedMenuSchema.safeParse(ideas?.menu);
  if (!menu.success) missing.push(`3 valid menu courses (${formatIssues(menu.error)})`);
  const invitations = invitationsSchema.safeParse(ideas?.invitations);
  if (!invitations.success) missing.push(`warm and formal invitations (${formatIssues(invitations.error)})`);
  const assumptions = assumptionsSchema.safeParse(record.assumptions);
  if (!assumptions.success) missing.push(`2 valid assumptions (${formatIssues(assumptions.error)})`);
  const ceremonies = z.array(ceremonySchema).min(1).safeParse(record.ceremonies);
  if (!ceremonies.success) {
    missing.push(`event-appropriate ceremonies (${formatIssues(ceremonies.error)})`);
  }
  const moodboard = z.array(moodboardTileSchema).length(6).safeParse(record.moodboard);
  if (!moodboard.success) {
    missing.push(`6 valid moodboard tiles (${formatIssues(moodboard.error)})`);
  }
  return missing;
}
