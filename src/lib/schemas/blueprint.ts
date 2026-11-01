import { z } from "zod";

export const budgetKindSchema = z.enum(["per_head", "fixed", "semi"]);

export const budgetCategorySchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  amount: z.number().int().nonnegative(),
  share: z.number().finite().nonnegative(),
  kind: budgetKindSchema,
  isEstimate: z.boolean().default(true),
  saveTip: z.string().trim().min(1),
  hiddenCostWarnings: z.array(z.string().trim().min(1)),
});

export const taskSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  phase: z.enum(["6 months", "3 months", "1 month", "1 week", "day-of"]),
  leadTimeDays: z.number().int().nonnegative(),
  dueDate: z.string().date().optional(),
  ownerRole: z.string().trim().min(1),
  reason: z.string().trim().min(1),
  dependencies: z.array(z.string().trim().min(1)),
  completed: z.boolean().default(false),
  compressed: z.boolean().optional(),
});

export const vendorCategorySchema = z.object({
  name: z.string().trim().min(1),
  bookByDays: z.number().int().nonnegative(),
  mustAskQuestions: z.array(z.string().trim().min(1)).min(1),
  redFlags: z.array(z.string().trim().min(1)).min(1),
  shortlist: z.array(
    z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().min(1),
      tier: z.enum(["budget", "mid", "premium"]),
      priceMin: z.number().finite().nonnegative(),
      priceMax: z.number().finite().nonnegative(),
      rating: z.number().min(1).max(5),
      tags: z.array(z.string().trim().min(1)),
    }).refine((vendor) => vendor.priceMin <= vendor.priceMax, "Vendor minimum price cannot exceed maximum price."),
  ).min(3).max(8),
});

export const themeSchema = z.object({
  name: z.string().trim().min(1),
  palette: z.array(z.string().trim().min(1)).length(3),
  decor: z.string().trim().min(1),
  entertainment: z.string().trim().min(1),
  signatureMoment: z.string().trim().min(1),
});

export const ceremonySchema = z.object({
  name: z.string().trim().min(1),
  order: z.number().int().positive(),
  durationMin: z.number().int().positive(),
  itemsNeeded: z.array(z.string().trim().min(1)),
  responsibleRole: z.string().trim().min(1),
  meaning: z.string().trim().min(1).refine(
    (meaning) => (meaning.match(/[.!?](?:["')\]]*)?(?=\s|$)/g) ?? []).length === 2,
    "Ceremony meanings must contain exactly two sentences.",
  ),
  completed: z.boolean().default(false),
});

export const moodboardTileSchema = z.object({
  id: z.string().trim().min(1),
  caption: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  imageUrl: z.string().trim().optional(),
});

const budgetSchema = z.object({
  total: z.number().int().nonnegative(),
  baseGuests: z.number().int().nonnegative(),
  categories: z.array(budgetCategorySchema).min(10).max(14),
});

export const blueprintSchema = z
  .object({
    eventType: z.enum(["wedding", "birthday", "community", "other"]),
    event: z.object({
      title: z.string().trim().min(1),
      city: z.string().trim().min(1),
      date: z.string().date(),
      guests: z.number().int().nonnegative(),
      concept: z.string().trim().min(1),
      accentColor: z.string().regex(/^#[\da-fA-F]{6}$/).default("#d97706"),
    }),
    budget: budgetSchema,
    timeline: z.array(taskSchema).min(20).max(30),
    vendorCategories: z.array(vendorCategorySchema).min(8).max(12),
    ideas: z.object({
      themes: z.array(themeSchema).min(3),
      menu: z.array(
        z.object({
          course: z.string().trim().min(1),
          dishes: z.array(
            z.object({
              name: z.string().trim().min(1),
              dietaryTags: z.array(z.string().trim().min(1)),
            }),
          ).min(1),
        }),
      ),
      invitations: z.object({
        warm: z.string().trim().min(1),
        formal: z.string().trim().min(1),
      }),
    }),
    assumptions: z.array(
      z.object({
        text: z.string().trim().min(1),
        reason: z.string().trim().min(1),
      }),
    ),
    ceremonies: z.array(ceremonySchema).min(1),
    moodboard: z.array(moodboardTileSchema).length(6),
  })
  .superRefine((blueprint, context) => {
    const categories = blueprint.budget.categories;
    const sum = categories.reduce((total, category) => total + category.share, 0);
    if (Math.abs(sum - 100) > 0.001) {
      context.addIssue({
        code: "custom",
        path: ["budget", "categories"],
        message: "Budget category shares must sum to 100%.",
      });
    }
    const amountTotal = categories.reduce((total, category) => total + category.amount, 0);
    if (amountTotal !== blueprint.budget.total) {
      context.addIssue({
        code: "custom",
        path: ["budget", "categories"],
        message: "Budget category amounts must sum exactly to the budget total.",
      });
    }

    const ids = new Set(blueprint.timeline.map((task) => task.id));
    for (const [index, task] of blueprint.timeline.entries()) {
      for (const dependency of task.dependencies) {
        if (!ids.has(dependency)) {
          context.addIssue({
            code: "custom",
            path: ["timeline", index, "dependencies"],
            message: `Unknown task dependency: ${dependency}.`,
          });
        }
        if (dependency === task.id) {
          context.addIssue({
            code: "custom",
            path: ["timeline", index, "dependencies"],
            message: "A task cannot depend on itself.",
          });
        }
      }
    }

    const graph = new Map(blueprint.timeline.map((task) => [task.id, task.dependencies]));
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const hasCycle = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      for (const dependency of graph.get(id) ?? []) {
        if (graph.has(dependency) && hasCycle(dependency)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    for (const id of graph.keys()) {
      if (hasCycle(id)) {
        context.addIssue({
          code: "custom",
          path: ["timeline"],
          message: "Timeline dependencies cannot contain cycles.",
        });
        break;
      }
    }
  });

export type Blueprint = z.infer<typeof blueprintSchema>;
export type BudgetCategory = Blueprint["budget"]["categories"][number];
export type PlanTask = Blueprint["timeline"][number];
