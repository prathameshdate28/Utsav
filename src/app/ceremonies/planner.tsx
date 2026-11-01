"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useSavedPlan } from "@/lib/hooks/use-saved-plan";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { CelebrationVisual } from "@/components/celebration-visual";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";
import type { Blueprint } from "@/lib/schemas/blueprint";

export function CeremoniesPlanner() {
  const { plan, setPlan, error } = useSavedPlan();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [generationMessage, setGenerationMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const autoGenerationKey = useRef("");

  const generateCeremonies = useCallback(async (currentPlan: Blueprint) => {
    setGenerating(true);
    setGenerationMessage("");
    try {
      const response = await fetch("/api/ceremonies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: currentPlan.eventType,
          event: currentPlan.event,
          ceremonies: currentPlan.ceremonies,
        }),
      });
      const result = await response.json() as {
        ceremonies?: Blueprint["ceremonies"];
        fallback?: boolean;
        error?: string;
        provider?: "gemini" | "groq";
      };
      if (!response.ok || !result.ceremonies) {
        throw new Error("Programme generation was unsuccessful.");
      }
      if (result.fallback) {
        setGenerationMessage(result.error || "We couldn't create a new programme just now. Your current suggestions are still available; please try again shortly.");
        return;
      }
      setPlan({ ...currentPlan, ceremonies: result.ceremonies });
      setGenerationMessage(`Your event-specific programme was generated with ${result.provider === "groq" ? "the backup AI provider" : "AI"}.`);
    } catch {
      setGenerationMessage("We couldn't create a new programme just now. Your current suggestions are still available; please try again shortly.");
    } finally {
      setGenerating(false);
    }
  }, [setPlan]);

  useEffect(() => {
    if (!plan) return;
    const source = window.localStorage.getItem("utsav-plan-source");
    if (source !== "demo" && source !== "offline") return;
    const key = `${source}:${plan.event.title}:${plan.event.date}:${plan.event.concept}`;
    if (autoGenerationKey.current === key) return;
    autoGenerationKey.current = key;
    const storageKey = `utsav-auto-ceremonies:${encodeURIComponent(key)}`;
    const lastAttempt = Number(window.localStorage.getItem(storageKey));
    if (Number.isFinite(lastAttempt) && Date.now() - lastAttempt < 24 * 60 * 60 * 1000) return;
    window.localStorage.setItem(storageKey, String(Date.now()));
    // Generate once when a cached or offline plan is first opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void generateCeremonies(plan);
  }, [generateCeremonies, plan]);

  if (!plan) return <PlanRequired message={error || "Create or load a demo plan to see its programme."} />;
  const ceremonies = plan.ceremonies ?? [];

  function reorder(index: number, direction: -1 | 1) {
    if (!plan) return;
    const next = [...ceremonies];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPlan({ ...plan, ceremonies: next.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) });
  }

  function remove(index: number) {
    if (!plan) return;
    setPlan({ ...plan, ceremonies: ceremonies.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) });
    setNotice("Programme item removed.");
  }

  function editName(index: number, name: string) {
    if (!plan) return;
    setPlan({ ...plan, ceremonies: ceremonies.map((item, itemIndex) => itemIndex === index ? { ...item, name } : item) });
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <header className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">A guide, not a rulebook</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold">Ceremonies & programme</h1>
          <p className="mt-2 text-muted-foreground">Commonly practised; traditions vary by family. Edit this order to match your plans.</p>
          <GenerateAiButton
            className="mt-4"
            disabled={generating}
            busy={generating}
            onClick={() => void generateCeremonies(plan)}
            label="Generate programme with AI"
            busyLabel="Generating programme…"
          />
          {generationMessage && <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">{generationMessage}</p>}
        </header>
        <CelebrationVisual city={plan.event.city} scene="stage" title="Make space for the moment" caption="Shape the programme around what feels meaningful to your gathering." />
      </div>
      {plan.eventType === "community" && <p className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">Community programme suggestions include a welcome, gathering, shared meal, volunteer coordination, and accessible event logistics.</p>}
      <ol className="mt-7 space-y-4">
        {ceremonies.map((item, index) => (
          <li key={`${item.name}-${item.order}`} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start gap-3">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{item.order}</span>
              <div className="min-w-0 flex-1">
                <input aria-label={`Edit programme item ${index + 1}`} value={item.name} onChange={(event) => editName(index, event.target.value)} className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-heading text-xl font-semibold focus:border-ring focus:outline-none" />
                <p className="px-2 pt-1 text-sm text-muted-foreground">{item.durationMin} min · Led by {item.responsibleRole}</p>
              </div>
              <div className="flex gap-1">
                <button aria-label={`Move ${item.name} up`} disabled={index === 0} onClick={() => reorder(index, -1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                <button aria-label={`Move ${item.name} down`} disabled={index === ceremonies.length - 1} onClick={() => reorder(index, 1)} className="rounded-lg border border-border p-2 disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                <button aria-label={`Remove ${item.name}`} onClick={() => remove(index)} className="rounded-lg border border-border p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <button type="button" aria-expanded={expanded === item.name} onClick={() => setExpanded(expanded === item.name ? null : item.name)} className="ml-12 mt-3 rounded-full border border-border px-3 py-1 text-sm font-medium hover:border-primary">Meaning & details</button>
            {expanded === item.name && <div className="ml-12 mt-3 rounded-xl bg-secondary/50 p-4"><p className="text-sm leading-relaxed">{item.meaning}</p><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items to prepare</p><ul className="mt-1 list-inside list-disc text-sm">{item.itemsNeeded.map((needed) => <li key={needed}>{needed}</li>)}</ul></div>}
          </li>
        ))}
      </ol>
      {ceremonies.length === 0 && <p className="mt-6 rounded-xl border border-border p-5 text-muted-foreground">There are no programme items yet. Try loading one of the demos to start.</p>}
      <p className="sr-only" aria-live="polite">{notice}</p>
      <NextPlanStep current="/ceremonies" />
    </section>
  );
}
