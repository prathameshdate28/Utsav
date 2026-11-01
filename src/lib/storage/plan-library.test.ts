import { describe, expect, it } from "vitest";
import samplePlanData from "../../../data/demo/jaipur-wedding.json";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  activateSavedPlan,
  deleteSavedPlan,
  loadActivePlan,
  readSavedPlans,
  saveActivePlan,
  saveNewPlan,
} from "./plan-library";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const samplePlan = blueprintSchema.parse(samplePlanData);

describe("plan library", () => {
  it("keeps multiple plans and updates the active plan in place", () => {
    const storage = memoryStorage();
    const first = saveNewPlan(samplePlan, storage);
    const secondPlan = {
      ...samplePlan,
      event: { ...samplePlan.event, title: "A second celebration" },
    };
    saveNewPlan(secondPlan, storage);

    expect(readSavedPlans(storage)).toHaveLength(2);
    expect(loadActivePlan(storage)?.event.title).toBe("A second celebration");

    activateSavedPlan(first.id, storage);
    saveActivePlan({
      ...samplePlan,
      event: { ...samplePlan.event, title: "Updated first celebration" },
    }, storage);

    expect(readSavedPlans(storage)).toHaveLength(2);
    expect(loadActivePlan(storage)?.event.title).toBe("Updated first celebration");
  });

  it("migrates the previous single-plan storage format", () => {
    const storage = memoryStorage({ "utsav-plan": JSON.stringify(samplePlan) });

    const migrated = readSavedPlans(storage);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].plan).toEqual(samplePlan);
    expect(storage.getItem("utsav-active-plan-id")).toBe(migrated[0].id);
  });

  it("deletes the active plan and activates the next saved plan", () => {
    const storage = memoryStorage();
    const first = saveNewPlan(samplePlan, storage);
    const second = saveNewPlan({
      ...samplePlan,
      event: { ...samplePlan.event, title: "Another celebration" },
    }, storage);

    const result = deleteSavedPlan(second.id, storage);

    expect(result.plans).toHaveLength(1);
    expect(result.activePlanId).toBe(first.id);
    expect(loadActivePlan(storage)?.event.title).toBe(samplePlan.event.title);
  });

  it("clears the active plan when the last plan is deleted", () => {
    const storage = memoryStorage();
    const saved = saveNewPlan(samplePlan, storage);

    const result = deleteSavedPlan(saved.id, storage);

    expect(result.plans).toHaveLength(0);
    expect(loadActivePlan(storage)).toBeNull();
    expect(storage.getItem("utsav-plan")).toBeNull();
  });
});
