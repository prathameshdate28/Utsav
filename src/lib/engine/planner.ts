import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import {
  blueprintSchema,
  type Blueprint,
  type BudgetCategory,
  type PlanTask,
} from "@/lib/schemas/blueprint";

export interface AllocationCategory {
  id: string;
  share: number;
}

export interface DueTask<T extends Pick<PlanTask, "leadTimeDays"> = PlanTask> {
  task: T;
  dueDate: string;
  compressed: boolean;
}

export interface RebalanceResult {
  blueprint: Blueprint;
  deltas: Record<string, number>;
}

export function budgetDeltaSummary(
  categories: readonly Pick<BudgetCategory, "id" | "name">[],
  deltas: Readonly<Record<string, number>>,
): Array<{ category: string; changeInRupees: number }> {
  return categories.flatMap((category) => {
    const changeInRupees = deltas[category.id];
    return changeInRupees === undefined || changeInRupees === 0
      ? []
      : [{ category: category.name, changeInRupees }];
  });
}

function assertTotal(total: number): void {
  if (!Number.isInteger(total) || total < 0) {
    throw new RangeError("Total must be a non-negative integer.");
  }
}

function assertShares(categories: readonly AllocationCategory[]): void {
  if (categories.length === 0) throw new RangeError("At least one category is required.");
  const sum = categories.reduce((value, category) => value + category.share, 0);
  if (categories.some((category) => !Number.isFinite(category.share) || category.share < 0)) {
    throw new RangeError("Category shares must be finite, non-negative numbers.");
  }
  if (Math.abs(sum - 100) > 0.001) {
    throw new RangeError("Category shares must sum to 100%.");
  }
}

export function allocate<T extends AllocationCategory>(total: number, categories: readonly T[]): Record<string, number> {
  assertTotal(total);
  assertShares(categories);
  const amounts = categories.map((category) => Math.floor((total * category.share) / 100));
  const remainder = Math.round(total) - amounts.reduce((sum, amount) => sum + amount, 0);
  let largestIndex = 0;
  for (let index = 1; index < categories.length; index += 1) {
    if (categories[index].share > categories[largestIndex].share) largestIndex = index;
  }
  amounts[largestIndex] += remainder;
  return Object.fromEntries(categories.map((category, index) => [category.id, amounts[index]]));
}

function dateOnly(date: Date | string): Date {
  if (date instanceof Date) {
    if (Number.isNaN(date.getTime())) throw new RangeError("Date must be valid.");
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new RangeError("Date must be valid.");
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function localISODate(date = new Date()): string {
  if (Number.isNaN(date.getTime())) throw new RangeError("Date must be valid.");
  return toISODate(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())));
}

export function dueDates<T extends Pick<PlanTask, "leadTimeDays">>(
  eventDate: Date | string,
  tasks: readonly T[],
  today: Date | string = new Date(),
): DueTask<T>[] {
  const event = dateOnly(eventDate);
  const current = dateOnly(today);
  return tasks.map((task) => {
    const due = new Date(event);
    due.setUTCDate(due.getUTCDate() - task.leadTimeDays);
    return { task, dueDate: toISODate(due), compressed: due < current };
  });
}

export function reflow(blueprint: Blueprint, newDate: Date | string, today: Date | string): Blueprint {
  const eventDate = dateOnly(newDate);
  const tasks = blueprint.timeline;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const state = new Map<string, 0 | 1 | 2>();
  const dueById = new Map<string, Date>();

  const schedule = (id: string): Date => {
    const status = state.get(id) ?? 0;
    if (status === 1) throw new Error("Timeline dependencies cannot contain cycles.");
    if (status === 2) return dueById.get(id)!;
    const task = byId.get(id);
    if (!task) throw new Error(`Unknown task dependency: ${id}.`);
    state.set(id, 1);
    const due = new Date(eventDate);
    due.setUTCDate(due.getUTCDate() - task.leadTimeDays);
    for (const dependency of task.dependencies) {
      const dependencyDate = schedule(dependency);
      if (dependencyDate > due) due.setTime(dependencyDate.getTime());
    }
    state.set(id, 2);
    dueById.set(id, due);
    return due;
  };

  for (const task of tasks) schedule(task.id);
  const todayDate = dateOnly(today);
  return {
    ...blueprint,
    event: { ...blueprint.event, date: toISODate(eventDate) },
    timeline: tasks.map((task) => ({
      ...task,
      dueDate: toISODate(dueById.get(task.id)!),
      compressed: dueById.get(task.id)! < todayDate,
    })),
  };
}

