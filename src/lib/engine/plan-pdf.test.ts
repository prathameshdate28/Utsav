import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { compressToBase64 } from "lz-string";
import samplePlanData from "../../../data/demo/jaipur-wedding.json";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import { buildPdfSections, createPlanPdf, importPlanPdf } from "./plan-pdf";

const samplePlan = blueprintSchema.parse(samplePlanData);
const fontFiles = [
  new URL("../../../public/fonts/noto-sans-latin-400-normal.woff", import.meta.url),
  new URL("../../../public/fonts/noto-sans-latin-ext-400-normal.woff", import.meta.url),
  new URL("../../../public/fonts/noto-sans-devanagari-400-normal.woff", import.meta.url),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("portable plan PDFs", () => {
  it("keeps internal IDs and accent-color metadata out of the reader-facing sections", () => {
    const visibleText = JSON.stringify(buildPdfSections(samplePlan));

    expect(visibleText).not.toContain(samplePlan.budget.categories[0].id);
    expect(visibleText).not.toContain(samplePlan.timeline[0].id);
    expect(visibleText).not.toContain(samplePlan.vendorCategories[0].shortlist[0].id);
    expect(visibleText).not.toContain(samplePlan.moodboard[0].id);
    expect(visibleText).not.toContain("Accent color:");
    expect(visibleText).toContain(samplePlan.budget.categories[0].saveTip);
    expect(visibleText).toContain(samplePlan.timeline[0].reason);
    expect(visibleText).toContain(samplePlan.vendorCategories[0].mustAskQuestions[0]);
  });

  it("removes short generated IDs throughout PDF text while keeping readable task dependencies", () => {
    const planWithShortIds = {
      ...samplePlan,
      budget: {
        ...samplePlan.budget,
        categories: [{ ...samplePlan.budget.categories[0], id: "b1" }, ...samplePlan.budget.categories.slice(1)],
      },
      timeline: samplePlan.timeline.map((task, index) => ({
        ...task,
        id: index === 0 ? "t9" : task.id,
        dependencies: index === 1
          ? ["t9"]
          : task.dependencies.map((dependency) => dependency === samplePlan.timeline[0].id ? "t9" : dependency),
      })),
      vendorCategories: samplePlan.vendorCategories.map((category, index) => index === 0
        ? { ...category, shortlist: [{ ...category.shortlist[0], id: "c10" }, ...category.shortlist.slice(1)] }
        : category),
    };
    const visibleText = JSON.stringify(buildPdfSections(planWithShortIds));

    expect(visibleText).not.toMatch(/\b(?:b1|t9|c10)\b/i);
    expect(visibleText).toContain("Confirm your event priorities");
    expect(visibleText).toContain("Depends on: Confirm your event priorities");
    expect(visibleText).not.toContain("Accent color:");
  });

  it("avoids repeating incomplete and estimate labels in each item", () => {
    const sections = buildPdfSections(samplePlan);
    const budget = sections.find((section) => section.heading === "Budget");
    const timeline = sections.find((section) => section.heading === "Timeline");
    const ceremonies = sections.find((section) => section.heading === "Ceremonies");

    expect(JSON.stringify(budget)).not.toMatch(/\bestimate(?:d)?\b/i);
    expect(JSON.stringify(timeline)).not.toMatch(/\bto do\b/i);
    expect(JSON.stringify(ceremonies)).not.toMatch(/\bto do\b/i);
    expect(JSON.stringify(timeline)).toContain("upcoming");
    expect(JSON.stringify(timeline)).toContain("Complete");
  });

  it("keeps theme palette colors visual instead of showing color codes", () => {
    const themes = buildPdfSections(samplePlan).find((section) => section.heading === "Celebration themes");
    const themeEntry = themes?.entries[0];

    expect(themeEntry?.palette).toEqual(samplePlan.ideas.themes[0].palette);
    expect(JSON.stringify(themeEntry?.details)).not.toMatch(/#[\da-f]{6}/i);
    expect(themeEntry?.palette?.every((color) => /^#[\da-f]{6}$/i.test(color))).toBe(true);
  });

  it("uses the canonical event city and date in invitation wording without dropping its other text", () => {
    const planWithMismatchedInvitationCity = {
      ...samplePlan,
      ideas: {
        ...samplePlan.ideas,
        invitations: {
          warm: "Join us in Mumbai on Sunday, February 16, 2027 for a joyful celebration.",
          formal: "We warmly invite you to celebrate in Delhi on 16/02/2027.",
        },
      },
    };
    const invitations = buildPdfSections(planWithMismatchedInvitationCity)
      .find((section) => section.heading === "Invitation wording");

    const formattedEventDate = "15 February 2027";
    expect(invitations?.entries[0].details[0]).toContain(`in ${samplePlan.event.city} on Monday, ${formattedEventDate}`);
    expect(invitations?.entries[1].details[0]).toContain(`in ${samplePlan.event.city} on ${formattedEventDate}`);
    expect(invitations?.entries[0].details[0]).toContain("for a joyful celebration.");
    expect(invitations?.entries[1].details[0]).toContain("We warmly invite you");
    expect(JSON.stringify(invitations)).not.toContain("Mumbai");
    expect(JSON.stringify(invitations)).not.toContain("Delhi");
    expect(JSON.stringify(invitations)).not.toContain("February 16, 2027");
    expect(JSON.stringify(invitations)).not.toContain("16/02/2027");
    expect(JSON.stringify(invitations)).not.toContain("Sunday");
  });

  it("exports the complete plan into a readable PDF and imports it without data loss", async () => {
    let nextFont = 0;
    vi.stubGlobal("fetch", async () => new Response(await readFile(fontFiles[nextFont++])));
    const unicodePlan = {
      ...samplePlan,
      event: { ...samplePlan.event, title: "उत्सव", city: "पुणे" },
    };

    const bytes = await createPlanPdf(unicodePlan);
    const pdf = await PDFDocument.load(bytes);
    const imported = await importPlanPdf(bytes);

    expect(pdf.getCreator()).toBe("Utsav");
    expect(pdf.getTitle()).toContain(unicodePlan.event.title);
    expect(pdf.getKeywords()).toMatch(/utsav-transfer-check-sha256:[\da-f]{64}/i);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(imported).toEqual(unicodePlan);

    pdf.setKeywords(["utsav-plan-pdf-v1", "utsav-transfer-check-sha256:" + "0".repeat(64)]);
    await expect(importPlanPdf(await pdf.save())).rejects.toThrow("transfer check is missing or does not match");
  });

  it("rejects files that are not PDFs", async () => {
    await expect(importPlanPdf(new TextEncoder().encode("not a PDF"))).rejects.toThrow("Choose a valid PDF");
  });

  it("rejects PDFs without the Utsav transfer marker", async () => {
    const pdf = await PDFDocument.create();
    pdf.setCreator("Utsav");

    await expect(importPlanPdf(await pdf.save())).rejects.toThrow("not in the Utsav portable plan format");
  });

  it("rejects malformed or schema-invalid embedded plan data", async () => {
    const pdf = await PDFDocument.create();
    pdf.setCreator("Utsav");
    pdf.setKeywords(["utsav-plan-pdf-v1"]);
    pdf.setSubject("utsav-plan-pdf-v1:" + compressToBase64(JSON.stringify({ event: { title: "Incomplete" } })));

    await expect(importPlanPdf(await pdf.save())).rejects.toThrow("plan data in this PDF is invalid");
  });
});
