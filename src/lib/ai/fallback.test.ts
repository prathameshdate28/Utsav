import { describe, expect, it } from "vitest";
import { createFallbackBlueprint } from "./fallback";
import { normalizeBlueprint } from "./normalize";
import jaipurWedding from "../../../data/demo/jaipur-wedding.json";
import { blueprintSchema } from "../schemas/blueprint";

describe("offline planning fallbacks", () => {
  it.each([
    ["birthday in Pune for 40 guests, ₹60,000", 60_000],
    ["birthday in Pune for 40 guests, budget ₹60,000", 60_000],
    ["wedding in Jaipur for 300 guests, ₹25 lakh", 2_500_000],
    ["community event in Thane for 400 guests, INR 2 lakh", 200_000],
    ["birthday in Pune for 40 guests, budget of 1,20,000", 120_000],
  ])("recognizes an explicit budget in %s", (prompt, expected) => {
    expect(createFallbackBlueprint(prompt).budget.total).toBe(expected);
  });

  it("estimates realistic budgets by event type and guest count when none is stated", () => {
    const birthday = createFallbackBlueprint("birthday in Pune for 40 guests");
    const wedding = createFallbackBlueprint("wedding in Pune for 40 guests");
    const community = createFallbackBlueprint("community event in Pune for 40 guests");

    expect(birthday.budget.total).toBeGreaterThan(30_000);
    expect(wedding.budget.total).toBeGreaterThan(birthday.budget.total);
    expect(community.budget.total).toBeGreaterThan(30_000);
    expect(new Set([birthday.budget.total, wedding.budget.total, community.budget.total]).size).toBe(3);
  });

  it("creates the three requested demo scenarios with validated, complete sections", () => {
    const wedding = blueprintSchema.parse(jaipurWedding);
    const birthday = createFallbackBlueprint("A 5th birthday for my daughter in Pune, 40 guests, ₹60,000, she loves dinosaurs and butterflies");
    const community = createFallbackBlueprint("Society Ganesh Utsav in Thane, 400 residents, ₹2 lakh, eco-friendly");

    expect([wedding.event.city, birthday.event.city, community.event.city]).toEqual(["Jaipur", "Pune", "Thane"]);
    expect([wedding.event.guests, birthday.event.guests, community.event.guests]).toEqual([300, 40, 400]);
    expect([wedding.budget.total, birthday.budget.total, community.budget.total]).toEqual([2500000, 60000, 200000]);
    for (const plan of [wedding, birthday, community]) {
      expect(plan.budget.categories).toHaveLength(10);
      expect(plan.timeline).toHaveLength(20);
      expect(plan.vendorCategories).toHaveLength(8);
      expect(plan.vendorCategories.every((category) => category.shortlist?.length === 8)).toBe(true);
      expect(plan.ideas.themes.length).toBeGreaterThanOrEqual(3);
      expect(plan.ceremonies?.length).toBeGreaterThanOrEqual(3);
      expect(plan.moodboard).toHaveLength(6);
      expect(plan.budget.categories.reduce((sum, item) => sum + item.amount, 0)).toBe(plan.budget.total);
    }
  });

  it("uses a prompt location instead of guessing Jaipur, including unlisted cities", () => {
    const plan = createFallbackBlueprint("An anniversary celebration in Vancouver for 80 guests");

    expect(plan.eventType).toBe("other");
    expect(plan.event.city).toBe("Vancouver");
    expect(plan.event.title).toBe("Anniversary celebration");
    expect(plan.ceremonies?.[1].name).toBe("Anniversary celebration");
    expect(plan.event.city).not.toBe("Jaipur");
  });

  it("prioritizes the stated location over a later city mentioned as inspiration", () => {
    const plan = createFallbackBlueprint("A wedding in Vancouver inspired by Jaipur style");

    expect(plan.event.city).toBe("Vancouver");
  });

  it("finds the location when a month appears before it in the prompt", () => {
    const plan = createFallbackBlueprint("A wedding in December in Pune for 100 guests");

    expect(plan.event.city).toBe("Pune");
  });

  it.each([
    ["A wedding in Pune on 2027-02-15", "2027-02-15"],
    ["A birthday in Pune on 15/02/2027", "2027-02-15"],
    ["A wedding in Pune on February 15, 2027", "2027-02-15"],
    ["A wedding in Pune on 15 February 2027", "2027-02-15"],
  ])("captures the stated event date from %s", (prompt, expectedDate) => {
    expect(createFallbackBlueprint(prompt).event.date).toBe(expectedDate);
  });

  it("leaves an unstated location unspecified and avoids assuming religious ceremonies", () => {
    const plan = createFallbackBlueprint("A graduation celebration for 80 guests at a garden venue");

    expect(plan.eventType).toBe("other");
    expect(plan.event.city).toBe("Location not specified");
    expect(plan.ceremonies?.map(({ name }) => name)).toEqual([
      "Guest arrival and welcome",
      "Graduation celebration",
      "Gathering, refreshments and close",
    ]);
    expect(plan.ceremonies?.every(({ meaning }) => !/puja|aarti|ritual/i.test(meaning))).toBe(true);
    expect(plan.ideas.menu.some(({ dishes }) => dishes.some(({ name }) => /thali|kesar|cardamom/i.test(name)))).toBe(false);
  });

  it("calculates category amounts from validated shares instead of trusting model arithmetic", () => {
    const candidate = structuredClone(jaipurWedding);
    candidate.budget.categories.forEach((category) => {
      category.amount = 0;
    });
    const plan = normalizeBlueprint(candidate);
    expect(plan.budget.categories.reduce((sum, category) => sum + category.amount, 0)).toBe(plan.budget.total);
    expect(plan.budget.categories.every((category) => category.amount >= 0)).toBe(true);
  });

  it("normalizes common Gemini event-type and menu shape variations", () => {
    const original = structuredClone(jaipurWedding);
    original.budget.categories.forEach((category) => {
      category.amount = 0;
    });
    const candidate = {
      ...original,
      eventType: "Marriage",
      ideas: {
        ...original.ideas,
        menu: {
          Starters: ["Paneer tikka", "Vegetable kebabs"],
          Dessert: ["Gulab jamun"],
        },
      },
    };

    const plan = normalizeBlueprint(candidate);

    expect(plan.eventType).toBe("wedding");
    expect(plan.ideas.menu).toEqual([
      {
        course: "Starters",
        dishes: [
          { name: "Paneer tikka", dietaryTags: [] },
          { name: "Vegetable kebabs", dietaryTags: [] },
        ],
      },
      { course: "Dessert", dishes: [{ name: "Gulab jamun", dietaryTags: [] }] },
    ]);
  });

  it("normalizes generated timeline phase variants and infers unknown phases from lead time", () => {
    const original = structuredClone(jaipurWedding);
    const variants = [
      ["6 months before the event", 180, "6 months"],
      ["3 months out", 90, "3 months"],
      ["1 month before", 30, "1 month"],
      ["1 week prior", 7, "1 week"],
      ["day of event", 0, "day-of"],
      ["planning phase", 30, "1 month"],
    ] as const;
    const candidate = {
      ...original,
      timeline: original.timeline.map((task, index) => {
        const [phase, leadTimeDays] = variants[index % variants.length];
        return { ...task, phase, leadTimeDays };
      }),
    };

    const plan = normalizeBlueprint(candidate);

    expect(plan.timeline.slice(0, variants.length).map((task) => task.phase))
      .toEqual(variants.map(([, , phase]) => phase));
  });

  it("accepts three generated shortlist vendors per category", () => {
    const candidate = structuredClone(jaipurWedding);
    candidate.vendorCategories.forEach((category) => {
      category.shortlist = category.shortlist.slice(0, 3);
    });

    const plan = normalizeBlueprint(candidate);

    expect(plan.vendorCategories.every((category) => category.shortlist.length === 3)).toBe(true);
  });

  it("normalizes vendor questions and red flags returned as strings", () => {
    const original = structuredClone(jaipurWedding);
    const candidate = {
      ...original,
      vendorCategories: original.vendorCategories.map((category, index) => ({
        ...category,
        mustAskQuestions: `Question ${index + 1}`,
        redFlags: `Red flag ${index + 1}`,
      })),
    };

    const plan = normalizeBlueprint(candidate);

    expect(plan.vendorCategories.every((category, index) =>
      category.mustAskQuestions.includes(`Question ${index + 1}`)
      && category.redFlags.includes(`Red flag ${index + 1}`),
    )).toBe(true);
  });

  it("normalizes a budget returned as a categories array using prompt-derived totals", () => {
    const original = structuredClone(jaipurWedding);
    const categories = original.budget.categories.map((category) => ({
      ...category,
      amount: 0,
    }));
    const candidate = { ...original, budget: categories };

    const plan = normalizeBlueprint(candidate, { total: 2500000, baseGuests: 300 });

    expect(plan.budget.total).toBe(2500000);
    expect(plan.budget.baseGuests).toBe(300);
    expect(plan.budget.categories.reduce((sum, category) => sum + category.amount, 0)).toBe(2500000);
  });

  it("uses the prompt-derived budget instead of a different total returned by Gemini", () => {
    const candidate = structuredClone(jaipurWedding);
    candidate.budget.total = 1;

    const plan = normalizeBlueprint(candidate, { total: 800_000, baseGuests: 120 });

    expect(plan.budget.total).toBe(800_000);
    expect(plan.budget.baseGuests).toBe(120);
    expect(plan.budget.categories.reduce((sum, category) => sum + category.amount, 0)).toBe(800_000);
  });

  it("fills omitted vendors, theme palettes, invalid dates, and assumptions from the prompt fallback", () => {
    const original = structuredClone(jaipurWedding);
    const candidate = {
      ...original,
      vendorCategories: undefined,
      event: { ...original.event, date: "February 15th" },
      assumptions: undefined,
      eventType: "Indian wedding celebration",
      ideas: {
        ...original.ideas,
        themes: original.ideas.themes.map((theme) => ({ ...theme, palette: undefined })),
      },
    };
    const fallback = createFallbackBlueprint("A wedding in Jaipur for 300 guests with a ₹25 lakh budget");

    const plan = normalizeBlueprint(candidate, {
      total: fallback.budget.total,
      baseGuests: fallback.budget.baseGuests,
    }, fallback);

    expect(plan.eventType).toBe("wedding");
    expect(plan.vendorCategories).toEqual(fallback.vendorCategories);
    expect(plan.ideas.themes.every((theme) => theme.palette.length >= 3)).toBe(true);
    expect(plan.event.date).toBe(fallback.event.date);
    expect(plan.assumptions).toEqual(fallback.assumptions);
  });

  it("completes missing Gemini sections from the prompt-derived plan and keeps its budget authoritative", () => {
    const candidate = {
      ...structuredClone(jaipurWedding),
      budget: undefined,
      timeline: [],
      vendorCategories: [],
      ideas: undefined,
      ceremonies: [],
      moodboard: [],
    };
    const fallback = createFallbackBlueprint("A birthday in Pune for 40 guests, ₹60,000");

    const plan = normalizeBlueprint(candidate, {
      total: fallback.budget.total,
      baseGuests: fallback.budget.baseGuests,
    }, fallback);

    expect(plan.budget.total).toBe(60_000);
    expect(plan.budget.categories).toEqual(fallback.budget.categories);
    expect(plan.timeline).toEqual(fallback.timeline);
    expect(plan.vendorCategories).toEqual(fallback.vendorCategories);
    expect(plan.ideas.themes).toEqual(fallback.ideas.themes);
    expect(plan.ideas.menu).toEqual(fallback.ideas.menu);
    expect(plan.ceremonies).toEqual(fallback.ceremonies);
    expect(plan.moodboard).toEqual(fallback.moodboard);
  });

  it("rejects a generated plan whose shares do not sum to 100", () => {
    const candidate = structuredClone(jaipurWedding);
    candidate.budget.categories[0].share = 99;
    expect(() => normalizeBlueprint(candidate)).toThrow(/sum to 100/);
  });
});
