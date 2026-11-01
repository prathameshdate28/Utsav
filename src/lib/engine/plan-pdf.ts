import "regenerator-runtime/runtime";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { compressToBase64, decompressFromBase64 } from "lz-string";
import { blueprintSchema, type Blueprint } from "@/lib/schemas/blueprint";
import { formatINR } from "./format";

const FORMAT_MARKER = "utsav-plan-pdf-v1";
const SUBJECT_PREFIX = `${FORMAT_MARKER}:`;
const VERIFICATION_KEYWORD_PREFIX = "utsav-transfer-check-sha256:";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PAYLOAD_LENGTH = 500_000;
const MAX_DECOMPRESSED_LENGTH = 2_000_000;
const FONT_ASSETS = [
  "/fonts/noto-sans-latin-400-normal.woff",
  "/fonts/noto-sans-latin-ext-400-normal.woff",
  "/fonts/noto-sans-devanagari-400-normal.woff",
] as const;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_MARGIN = 44;
const PAGE_BOTTOM = 48;
const BRAND_PRIMARY = rgb(0.71, 0.31, 0.05);
const BRAND_ACCENT = rgb(0.94, 0.64, 0.02);
const BRAND_WASH = rgb(1, 0.98, 0.94);
const BRAND_BORDER = rgb(0.9, 0.84, 0.74);

type FontSet = {
  latin: PDFFont;
  latinExt: PDFFont;
  devanagari: PDFFont;
  glyphFonts: Array<{
    font: PDFFont;
    hasGlyphForCodePoint: (codePoint: number) => boolean;
  }>;
};

type PdfEntry = {
  title: string;
  details: string[];
  palette?: string[];
};

type PdfSection = {
  heading: string;
  entries: PdfEntry[];
};

function formatPdfPrice(amount: number): string {
  return formatINR(amount);
}

function formatPdfDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MONTH_NAME_PATTERN = "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const INVITATION_DATE_PATTERN = String.raw`(?:\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b|\b${MONTH_NAME_PATTERN}\s+\d{1,2}(?:st|nd|rd|th)?[,]?(?:\s+\d{4})?\b|\b\d{1,2}(?:st|nd|rd|th)?(?:\s+of)?\s+${MONTH_NAME_PATTERN}(?:[,]?\s+\d{4})?\b)`;

function alignInvitationEventDetails(text: string, city: string, date: string): string {
  const formattedDate = formatPdfDate(date);
  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long" });
  const withCanonicalWeekday = text.replace(
    new RegExp(String.raw`\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?=,?\s+(?:${INVITATION_DATE_PATTERN}))`, "giu"),
    weekday,
  );
  const normalizedDate = withCanonicalWeekday.replace(new RegExp(INVITATION_DATE_PATTERN, "giu"), formattedDate);
  const dateWithOptionalWeekday = String.raw`(?:${weekday},\s+)?${escapeRegExp(formattedDate)}`;
  const locationBeforeDate = new RegExp(
    String.raw`\b(in|at)\s+([\p{Lu}][\p{L}\p{M}'’.-]*(?:\s+[\p{Lu}][\p{L}\p{M}'’.-]*){0,3})(?=\s+on\s+${dateWithOptionalWeekday}\b)`,
    "gu",
  );
  return normalizedDate.replace(locationBeforeDate, (_match, preposition: string) => `${preposition} ${city}`);
}

function hideInternalIds(sections: PdfSection[], ids: Set<string>): PdfSection[] {
  const internalIdPattern = [...ids]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  if (!internalIdPattern) return sections;
  const matcher = new RegExp(`(^|[^\\p{L}\\p{N}])(?:${internalIdPattern})(?=$|[^\\p{L}\\p{N}])`, "giu");
  return sections.map((section) => ({
    heading: section.heading,
    entries: section.entries
      .map((entry) => ({
        title: entry.title.replace(matcher, "$1").replace(/\s{2,}/g, " ").trim(),
        details: entry.details
          .map((detail) => detail.replace(matcher, "$1").replace(/\s{2,}/g, " ").trim())
          .filter(Boolean),
        palette: entry.palette,
      }))
      .filter((entry) => entry.title || entry.details.length > 0),
  }));
}

