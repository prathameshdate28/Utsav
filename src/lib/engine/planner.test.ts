import { describe, expect, it } from "vitest";
import { allocate, budgetDeltaSummary, decodePlan, dueDates, encodePlan, localISODate, readiness, rebalance, reflow } from "./planner";
import { blueprintSchema, type Blueprint } from "@/lib/schemas/blueprint";

function makeBlueprint(): Blueprint {
  const categories = Array.from({ length: 10 }, (_, index) => ({
    id: `category-${index}`,
    name: `Category ${index}`,
    amount: 10000,
    share: 10,
    kind: index === 0 ? "per_head" as const : index === 1 ? "fixed" as const : "semi" as const,
    isEstimate: true,
    saveTip: "Compare itemized quotes.",
    hiddenCostWarnings: ["Check taxes and service fees."],
  }));
  const timeline = Array.from({ length: 20 }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index}`,
    phase: index < 4 ? "6 months" as const : index < 8 ? "3 months" as const : index < 12 ? "1 month" as const : index < 16 ? "1 week" as const : "day-of" as const,
    leadTimeDays: 180 - index * 7,
    ownerRole: "Family",
    reason: "Allow time to confirm details.",
    dependencies: index === 1 ? ["task-0"] : [],
    completed: false,
    dueDate: "2027-01-01",
  }));
  return blueprintSchema.parse({
    eventType: "wedding",
    event: {
      title: "A celebration together",
      city: "Jaipur",
      date: "2027-06-01",
      guests: 100,
      concept: "Traditional and modern",
      accentColor: "#d97706",
    },
    budget: { total: 100000, baseGuests: 100, categories },
    timeline,
    vendorCategories: Array.from({ length: 8 }, (_, index) => ({
      name: `Vendor ${index}`,
      bookByDays: 90,
      mustAskQuestions: ["What is included?"],
      redFlags: ["Unclear payment schedule"],
      shortlist: Array.from({ length: 8 }, (_, vendorIndex) => ({
        id: `vendor-${index}-${vendorIndex}`,
        name: `Demo-Only Fictional Vendor ${index}-${vendorIndex}`,
        tier: "budget" as const,
        priceMin: 1000,
        priceMax: 2000,
        rating: 4.5,
        tags: ["fictional"],
      })),
    })),
    ideas: {
      themes: Array.from({ length: 3 }, (_, index) => ({
        name: `Theme ${index}`,
        palette: ["saffron", "ivory", "green"],
        decor: "Layered floral details",
        entertainment: "Live acoustic music",
        signatureMoment: "A shared welcome",
      })),
      menu: [{ course: "Mains", dishes: [{ name: "Seasonal curry", dietaryTags: ["vegetarian"] }] }],
      invitations: { warm: "Join us to celebrate.", formal: "You are invited to celebrate with us." },
    },
    assumptions: [{ text: "A seated meal is planned.", reason: "No service style was specified." }],
    ceremonies: Array.from({ length: 3 }, (_, index) => ({
      name: `Ceremony ${index}`,
      order: index + 1,
      durationMin: 30,
      itemsNeeded: ["Schedule"],
      responsibleRole: "Family",
      meaning: "Families gather to mark this moment. Traditions vary by family.",
      completed: false,
    })),
    moodboard: Array.from({ length: 6 }, (_, index) => ({
      id: `tile-${index}`,
      caption: `Tile ${index}`,
      prompt: "A warm event scene",
    })),
  });
}

describe("planning engine", () => {
  it("allocates integer amounts that sum exactly and corrects rounding on the largest share", () => {
    const categories = Array.from({ length: 13 }, (_, index) => ({
      id: `c${index}`,
      share: index === 0 ? 8 : index === 1 ? 7 : 85 / 11,
    }));
    const result = allocate(1000001, categories);
    expect(Object.values(result).every(Number.isInteger)).toBe(true);
    expect(Object.values(result).reduce((sum, amount) => sum + amount, 0)).toBe(1000001);
    expect(result.c0).toBeGreaterThan(Math.floor(1000001 * 0.08));
  });

  it("rejects shares that do not sum to 100", () => {
    expect(() => allocate(100, [{ id: "food", share: 90 }])).toThrow(/sum to 100/);
    const invalid = makeBlueprint();
    invalid.budget.categories[0].share = 11;
    expect(() => blueprintSchema.parse(invalid)).toThrow(/sum to 100/);
  });

  it("supports zero guests and zero total without producing negative values", () => {
    const result = rebalance(makeBlueprint(), { guests: 0, total: 0 });
    expect(result.blueprint.event.guests).toBe(0);
    expect(result.blueprint.budget.categories.every((category) => category.amount === 0)).toBe(true);
    expect(Object.values(result.deltas).every((delta) => delta <= 0)).toBe(true);
  });

  it("rebalances per-head, fixed, and semi-scaled amounts", () => {
    const result = rebalance(makeBlueprint(), { guests: 200 });
    expect(result.blueprint.budget.categories[0].amount).toBe(20000);
    expect(result.blueprint.budget.categories[1].amount).toBe(10000);
    expect(result.blueprint.budget.categories[2].amount).toBe(15000);
    expect(Object.values(result.deltas).reduce((sum, delta) => sum + delta, 0)).toBe(50000);
  });

  it("uses readable category names instead of internal IDs in budget explanations", () => {
    const summary = budgetDeltaSummary(
      [
        { id: "b2", name: "Wedding venue" },
        { id: "b3", name: "Catering" },
      ],
      { b2: -16000, b3: -24000 },
    );

    expect(summary).toEqual([
      { category: "Wedding venue", changeInRupees: -16000 },
      { category: "Catering", changeInRupees: -24000 },
    ]);
    expect(JSON.stringify(summary)).not.toContain("b2");
    expect(JSON.stringify(summary)).not.toContain("b3");
  });

  it("marks past due dates compressed and handles an event within a week", () => {
    const tasks = [{ leadTimeDays: 10 }, { leadTimeDays: 0 }];
    expect(dueDates("2026-11-03", tasks, "2026-10-29").map((item) => item.compressed)).toEqual([true, false]);
    expect(dueDates("2026-11-03", [{ leadTimeDays: 2 }], "2026-10-29")[0].dueDate).toBe("2026-11-01");
  });

  it("uses the local calendar date when normalizing Date objects", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(localISODate(now)).toBe(expected);
  });

  it("reflows while keeping dependencies in order", () => {
    const blueprint = makeBlueprint();
    blueprint.timeline[0].leadTimeDays = 1;
    blueprint.timeline[1].leadTimeDays = 30;
    const result = reflow(blueprint, "2026-11-05", "2026-10-29");
    const prerequisite = result.timeline.find((task) => task.id === "task-0")!;
    const dependent = result.timeline.find((task) => task.id === "task-1")!;
    expect(prerequisite.dueDate! <= dependent.dueDate!).toBe(true);
    expect(prerequisite.dueDate).toBe("2026-11-04");
    expect(result.event.date).toBe("2026-11-05");
  });

  it("rejects dependency cycles", () => {
    const blueprint = makeBlueprint();
    blueprint.timeline[0].dependencies = ["task-1"];
    expect(() => blueprintSchema.parse(blueprint)).toThrow(/cycles/);
    expect(() => reflow(blueprint, "2027-06-01", "2026-10-29")).toThrow(/cycles/);
  });

  it("computes weighted readiness and recommends an action", () => {
    const tasks = makeBlueprint().timeline;
    tasks[0].completed = true;
    tasks[1].dueDate = "2026-10-20";
    const result = readiness(tasks, "2026-10-29");
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.nextBestAction?.id).toBe("task-1");
  });

  it("round-trips validated plans and rejects garbage", () => {
    const blueprint = makeBlueprint();
    expect(decodePlan(encodePlan(blueprint))).toEqual(blueprint);
    expect(() => decodePlan("not-a-valid-plan")).toThrow();
    expect(() => decodePlan("")).toThrow();
  });
});
