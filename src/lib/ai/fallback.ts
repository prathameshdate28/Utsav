import { allocate, localISODate } from "../engine/planner";
import { blueprintSchema, type Blueprint } from "../schemas/blueprint";

const CITIES = [
  "Mumbai", "New Delhi", "Delhi", "Bengaluru", "Bangalore", "Jaipur", "Pune",
  "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Nagpur", "Thane",
  "Udaipur", "Jodhpur", "Lucknow", "Indore", "Surat", "Goa", "Kochi",
] as const;
const MONTH_NAMES = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
const UNSPECIFIED_LOCATION = "Location not specified";

const CATEGORY_NAMES = [
  "Catering", "Venue", "Decor", "Photography", "Music & sound",
  "Attire & styling", "Invitations", "Transport", "Guest comfort", "Contingency",
] as const;
const CATEGORY_SHARES = [22, 16, 12, 10, 9, 8, 6, 5, 5, 7] as const;
const VENDOR_NAMES = ["Catering", "Venue", "Decor", "Photography", "Music", "Beauty", "Transport", "Guest support"] as const;
const PHASES = ["6 months", "3 months", "1 month", "1 week", "day-of"] as const;
const TASK_TITLES = [
  "Confirm your event priorities", "Set an initial guest-list range", "Shortlist suitable venues", "Check date and venue availability",
  "Agree the working budget", "Book your venue", "Choose your event theme", "Shortlist catering options",
  "Confirm the menu and dietary needs", "Book photography and music", "Review the guest list", "Send invitations",
  "Confirm accessibility requirements", "Plan arrival and transport", "Confirm vendor balances", "Share the day-of schedule",
  "Pack essentials and printed contacts", "Confirm final guest count", "Check weather and backup plan", "Welcome guests and enjoy",
] as const;
function amountFromPrompt(prompt: string): number | undefined {
  const match = prompt.match(/(?:₹\s*|rs\.?\s*|inr\s*|budget(?:\s+(?:of|is|around|about))?\s+(?:₹\s*|rs\.?\s*|inr\s*)?)([\d][\d,]*(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|l\b|thousands?|k\b)?/i);
  if (!match) return undefined;
  const value = Number(match[1].replaceAll(",", ""));
  if (!Number.isFinite(value)) return undefined;
  const unit = match[2]?.toLowerCase() ?? "";
  const multiplier = /^(?:crores?|cr)$/.test(unit)
    ? 10_000_000
    : /^(?:lakhs?|lacs?|l)$/.test(unit)
      ? 100_000
      : /^(?:thousands?|k)$/.test(unit)
        ? 1_000
        : 1;
  if (multiplier === 1 && value < 1_000 && !/(?:₹|rs\.?|inr)/i.test(match[0])) return undefined;
  return Math.round(value * multiplier);
}

function estimatedBudget(eventType: Blueprint["eventType"], guests: number, city: string): number {
  const perGuest = { wedding: 4_500, birthday: 1_250, community: 650, other: 1_500 }[eventType];
  const fixed = { wedding: 150_000, birthday: 12_000, community: 25_000, other: 30_000 }[eventType];
  const minimum = { wedding: 500_000, birthday: 30_000, community: 50_000, other: 40_000 }[eventType];
  const cityFactor = /mumbai|delhi|bengaluru|bangalore/i.test(city) ? 1.15 : 1;
  return Math.max(minimum, Math.round((fixed + guests * perGuest) * cityFactor / 1_000) * 1_000);
}

function titleCaseLocation(value: string): string {
  return value.replace(/\b[a-z]/gi, (letter) => letter.toUpperCase());
}

function locationFromPrompt(prompt: string): string {
  const locationMatches = prompt.matchAll(/\b(?:in|at|near|around)\s+(?:the\s+city\s+of\s+)?([a-z][a-z'’-]*(?:\s+[a-z][a-z'’-]*){0,3}?)(?=\s*,|\s*;|\s*\b(?:for|with|on|during|budget|guests?|people|attendees|residents|and|where|inspired|style|theme|in|at)\b|[.!?]|$)/gi);
  for (const match of locationMatches) {
    const location = match[1].trim().replace(/\s+/g, " ");
    if (
      !location
      || /^(?:(?:a|an|the|my|our|your)\s+)?(?:home|indoors|outdoors|garden|beach|farm|venue|hall)\b/i.test(location)
      || MONTH_NAMES.test(location)
      || /^\d/.test(location)
    ) continue;
    return titleCaseLocation(location);
  }

  const knownCitiesInPrompt = CITIES.map((candidate) => ({
    city: candidate,
    index: prompt.search(new RegExp(`\\b${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")),
  })).filter(({ index }) => index >= 0);
  knownCitiesInPrompt.sort((left, right) => left.index - right.index);
  return knownCitiesInPrompt[0]?.city ?? UNSPECIFIED_LOCATION;
}

function eventDetails(prompt: string): {
  type: Blueprint["eventType"];
  title: string;
  highlight: string;
} {
  const lower = prompt.toLowerCase();
  if (/\b(wedding|marriage|bride|groom|nuptial|shaadi|vivah)\b/.test(lower)) {
    return { type: "wedding", title: "A wedding celebration", highlight: "Wedding celebration" };
  }
  if (/\b(birthday|b['’]?day)\b/.test(lower) || /\bturning\s+\d+\b/.test(lower)) {
    return { type: "birthday", title: "A birthday celebration", highlight: "Birthday moment" };
  }
  if (/\b(ganesh|society|community|utsav|residents|neighbourhood|neighborhood)\b/.test(lower)) {
    return { type: "community", title: "A community celebration", highlight: "Shared community activity" };
  }
  const eventTypes = [
    [/\b(engagement|proposal)\b/, "Engagement celebration"],
    [/\b(anniversary|milestone anniversary)\b/, "Anniversary celebration"],
    [/\b(graduation|convocation)\b/, "Graduation celebration"],
    [/\b(baby shower)\b/, "Baby shower"],
    [/\b(housewarming|house warming)\b/, "Housewarming celebration"],
    [/\b(retirement)\b/, "Retirement celebration"],
    [/\b(reunion)\b/, "Reunion"],
    [/\b(farewell|send.?off)\b/, "Farewell celebration"],
    [/\b(festival|festive)\b/, "Festival celebration"],
  ] as const;
  const match = eventTypes.find(([pattern]) => pattern.test(lower));
  const title = match?.[1] ?? "A celebration";
  return { type: "other", title, highlight: title };
}

function guestCountFromPrompt(prompt: string): number {
  const match = prompt.match(/([\d,]+)\s*(?:guests|people|residents|attendees)/i);
  return match ? Number(match[1].replaceAll(",", "")) : 100;
}

function eventDateFromPrompt(prompt: string): string {
  const monthMatch = prompt.match(MONTH_NAMES);
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const now = new Date();
  const today = localISODate(now);
  const currentYear = now.getFullYear();
  const isoMatch = prompt.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  const numericMatch = prompt.match(/\b(\d{1,2})[/. -](\d{1,2})[/. -](20\d{2})\b/);
  let year: number;
  let month: number;
  let day: number;

  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else if (numericMatch) {
    day = Number(numericMatch[1]);
    month = Number(numericMatch[2]);
    year = Number(numericMatch[3]);
  } else if (monthMatch) {
    month = months.indexOf(monthMatch[1].toLowerCase()) + 1;
    const monthIndex = monthMatch.index ?? 0;
    const aroundMonth = prompt.slice(monthIndex + monthMatch[0].length);
    const dayAfter = /^\s+(\d{1,2})(?:st|nd|rd|th)?\b/i.exec(aroundMonth);
    const dayBefore = /(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+$/i.exec(prompt.slice(0, monthIndex));
    day = Number(dayAfter?.[1] ?? dayBefore?.[1] ?? 15);
    const yearMatch = /,?\s+(20\d{2})\b/.exec(aroundMonth.slice(dayAfter?.[0].length ?? 0));
    year = yearMatch ? Number(yearMatch[1]) : currentYear;
    if (!yearMatch) {
      const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (candidate < today) year += 1;
    }
  } else {
    const target = new Date(now);
    target.setFullYear(currentYear + 1, (now.getMonth() + 6) % 12, 15);
    return localISODate(target);
  }

  const candidate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${candidate}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== candidate
    || month < 1
    || month > 12
    || day < 1
    || day > 31
  ) {
    return `${currentYear + 1}-${String((now.getMonth() + 6) % 12 + 1).padStart(2, "0")}-15`;
  }
  return candidate;
}

export function createFallbackBlueprint(rawPrompt: string): Blueprint {
  const prompt = rawPrompt.trim();
  const { type: eventType, title, highlight } = eventDetails(prompt);
  const city = locationFromPrompt(prompt);
  const guests = guestCountFromPrompt(prompt);
  const total = amountFromPrompt(prompt) ?? estimatedBudget(eventType, guests, city);
  const eventDate = eventDateFromPrompt(prompt);
  const amounts = allocate(total, CATEGORY_NAMES.map((name, index) => ({ id: name, share: CATEGORY_SHARES[index] })));
  const categories = CATEGORY_NAMES.map((name, index) => ({
    id: `budget-${index + 1}`,
    name,
    amount: amounts[name],
    share: CATEGORY_SHARES[index],
    kind: (index === 0 || index === 6 ? "per_head" : index === 1 || index === 3 ? "fixed" : "semi") as "per_head" | "fixed" | "semi",
    isEstimate: true,
    saveTip: `Request itemized ${name.toLowerCase()} quotes and compare the included services.`,
    hiddenCostWarnings: ["Ask whether taxes, delivery, setup and overtime are included."],
  }));
  const timeline = TASK_TITLES.map((taskTitle, index) => ({
    id: `task-${String(index + 1).padStart(2, "0")}`,
    title: taskTitle,
    phase: PHASES[Math.min(4, Math.floor(index / 4))],
    leadTimeDays: Math.max(0, 180 - index * 9),
    ownerRole: index % 3 === 0 ? "Event lead" : index % 3 === 1 ? "Family coordinator" : "Vendor coordinator",
    reason: "Confirming this early leaves time to adjust details without last-minute pressure.",
    dependencies: index > 0 && index % 4 === 0 ? [`task-${String(index).padStart(2, "0")}`] : [],
    completed: false,
  }));
  const vendorCategories = VENDOR_NAMES.map((name, index) => ({
    name,
    bookByDays: Math.max(30, 180 - index * 15),
    mustAskQuestions: [
      "What is included in this price, and which extra charges may apply?",
      "How do you handle changes, cancellations, and the event-day schedule?",
      "Can you confirm availability and the payment milestones in writing?",
    ],
    redFlags: ["Unitemized quote or unclear cancellation terms", "Pressure to pay the full amount before a written agreement"],
    shortlist: Array.from({ length: 8 }, (_, vendorIndex) => {
      const base = Math.max(2500, Math.round((total * CATEGORY_SHARES[Math.min(index, 9)] / 100) / 4));
      const tier = vendorIndex < 3 ? "budget" as const : vendorIndex < 6 ? "mid" as const : "premium" as const;
      const tierMultiplier = tier === "budget" ? 0.65 : tier === "mid" ? 1 : 1.65;
      const priceMin = Math.round(base * tierMultiplier);
      return {
        id: `vendor-${index + 1}-${vendorIndex + 1}`,
        name: `Demo-Only Fictional ${name} ${String(vendorIndex + 1).padStart(2, "0")}`,
        tier,
        priceMin,
        priceMax: Math.round(priceMin * 1.35),
        rating: Number((4.1 + (vendorIndex % 8) * 0.1).toFixed(1)),
        tags: ["fictional demo", tier, vendorIndex % 2 ? "flexible package" : "itemized estimate"],
      };
    }),
  }));
  const hasRequestedCustom = /\b(puja|aarti|ganesh|mehndi|haldi|sangeet|ritual|tradition)\b/i.test(prompt);
  const ceremonies = [
    { name: "Guest arrival and welcome", itemsNeeded: ["Welcome point", "Event schedule"], responsibleRole: "Event host", durationMin: 20 },
    {
      name: hasRequestedCustom ? "Requested tradition or ceremony" : highlight,
      itemsNeeded: hasRequestedCustom ? ["Items chosen by the host or family", "Seating"] : ["Chosen event materials", "Seating"],
      responsibleRole: "Event coordinator",
      durationMin: 40,
    },
    { name: "Gathering, refreshments and close", itemsNeeded: ["Refreshments or meal plan", "Water and waste stations"], responsibleRole: "Hospitality lead", durationMin: 60 },
  ].map((item, index) => ({
    ...item,
    order: index + 1,
    meaning: hasRequestedCustom
      ? "This is included because the request mentions a tradition or ceremony. Confirm the form and details with the people who will observe it."
      : "This is a practical programme moment for guests to gather and mark the occasion. Adapt or remove it to fit the event and the people attending.",
    completed: false,
  }));
  const paletteAccent = eventType === "birthday" ? "#E35D7E" : eventType === "community" ? "#0F7C78" : eventType === "other" ? "#547A72" : "#7A1F3D";
  const themes = [
    { name: `Warm ${title.toLowerCase()}`, palette: ["#547A72", "#E6B566", "#FBF7EF"], decor: "Comfortable gathering spaces with personal details chosen by the host", entertainment: "A relaxed playlist or activity suited to the guests", signatureMoment: `A shared moment celebrating ${highlight.toLowerCase()}` },
    { name: "Fresh and open", palette: ["#59758C", "#A9C3B5", "#F4F1E8"], decor: "Simple greenery, clear signage and flexible seating", entertainment: "Conversation-friendly music and optional group activities", signatureMoment: "A collective photo or message from guests" },
    { name: "Bright and personal", palette: ["#B85C52", "#E8C66A", "#FFF8F0"], decor: "Color accents inspired by the host's preferences and the venue", entertainment: "A short, guest-led activity with an easy-to-join format", signatureMoment: "A keepsake or toast shaped by the people attending" },
  ] as const;

  return blueprintSchema.parse({
    eventType,
    event: { title, city, date: eventDate, guests, concept: prompt, accentColor: paletteAccent },
    budget: { total, baseGuests: guests, categories },
    timeline,
    vendorCategories,
    ideas: {
      themes: themes.map((theme) => ({ ...theme })),
      menu: [
        { course: "Light refreshments", dishes: [{ name: "Seasonal fruit and simple savouries", dietaryTags: ["vegetarian", "vegan options available"] }] },
        { course: "Main meal", dishes: [{ name: "Host-selected familiar dishes", dietaryTags: ["confirm dietary needs"] }, { name: "A plant-based option", dietaryTags: ["vegetarian", "vegan"] }] },
        { course: "Dessert", dishes: [{ name: "A simple dessert selected for the event", dietaryTags: ["confirm dietary needs"] }] },
      ],
      invitations: {
        warm: `We would love for you to join us${city === UNSPECIFIED_LOCATION ? "" : ` in ${city}`} on ${eventDate} as we celebrate ${title.toLowerCase()}. Your company will make the day even more special.`,
        formal: `You are warmly invited to join our ${title.toLowerCase()}${city === UNSPECIFIED_LOCATION ? "" : ` in ${city}`} on ${eventDate}. We look forward to sharing this occasion with you.`,
      },
    },
    assumptions: [
      { text: `${guests.toLocaleString("en-IN")} guests${city === UNSPECIFIED_LOCATION ? "" : ` in ${city}`}`, reason: city === UNSPECIFIED_LOCATION ? "No guest count or location was confidently identified; the guest count is a planning estimate and the location is left unspecified." : "We used the location stated in your prompt; the guest count is an estimate unless you specified it." },
      { text: `${eventDate} is a planning date`, reason: "A specific day was not provided; this date is a working placeholder to make the timeline useful." },
      { text: "Prices and vendors are illustrative", reason: "All amounts are AI estimates and all listed providers are fictional demo vendors, not quotes or real businesses." },
    ],
    ceremonies,
    moodboard: ["Arrival and welcome", "Gathering space", "Food and tables", "Lighting and atmosphere", "Personal details", highlight].map((caption) => ({
      id: caption.toLowerCase().replaceAll(" ", "-"),
      caption,
      prompt: `${caption} for ${title.toLowerCase()}${city === UNSPECIFIED_LOCATION ? "" : ` in ${city}`}, guided by ${prompt}. Use the selected event palette, realistic accessible details, natural light and an editorial event-photography style.`,
    })),
  });
}