export function buildPdfSections(plan: Blueprint): PdfSection[] {
  const taskTitles = new Map(plan.timeline.map((task) => [task.id, task.title]));
  const sections: PdfSection[] = [
    {
      heading: "Event details",
      entries: [{
        title: plan.event.title,
        details: [
          `Location: ${plan.event.city}`,
          `Date: ${formatPdfDate(plan.event.date)}`,
          `Guests: ${plan.event.guests.toLocaleString("en-IN")}`,
          `Celebration style: ${plan.event.concept}`,
        ],
      }],
    },
    {
      heading: "Budget",
      entries: [
        {
          title: `Total budget: ${formatPdfPrice(plan.budget.total)}`,
          details: [`Budget planned for ${plan.budget.baseGuests.toLocaleString("en-IN")} guests.`],
        },
        ...plan.budget.categories.map((category) => ({
          title: category.name,
          details: [
            `${formatPdfPrice(category.amount)} · ${category.share}% of budget · ${
              category.kind === "per_head" ? "Per guest" : category.kind === "fixed" ? "Fixed cost" : "Flexible cost"
            }`,
            `Saving tip: ${category.saveTip}`,
            ...category.hiddenCostWarnings.map((warning) => `Cost to check: ${warning}`),
          ],
        })),
      ],
    },
    {
      heading: "Timeline",
      entries: [
        {
          title: "Your planning roadmap",
          details: [`${plan.timeline.filter((task) => task.completed).length} of ${plan.timeline.length} steps complete · Steps marked “Complete” are finished; the rest are upcoming.`],
        },
        ...plan.timeline.map((task) => ({
          title: task.title,
          details: [
            `Planning phase: ${task.phase === "day-of" ? "Event day" : `${task.phase} before the event`}${task.dueDate ? ` · Due ${formatPdfDate(task.dueDate)}` : ""}${task.completed ? " · Complete" : ""}${task.compressed ? " · Schedule adjusted" : ""}`,
            `Owner: ${task.ownerRole} · Recommended lead time: ${task.leadTimeDays} days`,
            `Why it matters: ${task.reason}`,
            `Depends on: ${task.dependencies.length ? task.dependencies.map((id) => taskTitles.get(id) ?? "Related task").join(", ") : "No prerequisites"}`,
          ],
        })),
      ],
    },
    {
      heading: "Vendor planning",
      entries: plan.vendorCategories.map((category) => ({
        title: category.name,
        details: [
          `Booking guide: Start looking about ${category.bookByDays} days ahead`,
          ...category.shortlist.map((vendor) =>
            `${vendor.name} · ${vendor.tier[0].toUpperCase()}${vendor.tier.slice(1)} · ${formatPdfPrice(vendor.priceMin)}–${formatPdfPrice(vendor.priceMax)} · ${vendor.rating}/5${vendor.tags.length ? ` · ${vendor.tags.join(", ")}` : ""}`,
          ),
          ...category.mustAskQuestions.map((question) => `Ask each provider: ${question}`),
          ...category.redFlags.map((flag) => `Watch for: ${flag}`),
        ],
      })),
    },
    {
      heading: "Celebration themes",
      entries: plan.ideas.themes.map((theme) => ({
        title: theme.name,
        details: [
          `Decor: ${theme.decor}`,
          `Entertainment: ${theme.entertainment}`,
          `Signature moment: ${theme.signatureMoment}`,
        ],
        palette: theme.palette,
      })),
    },
    {
      heading: "Menu",
      entries: plan.ideas.menu.map((course) => ({
        title: course.course,
        details: course.dishes.map((dish) =>
          `${dish.name}${dish.dietaryTags.length ? ` · ${dish.dietaryTags.join(", ")}` : ""}`,
        ),
      })),
    },
    {
      heading: "Invitation wording",
      entries: [
        {
          title: "Warm invitation",
          details: [alignInvitationEventDetails(plan.ideas.invitations.warm, plan.event.city, plan.event.date)],
        },
        {
          title: "Formal invitation",
          details: [alignInvitationEventDetails(plan.ideas.invitations.formal, plan.event.city, plan.event.date)],
        },
      ],
    },
    {
      heading: "Ceremonies",
      entries: plan.ceremonies.map((ceremony) => ({
        title: `${ceremony.order}. ${ceremony.name}`,
        details: [
          `Duration: ${ceremony.durationMin} minutes${ceremony.completed ? " · Complete" : ""}`,
          `Responsible: ${ceremony.responsibleRole}`,
          `Items to prepare: ${ceremony.itemsNeeded.join(", ")}`,
          `Meaning: ${ceremony.meaning}`,
        ],
      })),
    },
    {
      heading: "Mood board",
      entries: plan.moodboard.map((tile) => ({
        title: tile.caption,
        details: [
          `Visual direction: ${tile.prompt}`,
          ...(tile.imageUrl ? ["A reference image is included in the portable plan data."] : []),
        ],
      })),
    },
    {
      heading: "Assumptions",
      entries: plan.assumptions.map((assumption) => ({
        title: assumption.text,
        details: [`Reason: ${assumption.reason}`],
      })),
    },
  ];
  const ids = new Set([
    ...plan.budget.categories.map((category) => category.id),
    ...plan.timeline.flatMap((task) => [task.id, ...task.dependencies]),
    ...plan.vendorCategories.flatMap((category) => category.shortlist.map((vendor) => vendor.id)),
    ...plan.moodboard.map((tile) => tile.id),
  ]);
  return hideInternalIds(sections, ids);
}

