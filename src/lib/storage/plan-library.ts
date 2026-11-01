import { z } from "zod";
import { blueprintSchema, type Blueprint } from "@/lib/schemas/blueprint";

const PLAN_LIBRARY_KEY = "utsav-plans";
const ACTIVE_PLAN_ID_KEY = "utsav-active-plan-id";
const CURRENT_PLAN_KEY = "utsav-plan";

const savedPlanSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().datetime(),
  plan: blueprintSchema,
});

export type SavedPlan = z.infer<typeof savedPlanSchema>;
type PlanStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function makePlanId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `plan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parsePlan(raw: string, context: string): Blueprint {
  try {
    return blueprintSchema.parse(JSON.parse(raw));
  } catch (failure) {
    throw new Error(
      `${context}: ${failure instanceof Error ? failure.message : "The saved plan is invalid."}`,
    );
  }
}

function parseLibrary(raw: string): SavedPlan[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (failure) {
    throw new Error(
      `The saved plan library could not be read: ${failure instanceof Error ? failure.message : "invalid JSON."}`,
    );
  }
  return z.array(savedPlanSchema).parse(value);
}

function writeActivePlan(record: SavedPlan, storage: PlanStorage): void {
  storage.setItem(PLAN_LIBRARY_KEY, JSON.stringify(
    readSavedPlans(storage).map((saved) => saved.id === record.id ? record : saved),
  ));
  storage.setItem(CURRENT_PLAN_KEY, JSON.stringify(record.plan));
  storage.setItem(ACTIVE_PLAN_ID_KEY, record.id);
}

export function readSavedPlans(storage: PlanStorage = window.localStorage): SavedPlan[] {
  const storedLibrary = storage.getItem(PLAN_LIBRARY_KEY);
  if (storedLibrary !== null) return parseLibrary(storedLibrary);

  const legacyPlan = storage.getItem(CURRENT_PLAN_KEY);
  if (legacyPlan === null) return [];

  const migrated: SavedPlan = {
    id: makePlanId(),
    updatedAt: new Date().toISOString(),
    plan: parsePlan(legacyPlan, "The existing saved plan could not be loaded"),
  };
  storage.setItem(PLAN_LIBRARY_KEY, JSON.stringify([migrated]));
  storage.setItem(ACTIVE_PLAN_ID_KEY, migrated.id);
  return [migrated];
}

export function loadActivePlan(storage: PlanStorage = window.localStorage): Blueprint | null {
  const plans = readSavedPlans(storage);
  if (plans.length === 0) return null;

  const activeId = storage.getItem(ACTIVE_PLAN_ID_KEY);
  const active = plans.find((record) => record.id === activeId) ?? plans[0];
  if (active.id !== activeId) writeActivePlan(active, storage);
  return active.plan;
}

export function activateSavedPlan(
  id: string,
  storage: PlanStorage = window.localStorage,
): SavedPlan {
  const record = readSavedPlans(storage).find((saved) => saved.id === id);
  if (!record) throw new Error("That saved plan could not be found on this device.");
  writeActivePlan(record, storage);
  return record;
}

export function saveNewPlan(
  plan: Blueprint,
  storage: PlanStorage = window.localStorage,
): SavedPlan {
  const validatedPlan = blueprintSchema.parse(plan);
  const record: SavedPlan = {
    id: makePlanId(),
    updatedAt: new Date().toISOString(),
    plan: validatedPlan,
  };
  const plans = readSavedPlans(storage);
  storage.setItem(PLAN_LIBRARY_KEY, JSON.stringify([record, ...plans]));
  storage.setItem(CURRENT_PLAN_KEY, JSON.stringify(validatedPlan));
  storage.setItem(ACTIVE_PLAN_ID_KEY, record.id);
  return record;
}

export function savePlanWithId(
  plan: Blueprint,
  id: string,
  storage: PlanStorage = window.localStorage,
): SavedPlan {
  const validatedPlan = blueprintSchema.parse(plan);
  const plans = readSavedPlans(storage);
  const existing = plans.find((record) => record.id === id);
  const record: SavedPlan = {
    id,
    updatedAt: new Date().toISOString(),
    plan: validatedPlan,
  };
  storage.setItem(
    PLAN_LIBRARY_KEY,
    JSON.stringify(existing
      ? plans.map((saved) => saved.id === id ? record : saved)
      : [record, ...plans]),
  );
  storage.setItem(CURRENT_PLAN_KEY, JSON.stringify(validatedPlan));
  storage.setItem(ACTIVE_PLAN_ID_KEY, id);
  return record;
}

export function saveActivePlan(
  plan: Blueprint,
  storage: PlanStorage = window.localStorage,
): SavedPlan {
  const validatedPlan = blueprintSchema.parse(plan);
  const plans = readSavedPlans(storage);
  const activeId = storage.getItem(ACTIVE_PLAN_ID_KEY);
  const existing = plans.find((record) => record.id === activeId);
  const record: SavedPlan = {
    id: existing?.id ?? makePlanId(),
    updatedAt: new Date().toISOString(),
    plan: validatedPlan,
  };
  storage.setItem(
    PLAN_LIBRARY_KEY,
    JSON.stringify(existing
      ? plans.map((saved) => saved.id === record.id ? record : saved)
      : [record, ...plans]),
  );
  storage.setItem(CURRENT_PLAN_KEY, JSON.stringify(validatedPlan));
  storage.setItem(ACTIVE_PLAN_ID_KEY, record.id);
  return record;
}

export function deleteSavedPlan(
  id: string,
  storage: PlanStorage = window.localStorage,
): { plans: SavedPlan[]; activePlanId: string } {
  const plans = readSavedPlans(storage);
  const remaining = plans.filter((record) => record.id !== id);
  if (remaining.length === plans.length) {
    throw new Error("That saved plan could not be found on this device.");
  }

  const activeId = storage.getItem(ACTIVE_PLAN_ID_KEY) || "";
  const deletedActivePlan = activeId === id;
  const nextActive = deletedActivePlan ? remaining[0] : remaining.find((record) => record.id === activeId);

  storage.setItem(PLAN_LIBRARY_KEY, JSON.stringify(remaining));
  if (nextActive) {
    storage.setItem(CURRENT_PLAN_KEY, JSON.stringify(nextActive.plan));
    storage.setItem(ACTIVE_PLAN_ID_KEY, nextActive.id);
  } else {
    storage.removeItem(CURRENT_PLAN_KEY);
    storage.removeItem(ACTIVE_PLAN_ID_KEY);
  }

  return { plans: remaining, activePlanId: nextActive?.id ?? "" };
}