export function rebalance(
  blueprint: Blueprint,
  changes: { guests?: number; total?: number },
): RebalanceResult {
  const guests = changes.guests ?? blueprint.event.guests;
  if (!Number.isInteger(guests) || guests < 0) throw new RangeError("Guests must be a non-negative integer.");
  const baseGuests = blueprint.budget.baseGuests;
  const adjusted = blueprint.budget.categories.map((category) => {
    const guestRatio = baseGuests === 0 ? (guests === 0 ? 1 : 0) : guests / baseGuests;
    const factor =
      category.kind === "fixed" ? 1 : category.kind === "per_head" ? guestRatio : 1 + (guestRatio - 1) * 0.5;
    return { ...category, amount: Math.round(category.amount * factor) };
  });
  const adjustedTotal = adjusted.reduce((sum, category) => sum + category.amount, 0);
  const total = changes.total ?? (changes.guests === undefined ? blueprint.budget.total : adjustedTotal);
  assertTotal(total);
  const weightedCategories = adjusted.map((category) => ({
    id: category.id,
    share:
      adjustedTotal > 0
        ? (category.amount / adjustedTotal) * 100
        : category.share,
  }));
  const normalized = weightedCategories.map((category, index) =>
    index === weightedCategories.length - 1
      ? { ...category, share: 100 - weightedCategories.slice(0, -1).reduce((sum, item) => sum + item.share, 0) }
      : category,
  );
  const amounts = allocate(total, normalized);
  const categories: BudgetCategory[] = adjusted.map((category) => {
    const amount = amounts[category.id];
    return {
      ...category,
      amount,
      share: total === 0 ? category.share : (amount / total) * 100,
    };
  });
  if (total > 0) {
    const diff = 100 - categories.reduce((sum, category) => sum + category.share, 0);
    const largest = categories.reduce((best, category) => category.amount > best.amount ? category : best);
    largest.share += diff;
  }
  const deltas = Object.fromEntries(
    categories.map((category) => [
      category.id,
      category.amount - blueprint.budget.categories.find((original) => original.id === category.id)!.amount,
    ]),
  );
  return {
    blueprint: {
      ...blueprint,
      event: { ...blueprint.event, guests },
      budget: { ...blueprint.budget, total, baseGuests: guests, categories },
    },
    deltas,
  };
}

export interface ReadinessResult {
  score: number;
  nextBestAction: PlanTask | null;
}

export function readiness(tasks: readonly PlanTask[], today: Date | string): ReadinessResult {
  const current = dateOnly(today);
  let possible = 0;
  let earned = 0;
  let overduePenalty = 0;
  let nextBestAction: PlanTask | null = null;
  let nextPriority = -Infinity;
  for (const task of tasks) {
    const phaseWeight: Record<PlanTask["phase"], number> = {
      "6 months": 3,
      "3 months": 2.5,
      "1 month": 2,
      "1 week": 1.5,
      "day-of": 1,
    };
    const weight = phaseWeight[task.phase];
    possible += weight;
    if (task.completed) {
      earned += weight;
      continue;
    }
    const date = task.dueDate ? dateOnly(task.dueDate) : null;
    const overdue = date !== null && date < current;
    if (overdue) overduePenalty += Math.min(weight * 0.25, 1);
    const priority = weight + (overdue ? 2 : 0) + (date && date <= new Date(current.getTime() + 7 * 86400000) ? 1 : 0);
    if (priority > nextPriority) {
      nextPriority = priority;
      nextBestAction = task;
    }
  }
  return {
    score: possible === 0 ? 100 : Math.max(0, Math.min(100, Math.round((earned / possible) * 100 - overduePenalty))),
    nextBestAction,
  };
}

export function encodePlan(blueprint: Blueprint): string {
  const validated = blueprintSchema.parse(blueprint);
  return compressToEncodedURIComponent(JSON.stringify(validated));
}

export function decodePlan(code: string): Blueprint {
  const decoded = decompressFromEncodedURIComponent(code);
  if (!decoded) throw new Error("Shared plan code is malformed.");
  let value: unknown;
  try {
    value = JSON.parse(decoded);
  } catch {
    throw new Error("Shared plan code does not contain valid plan JSON.");
  }
  return blueprintSchema.parse(value);
}