async function loadFont(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("A font needed to create the plan PDF could not be loaded.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

function fontRuns(text: string, fonts: FontSet) {
  const runs: Array<{ text: string; font: PDFFont }> = [];
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    const selected = fonts.glyphFonts.find((candidate) => candidate.hasGlyphForCodePoint(codePoint));
    const font = selected?.font ?? fonts.latin;
    const displayCharacter = selected ? character : "?";
    const previous = runs[runs.length - 1];
    if (previous?.font === font) {
      previous.text += displayCharacter;
    } else {
      runs.push({ text: displayCharacter, font });
    }
  }
  return runs;
}

function measureText(text: string, size: number, fonts: FontSet): number {
  return fontRuns(text, fonts).reduce(
    (width, run) => width + run.font.widthOfTextAtSize(run.text, size),
    0,
  );
}

function wrapText(text: string, size: number, maxWidth: number, fonts: FontSet): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    const words = paragraph.match(/\S+\s*/gu) ?? [];
    for (const word of words) {
      const candidate = line + word;
      if (line && measureText(candidate, size, fonts) > maxWidth) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line.trimEnd());
    if (!paragraph && text.includes("\n")) lines.push("");
  }
  return lines;
}

function drawRichText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  color: ReturnType<typeof rgb>,
  fonts: FontSet,
): void {
  let cursorX = x;
  for (const run of fontRuns(text, fonts)) {
    page.drawText(run.text, { x: cursorX, y, size, font: run.font, color });
    cursorX += run.font.widthOfTextAtSize(run.text, size);
  }
}

