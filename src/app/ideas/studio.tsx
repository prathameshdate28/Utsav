"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useSavedPlan } from "@/lib/hooks/use-saved-plan";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";
import type { Blueprint } from "@/lib/schemas/blueprint";
import { getCachedAiImage, queueAiImageRequest, saveCachedAiImage } from "@/lib/ai/image-cache";

const TABS = ["Themes", "Menu", "Invitation text"] as const;
type Tab = (typeof TABS)[number];
type Theme = Blueprint["ideas"]["themes"][number];

function themeKey(theme: Theme, index: number) {
  return `${theme.name}:${index}`;
}

function fallbackVisual(city: string) {
  const directory = city === "Pune" ? "pune-birthday" : city === "Thane" ? "thane-community" : "jaipur-wedding";
  return `/demo/${directory}/florals.svg`;
}

function ThemeVisual({ theme, city, concept }: { theme: Theme; city: string; concept: string }) {
  const [imageUrl, setImageUrl] = useState(fallbackVisual(city));
  const [status, setStatus] = useState("Preparing a theme-inspired visual…");
  const { name, decor, signatureMoment } = theme;
  const paletteKey = theme.palette.join(",");

  useEffect(() => {
    let active = true;
    let activeBlobUrl: string | null = null;
    const cacheKey = `theme|${city}|${concept}|${name}|${paletteKey}|${decor}|${signatureMoment}`;
    void (async () => {
      try {
        const cached = await getCachedAiImage(cacheKey);
        if (cached) {
          activeBlobUrl = cached;
          if (active) {
            setImageUrl(cached);
            setStatus("Ready from your saved mood board.");
          }
          return;
        }
        const palette = paletteKey.split(",");
        const response = await queueAiImageRequest(cacheKey, () => fetch("/api/moodboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              caption: "Theme inspiration",
              city,
              palette,
              prompt: `Create an editorial celebration-design image inspired by the theme "${name}". Event concept: ${concept}. Decor: ${decor}. Signature moment: ${signatureMoment}. The image should visibly express this theme and its palette (${paletteKey}).`,
            }),
          }));
        const data = await response.json() as { imageUrl?: string; fallback?: boolean };
        if (!response.ok || !data.imageUrl) throw new Error("Theme visual generation failed.");
        const savedImage = await saveCachedAiImage(cacheKey, data.imageUrl);
        if (savedImage.startsWith("blob:")) activeBlobUrl = savedImage;
        if (active) {
          setImageUrl(savedImage);
          setStatus(data.fallback
            ? "We're showing a curated visual for now."
            : "Created for this event and saved to your mood board.");
        }
      } catch (error) {
        console.error("Theme visual generation failed:", error);
        const fallback = fallbackVisual(city);
        const savedImage = await saveCachedAiImage(cacheKey, fallback);
        if (savedImage.startsWith("blob:")) activeBlobUrl = savedImage;
        if (active) {
          setImageUrl(savedImage);
          setStatus("We're showing a curated visual for now.");
        }
      }
    })();
    return () => {
      active = false;
      if (activeBlobUrl) URL.revokeObjectURL(activeBlobUrl);
    };
  }, [city, concept, decor, name, paletteKey, signatureMoment]);

  return (
    <div className="relative -mx-5 -mt-5 mb-4 aspect-[16/9] overflow-hidden rounded-t-2xl bg-secondary">
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.join(", ")})` }} />
      <Image src={imageUrl} alt={`Visual concept for ${theme.name}`} fill unoptimized className="object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-xs font-medium text-white" aria-live="polite">{status}</div>
    </div>
  );
}

export function IdeasStudio() {
  const { plan, setPlan, error: savedError } = useSavedPlan();
  const [tab, setTab] = useState<Tab>("Themes");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generationNote, setGenerationNote] = useState("");
  const [selectedThemeKey, setSelectedThemeKey] = useState<string | null>(null);
  const [copiedInvitation, setCopiedInvitation] = useState<string | null>(null);

  async function generateTheme(mode: "new" | "variation") {
    if (!plan || busy) return;
    const selectedIndex = plan.ideas.themes.findIndex((theme, index) => themeKey(theme, index) === selectedThemeKey);
    const selectedTheme = selectedIndex >= 0 ? plan.ideas.themes[selectedIndex] : undefined;
    if (mode === "variation" && !selectedTheme) {
      setError("Select a theme first, then ask for a unique variation.");
      return;
    }

    setBusy(true);
    setError("");
    setGenerationNote("");
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          prompt: `${plan.event.concept}. Celebration in ${plan.event.city}, for ${plan.event.guests} guests.`,
          shownNames: plan.ideas.themes.map((theme) => theme.name).slice(-50),
          ...(mode === "variation" && selectedTheme ? { selectedTheme } : {}),
        }),
      });
      const data = await response.json() as { theme?: Theme; fallback?: boolean; error?: string };
      if (!response.ok || !data.theme) throw new Error("We could not create a theme just now.");
      const nextThemes = [...plan.ideas.themes, data.theme];
      setPlan({ ...plan, ideas: { ...plan.ideas, themes: nextThemes } });
      setSelectedThemeKey(themeKey(data.theme, nextThemes.length - 1));
      setGenerationNote(data.fallback
        ? "A curated theme suggestion was added."
        : mode === "new"
          ? "A completely new theme is ready."
          : `A distinctive variation of “${selectedTheme?.name}” is ready.`);
    } catch {
      setError("We couldn't create a new theme just now. Your current ideas are still available; please try again later.");
    } finally {
      setBusy(false);
    }
  }

  async function generateContent(mode: "menu" | "invitations") {
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    setGenerationNote("");
    try {
      const response = await fetch("/api/ideas/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          event: plan.event,
          themes: plan.ideas.themes.slice(0, 8).map(({ name, decor }) => ({ name, decor })),
          menu: plan.ideas.menu,
          invitations: plan.ideas.invitations,
        }),
      });
      const data = await response.json() as {
        menu?: Blueprint["ideas"]["menu"];
        invitations?: Blueprint["ideas"]["invitations"];
        fallback?: boolean;
      };
      if (!response.ok || (mode === "menu" ? !data.menu : !data.invitations)) {
        throw new Error("Ideas generation is unavailable.");
      }
      if (data.fallback) {
        setError(`We couldn't generate ${mode === "menu" ? "a new menu" : "new invitation drafts"} just now. Your current ideas are still available; please try again shortly.`);
        return;
      }
      setPlan({
        ...plan,
        ideas: {
          ...plan.ideas,
          ...(mode === "menu" && data.menu ? { menu: data.menu } : {}),
          ...(mode === "invitations" && data.invitations ? { invitations: data.invitations } : {}),
        },
      });
      setGenerationNote(mode === "menu" ? "Your event-specific menu has been generated and saved." : "Your invitation drafts have been generated and saved.");
    } catch {
      setError(`We couldn't generate ${mode === "menu" ? "a new menu" : "new invitation drafts"} just now. Your current ideas are still available; please try again shortly.`);
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedInvitation(label);
      setError("");
    } catch {
      setCopiedInvitation(null);
      setError(`Couldn’t copy the ${label.toLowerCase()} invitation. Check clipboard permissions and try again.`);
    }
  }

  if (!plan) return <PlanRequired message={savedError || "Create or load a celebration plan to explore ideas."} />;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <header><p className="text-sm font-semibold uppercase tracking-widest text-primary">A few ways to make it yours</p><h1 className="mt-2 font-heading text-4xl font-semibold">Ideas Studio</h1></header>
      <div role="tablist" aria-label="Idea categories" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium ${tab === item ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{item}</button>)}
      </div>
      {tab === "Themes" && <>
        <div className="mt-5 flex flex-wrap gap-2">
          <GenerateAiButton
            onClick={() => void generateTheme("new")}
            busy={busy}
            label="Surprise me"
            busyLabel="Generating theme…"
          />
          <GenerateAiButton
            onClick={() => void generateTheme("variation")}
            busy={busy}
            disabled={selectedThemeKey === null}
            label="Do Something Unique"
            busyLabel="Generating variation…"
          />
          {selectedThemeKey === null
            ? <p className="self-center text-sm text-muted-foreground">Select a theme below, then create a variation of it.</p>
            : <p className="self-center text-sm text-muted-foreground">Variation of: {plan.ideas.themes.find((theme, index) => themeKey(theme, index) === selectedThemeKey)?.name}</p>}
        </div>
        {generationNote && <p role="status" className="mt-3 text-sm text-muted-foreground">{generationNote}</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {plan.ideas.themes.map((theme, index) => {
            const key = themeKey(theme, index);
            const selected = key === selectedThemeKey;
            return (
              <article
                key={key}
                className={`overflow-hidden rounded-2xl border bg-card p-5 transition-colors ${selected ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              >
                <ThemeVisual theme={theme} city={plan.event.city} concept={plan.event.concept} />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2" aria-label={`${theme.name} color palette`}>
                    {theme.palette.map((color, colorIndex) => <span key={`${color}-${colorIndex}`} title={color} aria-label={`Palette color ${color}`} className="h-7 w-7 rounded-full border border-border" style={{ backgroundColor: color }} />)}
                  </div>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedThemeKey(key)}
                    className={`min-h-9 rounded-lg border px-3 py-1 text-xs font-semibold ${selected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary"}`}
                  >
                    {selected ? "Selected for variation" : "Select for variation"}
                  </button>
                </div>
                <h2 className="mt-4 font-heading text-2xl font-semibold">{theme.name}</h2>
                <p className="mt-2 text-sm"><strong>Decor:</strong> {theme.decor}</p>
                <p className="mt-2 text-sm"><strong>Entertainment:</strong> {theme.entertainment}</p>
                <p className="mt-2 text-sm"><strong>Signature moment:</strong> {theme.signatureMoment}</p>
              </article>
            );
          })}
        </div>
      </>}
      {tab === "Menu" && <>
        <GenerateAiButton
          className="mt-5"
          onClick={() => void generateContent("menu")}
          busy={busy}
          label="Generate menu with AI"
          busyLabel="Generating menu…"
        />
        {generationNote && <p role="status" className="mt-3 text-sm text-muted-foreground">{generationNote}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{plan.ideas.menu.map((course) => <article key={course.course} className="rounded-2xl border border-border bg-card p-5"><h2 className="font-heading text-xl font-semibold">{course.course}</h2><ul className="mt-3 space-y-3">{course.dishes.map((dish) => <li key={dish.name}><p className="font-medium">{dish.name}</p><p className="text-xs text-muted-foreground">{dish.dietaryTags.join(" · ") || "Dietary details to confirm"}</p></li>)}</ul></article>)}</div>
      </>}
      {tab === "Invitation text" && <>
        <GenerateAiButton
          className="mt-5"
          onClick={() => void generateContent("invitations")}
          busy={busy}
          label="Generate invitations with AI"
          busyLabel="Generating invitations…"
        />
        {generationNote && <p role="status" className="mt-3 text-sm text-muted-foreground">{generationNote}</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">{([["Warm", plan.ideas.invitations.warm], ["Formal", plan.ideas.invitations.formal]] as const).map(([label, text]) => { const copied = copiedInvitation === label; return <article key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-heading text-xl font-semibold">{label}</h2><button type="button" aria-label={copied ? `${label} invitation copied` : `Copy ${label.toLowerCase()} invitation`} title={copied ? "Copied" : "Copy invitation"} onClick={() => void copyInvitation(text, label)} className={`shrink-0 rounded-lg border border-border p-2 ${copied ? "text-emerald-600" : ""}`}><span className="sr-only">{copied ? "Copied" : "Copy"}</span>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}</button></div><p className="mt-3 leading-relaxed">{text}</p></article>; })}</div>
      </>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900">{error}</p>}
      <NextPlanStep current="/ideas" />
    </section>
  );
}
