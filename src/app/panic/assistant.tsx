"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, RotateCcw, X } from "lucide-react";
import { useSavedPlan } from "@/lib/hooks/use-saved-plan";
import { formatINR } from "@/lib/engine/format";
import { blueprintSchema, type Blueprint } from "@/lib/schemas/blueprint";
import { BackToPlan } from "@/components/back-to-plan";
import { CelebrationVisual } from "@/components/celebration-visual";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";

const SCENARIOS = ["caterer cancelled", "rain forecast", "venue double-booked", "photographer no-show", "guest count jumps"] as const;
type PanicResult = {
  actions: string[];
  backups: { name: string; tier: string; priceMin: number; priceMax: number; category: string }[];
  message: string;
  budgetImpact: Record<string, number>;
  revisedPlan: Blueprint;
  revisedTasks: Blueprint["timeline"];
  weather?: string;
  fallback?: boolean;
};

export function PanicAssistant() {
  const { plan, setPlan, error: savedError } = useSavedPlan();
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number]>(SCENARIOS[0]);
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<PanicResult | null>(null);
  const [history, setHistory] = useState<Blueprint[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Restore the browser-only undo history after hydration. */
  useEffect(() => {
    const stored = localStorage.getItem("utsav-undo-history");
    if (!stored) return;
    try {
      const historySchema = blueprintSchema.array();
      setHistory(historySchema.parse(JSON.parse(stored)));
    } catch (failure) {
      setError(failure instanceof Error ? `Saved undo history could not be loaded: ${failure.message}` : "Saved undo history could not be loaded.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function getHelp() {
    if (!plan) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/panic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, details, plan }),
      });
      const data = (await response.json()) as PanicResult & { error?: string };
      if (!response.ok) throw new Error("We could not prepare a backup plan.");
      setResult(data);
      setNotice(data.fallback
        ? "A prepared backup plan is ready. Your saved plan has not changed."
        : "Your AI-generated backup suggestions are ready. Your saved plan has not changed.");
    } catch {
      setError("We couldn't prepare a backup plan just now. Your current plan is unchanged; please try again.");
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (!result) return;
    const updatedHistory = [...history, plan!];
    setHistory(updatedHistory);
    localStorage.setItem("utsav-undo-history", JSON.stringify(updatedHistory));
    setPlan(result.revisedPlan);
    setNotice("Suggested changes applied. You can undo the last change below.");
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setPlan(previous);
    const updatedHistory = history.slice(0, -1);
    setHistory(updatedHistory);
    localStorage.setItem("utsav-undo-history", JSON.stringify(updatedHistory));
    setNotice("Your previous plan has been restored.");
  }

  if (!plan) return <PlanRequired message={savedError || "Create or load a plan before opening the emergency helper."} />;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <header className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.85fr)]">
        <div className="min-w-0 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8">
          <AlertTriangle className="h-8 w-8 text-amber-700" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-amber-800">Pause. One step at a time.</p>
          <h1 className="mt-2 font-heading text-4xl font-semibold">Let’s make a backup plan.</h1>
          <p className="mt-2 text-muted-foreground">These are suggestions, not bookings. Contact providers and confirm details directly.</p>
        </div>
        <CelebrationVisual city={plan.event.city} scene="signature-moment" title="There’s always a next step" caption="Take a breath. We’ll work through a practical backup together." />
      </header>
      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <label className="block text-sm font-semibold">What changed?
          <select value={scenario} onChange={(event) => setScenario(event.target.value as (typeof SCENARIOS)[number])} className="mt-2 block min-h-11 w-full rounded-lg border border-border bg-background px-3">{SCENARIOS.map((item) => <option key={item}>{item}</option>)}</select>
        </label>
        <label className="mt-4 block text-sm font-semibold">A little more context (optional)
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} className="mt-2 block w-full rounded-lg border border-border bg-background p-3" placeholder="What do you know so far?" />
        </label>
        <GenerateAiButton
          className="mt-4"
          onClick={() => void getHelp()}
          busy={busy}
          label="Generate backup plan with AI"
          busyLabel="Generating your backup plan…"
        />
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {result && <div className="mt-6 space-y-4">
        {result.weather && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">{result.weather}</p>}
        <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-heading text-2xl font-semibold">Three actions for this hour</h2><ol className="mt-3 space-y-3">{result.actions.map((action, index) => <li key={action} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span><p>{action}</p></li>)}</ol></section>
        <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-heading text-2xl font-semibold">Possible backups · Demo vendors</h2>{result.backups.length ? <ul className="mt-3 space-y-2">{result.backups.map((vendor) => <li key={vendor.name} className="rounded-xl bg-secondary/50 p-3"><p className="font-medium">{vendor.name} <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Demo vendor</span></p><p className="mt-1 text-sm text-muted-foreground">{vendor.category} · {formatINR(vendor.priceMin)}–{formatINR(vendor.priceMax)} estimated</p></li>)}</ul> : <p className="mt-3 text-sm text-muted-foreground">No matching demo vendors were found in this plan; ask the venue for available local referrals.</p>}</section>
        <section className="rounded-2xl border border-border bg-card p-5"><h2 className="font-heading text-2xl font-semibold">Ready-to-send message</h2><p className="mt-3 rounded-xl bg-secondary/50 p-4 text-sm leading-relaxed">{result.message}</p><h3 className="mt-4 font-semibold">Budget impact (estimate)</h3><ul className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(result.budgetImpact).map(([id, delta]) => <li key={id} className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm"><span>{plan.budget.categories.find((category) => category.id === id)?.name ?? id}</span><span>{delta > 0 ? "+" : ""}{formatINR(delta)}</span></li>)}</ul><h3 className="mt-4 font-semibold">Tasks to bring forward</h3><ul className="mt-2 space-y-2">{result.revisedTasks.map((task) => <li key={task.id} className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm">{task.title} · {task.ownerRole}</li>)}</ul></section>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={apply} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground"><Check className="h-4 w-4" />Apply suggestions</button><button type="button" onClick={() => setResult(null)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium"><X className="h-4 w-4" />Dismiss</button>{history.length > 0 && <button type="button" onClick={undo} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 font-medium"><RotateCcw className="h-4 w-4" />Undo applied change</button>}</div>
      </div>}
      <p className="sr-only" aria-live="polite">{notice}</p>
    </section>
  );
}