async function checksumPayload(payload: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("This browser cannot verify the plan data needed for PDF export or import.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const NAMED_PALETTE_COLORS: Record<string, string> = {
  amber: "#F2A900",
  beige: "#F5F5DC",
  black: "#000000",
  blush: "#DE8C9D",
  blue: "#4169E1",
  burgundy: "#800020",
  coral: "#FF7F50",
  cream: "#FFF8EE",
  gold: "#D4AF37",
  green: "#228B22",
  ivory: "#FFFFF0",
  lavender: "#967BB6",
  marigold: "#F2A900",
  maroon: "#800000",
  navy: "#000080",
  peach: "#FFCBA4",
  pink: "#FFC0CB",
  purple: "#800080",
  red: "#C62828",
  rose: "#C08081",
  sage: "#9CAF88",
  teal: "#008080",
  white: "#FFFFFF",
  yellow: "#FFD700",
};

function paletteColor(value: string): ReturnType<typeof rgb> | null {
  const normalized = value.trim().toLowerCase();
  const namedColor = NAMED_PALETTE_COLORS[normalized];
  const candidate = namedColor ?? value.trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(candidate);
  if (!match) return null;
  const valueInt = Number.parseInt(match[1], 16);
  return rgb(
    ((valueInt >> 16) & 0xff) / 255,
    ((valueInt >> 8) & 0xff) / 255,
    (valueInt & 0xff) / 255,
  );
}

function drawPaletteSwatches(page: PDFPage, palette: string[], x: number, y: number): void {
  const colors = palette.map(paletteColor).filter((color): color is NonNullable<typeof color> => color !== null);
  if (!colors.length) return;

  const swatchAreaWidth = 96;
  const spacing = colors.length > 1
    ? Math.min(20, swatchAreaWidth / (colors.length - 1))
    : 0;
  const rowStartX = x + (swatchAreaWidth - spacing * (colors.length - 1)) / 2;
  colors.forEach((color, index) => {
    page.drawCircle({
      x: rowStartX + spacing * index,
      y,
      size: 5,
      color,
      borderColor: BRAND_BORDER,
      borderWidth: 0.5,
    });
  });
}

export async function createPlanPdf(planValue: Blueprint): Promise<Uint8Array> {
  const plan = blueprintSchema.parse(planValue);
  const payload = compressToBase64(JSON.stringify(plan));
  const payloadChecksum = await checksumPayload(payload);
  const verificationKeyword = `${VERIFICATION_KEYWORD_PREFIX}${payloadChecksum}`;
  if (payload.length > MAX_PAYLOAD_LENGTH) {
    throw new Error("This plan is too large to package in a PDF.");
  }

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [latinBytes, latinExtBytes, devanagariBytes] = await Promise.all([
    loadFont(FONT_ASSETS[0]),
    loadFont(FONT_ASSETS[1]),
    loadFont(FONT_ASSETS[2]),
  ]);
  const fontSet: FontSet = {
    latin: await pdf.embedFont(latinBytes, { subset: true }),
    latinExt: await pdf.embedFont(latinExtBytes, { subset: true }),
    devanagari: await pdf.embedFont(devanagariBytes, { subset: true }),
    glyphFonts: [],
  };
  const fontkitFonts = [latinBytes, latinExtBytes, devanagariBytes].map((bytes) => fontkit.create(bytes));
  fontSet.glyphFonts = [
    { font: fontSet.devanagari, hasGlyphForCodePoint: (codePoint) => fontkitFonts[2].hasGlyphForCodePoint(codePoint) },
    { font: fontSet.latinExt, hasGlyphForCodePoint: (codePoint) => fontkitFonts[1].hasGlyphForCodePoint(codePoint) },
    { font: fontSet.latin, hasGlyphForCodePoint: (codePoint) => fontkitFonts[0].hasGlyphForCodePoint(codePoint) },
  ];

  pdf.setTitle(`${plan.event.title} — Utsav plan`);
  pdf.setAuthor("Utsav");
  pdf.setCreator("Utsav");
  pdf.setProducer("Utsav Plan PDF Export");
  pdf.setSubject(`${SUBJECT_PREFIX}${payload}`);
  pdf.setKeywords([FORMAT_MARKER, verificationKeyword]);
  pdf.setCreationDate(new Date());
  pdf.setModificationDate(new Date());

  const pages: PDFPage[] = [];
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(page);
  let y = PAGE_HEIGHT - 54;
  const contentWidth = PAGE_WIDTH - PAGE_MARGIN * 2;
  const bodyColor = rgb(0.18, 0.16, 0.16);
  const mutedColor = rgb(0.38, 0.35, 0.35);
  const primaryColor = BRAND_PRIMARY;

  function drawPageHeader(target: PDFPage, cover = false): void {
    target.drawCircle({
      x: PAGE_MARGIN + 4,
      y: PAGE_HEIGHT - 29,
      size: 3,
      color: BRAND_ACCENT,
    });
    target.drawText("UTSAV", {
      x: PAGE_MARGIN + 14,
      y: PAGE_HEIGHT - 32,
      size: 9,
      font: fontSet.latin,
      color: BRAND_PRIMARY,
    });
    target.drawText("CELEBRATION PLAN", {
      x: PAGE_MARGIN + 52,
      y: PAGE_HEIGHT - 32,
      size: 7,
      font: fontSet.latin,
      color: mutedColor,
    });
    target.drawLine({
      start: { x: PAGE_MARGIN, y: PAGE_HEIGHT - 43 },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: PAGE_HEIGHT - 43 },
      thickness: 0.6,
      color: BRAND_BORDER,
    });

    if (cover) {
      target.drawRectangle({
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT - 190,
        width: contentWidth,
        height: 132,
        color: BRAND_WASH,
        borderColor: BRAND_BORDER,
        borderWidth: 0.8,
      });
      target.drawRectangle({
        x: PAGE_MARGIN,
        y: PAGE_HEIGHT - 190,
        width: 4,
        height: 132,
        color: BRAND_ACCENT,
      });
    } else {
      target.drawText("PLAN DETAILS", {
        x: PAGE_WIDTH - PAGE_MARGIN - fontSet.latin.widthOfTextAtSize("PLAN DETAILS", 7),
        y: PAGE_HEIGHT - 32,
        size: 7,
        font: fontSet.latin,
        color: mutedColor,
      });
    }
  }

  drawPageHeader(page, true);
  let coverTitleY = PAGE_HEIGHT - 83;
  for (const line of wrapText(plan.event.title, 21, contentWidth - 40, fontSet)) {
    drawRichText(page, line, PAGE_MARGIN + 18, coverTitleY, 21, primaryColor, fontSet);
    coverTitleY -= 27;
  }
  const coverMetaY = Math.min(PAGE_HEIGHT - 160, coverTitleY - 4);
  drawRichText(
    page,
    `${plan.event.city} · ${plan.event.date} · ${plan.event.guests.toLocaleString("en-IN")} guests`,
    PAGE_MARGIN + 18,
    coverMetaY,
    9.5,
    mutedColor,
    fontSet,
  );
  y = Math.min(PAGE_HEIGHT - 222, coverMetaY - 48);

  function addPage(): void {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawPageHeader(page);
    y = PAGE_HEIGHT - 66;
  }

  function drawParagraph(text: string, options: { size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {}): void {
    const size = options.size ?? 9.5;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.45;
    const lines = wrapText(text, size, contentWidth - indent, fontSet);
    for (const line of lines) {
      if (y < PAGE_BOTTOM + lineHeight) addPage();
      drawRichText(page, line, PAGE_MARGIN + indent, y, size, options.color ?? bodyColor, fontSet);
      y -= lineHeight;
    }
  }

  drawParagraph("Complete celebration plan · All prices are estimates", {
    size: 8.5,
    color: mutedColor,
  });
  drawParagraph(`UTSAV TRANSFER CHECK · SHA-256 ${payloadChecksum}`, {
    size: 7,
    color: mutedColor,
  });
  y -= 15;

  for (const section of buildPdfSections(plan)) {
    const firstEntry = section.entries[0];
    const firstPaletteWidth = firstEntry?.palette ? 145 : 0;
    const firstTitleLines = firstEntry ? wrapText(firstEntry.title, 10.5, contentWidth - 32 - firstPaletteWidth, fontSet) : [];
    const firstDetailLines = firstEntry?.details.flatMap((detail) => wrapText(detail, 9, contentWidth - 42 - firstPaletteWidth, fontSet)) ?? [];
    const firstEntryHeight = Math.max(
      15 + firstTitleLines.length * 14 + firstDetailLines.length * 12 + 8,
      firstEntry?.palette ? 64 : 0,
    );
    if (y < Math.max(PAGE_BOTTOM + 45, PAGE_BOTTOM + firstEntryHeight + 34)) addPage();
    const sectionTop = y;
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: sectionTop - 21,
      width: contentWidth,
      height: 27,
      color: BRAND_PRIMARY,
    });
    page.drawRectangle({
      x: PAGE_MARGIN,
      y: sectionTop - 21,
      width: 3.5,
      height: 27,
      color: BRAND_ACCENT,
    });
    drawRichText(page, section.heading, PAGE_MARGIN + 12, sectionTop - 4, 13, rgb(1, 1, 1), fontSet);
    y = sectionTop - 36;

    for (const entry of section.entries) {
      const paletteWidth = entry.palette ? 145 : 0;
      const titleLines = wrapText(entry.title, 10.5, contentWidth - 32 - paletteWidth, fontSet);
      const detailBlocks = entry.details.map((detail) =>
        wrapText(detail, 9, contentWidth - 42 - paletteWidth, fontSet),
      );
      const detailLineCount = detailBlocks.reduce((count, lines) => count + lines.length, 0);
      const cardHeight = Math.max(
        15 + titleLines.length * 14 + detailLineCount * 12 + 8,
        entry.palette ? 64 : 0,
      );
      const availableHeight = PAGE_HEIGHT - PAGE_BOTTOM * 2 - 80;

      if (cardHeight > availableHeight) {
        drawParagraph(entry.title, { size: 10.5, color: primaryColor });
        for (const detail of entry.details) {
          drawParagraph(`• ${detail}`, { size: 9, color: mutedColor, indent: 8 });
        }
        if (entry.palette) {
          if (y < PAGE_BOTTOM + 60) addPage();
          drawPaletteSwatches(page, entry.palette, PAGE_WIDTH - PAGE_MARGIN - 112, y - 25);
          y -= 58;
        }
        y -= 5;
        continue;
      }

      if (y - cardHeight < PAGE_BOTTOM) addPage();
      const cardBottom = y - cardHeight;
      page.drawRectangle({
        x: PAGE_MARGIN + 2,
        y: cardBottom,
        width: contentWidth - 4,
        height: cardHeight,
        color: rgb(1, 0.997, 0.985),
        borderColor: BRAND_BORDER,
        borderWidth: 0.45,
      });
      page.drawRectangle({
        x: PAGE_MARGIN + 2,
        y: cardBottom,
        width: 2.5,
        height: cardHeight,
        color: BRAND_ACCENT,
      });

      let entryY = y - 15;
      for (const line of titleLines) {
        drawRichText(page, line, PAGE_MARGIN + 14, entryY, 10.5, primaryColor, fontSet);
        entryY -= 14;
      }
      for (const lines of detailBlocks) {
        page.drawCircle({
          x: PAGE_MARGIN + 15,
          y: entryY + 3,
          size: 1.3,
          color: BRAND_ACCENT,
        });
        for (const line of lines) {
          drawRichText(page, line, PAGE_MARGIN + 22, entryY, 9, bodyColor, fontSet);
          entryY -= 12;
        }
      }
      if (entry.palette) {
        drawPaletteSwatches(page, entry.palette, PAGE_WIDTH - PAGE_MARGIN - 112, cardBottom + 32);
      }
      y = cardBottom - 6;
    }
    y -= 8;
  }

  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: PAGE_MARGIN, y: 33 },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: 33 },
      thickness: 0.5,
      color: rgb(0.84, 0.80, 0.78),
    });
    currentPage.drawCircle({
      x: PAGE_MARGIN + 3,
      y: 23,
      size: 2,
      color: BRAND_ACCENT,
    });
    currentPage.drawText("Utsav · Celebration Plan", {
      x: PAGE_MARGIN + 10,
      y: 20,
      size: 8,
      font: fontSet.latin,
      color: mutedColor,
    });
    currentPage.drawText(`${index + 1} / ${pages.length}`, {
      x: PAGE_WIDTH - PAGE_MARGIN - 34,
      y: 20,
      size: 8,
      font: fontSet.latin,
      color: mutedColor,
    });
  });

  return pdf.save();
}

