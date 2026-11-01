"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import Image from "next/image";
import { useSavedPlan } from "@/lib/hooks/use-saved-plan";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";
import type { Blueprint } from "@/lib/schemas/blueprint";
import { getCachedAiImage, queueAiImageRequest, saveCachedAiImage } from "@/lib/ai/image-cache";

const FALLBACK_CAPTIONS = ["Entrance", "Stage", "Tables", "Lighting", "Florals", "Signature moment"] as const;
type MoodboardTile = Blueprint["moodboard"][number];

const fallbackImage = (index: number, city = "Jaipur") => {
  const directory = city === "Pune" ? "pune-birthday" : city === "Thane" ? "thane-community" : "jaipur-wedding";
  const caption = FALLBACK_CAPTIONS[index % FALLBACK_CAPTIONS.length];
  return `/demo/${directory}/${caption.toLowerCase().replaceAll(" ", "-")}.svg`;
};

export function MoodboardGallery() {
  const { plan, error } = useSavedPlan();
  const reducedMotion = useReducedMotion();
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(0);
  const [generatingAll, setGeneratingAll] = useState(false);
  const inFlight = useRef(new Set<string>());
  const objectUrls = useRef(new Set<string>());

  function getCacheKey(tile: MoodboardTile, currentPlan: Blueprint): string {
    return `${currentPlan.event.title}|${currentPlan.event.date}|${tile.id}|${tile.prompt}|${currentPlan.ideas.themes[0]?.palette.join(",")}`;
  }

  useEffect(() => {
    if (!plan) return;
    const timer = window.setInterval(() => setVisible((current) => Math.min(current + 1, plan.moodboard.length)), 100);
    return () => window.clearInterval(timer);
  }, [plan]);

  useEffect(() => () => {
    for (const objectUrl of objectUrls.current) URL.revokeObjectURL(objectUrl);
    objectUrls.current.clear();
  }, []);

  async function generate(tile: MoodboardTile, index: number, force = false) {
    if (!plan) return;
    const key = `${tile.id}:${index}`;
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setLoading((current) => ({ ...current, [key]: true }));
    setMessages((current) => ({ ...current, [key]: "" }));
    try {
      if (localStorage.getItem("utsav-video-mode") === "1") {
        setImages((current) => ({ ...current, [key]: fallbackImage(index, plan.event.city) }));
        return;
      }
      if (!force) {
        const cachedImage = await getCachedAiImage(getCacheKey(tile, plan));
        if (cachedImage) {
          objectUrls.current.add(cachedImage);
          setImages((current) => ({ ...current, [key]: cachedImage }));
          setMessages((current) => ({ ...current, [key]: "Ready from your saved mood board." }));
          return;
        }
      }
      const theme = plan.ideas.themes[0];
      const response = await queueAiImageRequest(getCacheKey(tile, plan), () => fetch("/api/moodboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caption: tile.caption,
            fallbackCaption: FALLBACK_CAPTIONS[index % FALLBACK_CAPTIONS.length],
            city: plan.event.city,
            palette: theme.palette.filter((color) => /^#[\da-fA-F]{6}$/.test(color)).slice(0, 8),
            prompt: tile.prompt,
          }),
        }));
      const data = await response.json() as { imageUrl?: string; fallback?: boolean };
      if (!response.ok || !data.imageUrl) throw new Error("Could not create this image.");
      const imageUrl = await saveCachedAiImage(getCacheKey(tile, plan), data.imageUrl);
      if (imageUrl.startsWith("blob:")) objectUrls.current.add(imageUrl);
      setImages((current) => ({ ...current, [key]: imageUrl }));
      if (data.fallback) {
        setMessages((current) => ({ ...current, [key]: "We're showing a curated visual for now. You can try generating this tile again later." }));
      }
      else {
        setMessages((current) => ({ ...current, [key]: "Created for this event and saved to your mood board." }));
      }
    } catch (failure) {
      console.error("Mood-board tile generation failed:", failure);
      const localFallback = fallbackImage(index, plan.event.city);
      const savedFallback = await saveCachedAiImage(getCacheKey(tile, plan), localFallback);
      if (savedFallback.startsWith("blob:")) objectUrls.current.add(savedFallback);
      setImages((current) => ({ ...current, [key]: savedFallback }));
      setMessages((current) => ({ ...current, [key]: "We're showing a curated visual for now. You can try generating this tile again later." }));
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
      inFlight.current.delete(key);
    }
  }

  async function generateAll() {
    if (!plan || generatingAll || Object.values(loading).some(Boolean)) return;
    setGeneratingAll(true);
    try {
      for (const [index, tile] of plan.moodboard.entries()) {
        await generate(tile, index, true);
      }
    } finally {
      setGeneratingAll(false);
    }
  }

  useEffect(() => {
    if (!plan) return;
    if (localStorage.getItem("utsav-video-mode") === "1") {
      // Apply the browser-only demo mode after the saved plan hydrates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImages(Object.fromEntries(plan.moodboard.map((tile, index) => [`${tile.id}:${index}`, fallbackImage(index, plan.event.city)])));
      return;
    }
    void (async () => {
      for (const [index, tile] of plan.moodboard.entries()) {
        await generate(tile, index);
      }
    })();
    // Load cached visuals first and generate missing tiles sequentially.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  if (!plan) return <PlanRequired message={error || "Create or load a celebration plan to build its mood board."} />;
  const theme = plan.ideas.themes[0];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_18rem] sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Six moments, one celebration</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold">Mood board</h1>
          <p className="mt-2 text-muted-foreground">{theme.name} · AI-created visuals are prepared as this page loads and saved for future visits.</p>
        </div>
        <GenerateAiButton
          className="w-full shrink-0 justify-center whitespace-nowrap sm:w-72"
          busy={generatingAll || Object.values(loading).some(Boolean)}
          onClick={() => void generateAll()}
          label="Generate mood board with AI"
          busyLabel="Generating mood board…"
        />
      </header>
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plan.moodboard.slice(0, visible).map((tile, index) => {
          const key = `${tile.id}:${index}`;
          return (
          <motion.article key={key} initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.3, delay: reducedMotion ? 0 : index * 0.04 }} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative aspect-[4/3] w-full shrink-0 bg-secondary">
              <Image src={images[key] || fallbackImage(index, plan.event.city)} alt={`${tile.caption} mood-board concept for ${theme.name}`} fill unoptimized className="object-cover" />
            </div>
            <div className="flex flex-1 items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <h2 className="line-clamp-2 min-h-12 font-semibold">{tile.caption}</h2>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{tile.prompt}</p>
                <p aria-live="polite" className="mt-2 h-8 line-clamp-2 text-xs text-muted-foreground">{messages[key] || (loading[key] ? "Preparing your visual..." : "Preparing your visual...")}</p>
              </div>
                <button type="button" aria-label={`Regenerate ${tile.caption} tile`} disabled={loading[key]} onClick={() => void generate(tile, index, true)} className="shrink-0 rounded-lg border border-border p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading[key] ? "animate-spin" : ""}`} /></button>
            </div>
          </motion.article>
          );
        })}
      </div>
      <NextPlanStep current="/moodboard" />
    </section>
  );
}