export async function importPlanPdf(bytes: Uint8Array): Promise<Blueprint> {
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error("PDF files must be 20 MB or smaller.");
  }
  if (String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Choose a valid PDF plan exported by Utsav.");
  }

  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (failure) {
    throw new Error(`This PDF could not be opened: ${failure instanceof Error ? failure.message : "invalid PDF data."}`);
  }

  const subject = pdf.getSubject() ?? "";
  const keywords = pdf.getKeywords()?.split(/\s+/).map((keyword) => keyword.trim()) ?? [];
  if (pdf.getCreator() !== "Utsav" || !keywords.includes(FORMAT_MARKER) || !subject.startsWith(SUBJECT_PREFIX)) {
    throw new Error("This PDF is not in the Utsav portable plan format.");
  }

  const payload = subject.slice(SUBJECT_PREFIX.length);
  if (!payload || payload.length > MAX_PAYLOAD_LENGTH) {
    throw new Error("The plan data in this PDF is missing or too large.");
  }
  const json = decompressFromBase64(payload);
  if (!json || json.length > MAX_DECOMPRESSED_LENGTH) {
    throw new Error("The plan data in this PDF is damaged or too large.");
  }

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("The plan data in this PDF is not valid JSON.");
  }
  const result = blueprintSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`The plan data in this PDF is invalid: ${result.error.issues[0]?.message ?? "schema validation failed."}`);
  }
  const expectedVerificationKeyword = `${VERIFICATION_KEYWORD_PREFIX}${await checksumPayload(payload)}`;
  if (!keywords.includes(expectedVerificationKeyword)) {
    throw new Error("The Utsav transfer check is missing or does not match the embedded plan data.");
  }
  return result.data;
}
