"use client";

import { useEffect, useMemo, useState } from "react";
import { rebalance, type RebalanceResult } from "@/lib/engine/planner";
import { formatINR } from "@/lib/engine/format";
import { type Blueprint } from "@/lib/schemas/blueprint";
import { loadActivePlan, saveActivePlan } from "@/lib/storage/plan-library";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { CelebrationVisual } from "@/components/celebration-visual";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";

export function BudgetPlanner() {
  const [plan, setPlan] = useState<Blueprint | null>(null);
  const [guests, setGuests] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the client-only saved plan once. */
  useEffect(() => {
    try {
      const parsed = loadActivePlan();
      if (!parsed) return;
      setPlan(parsed);
      setGuests(parsed.event.guests);
      setTotal(parsed.budget.total);
    } catch {
      setError("The saved plan could not be loaded. Create a new plan from the home page.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const result: RebalanceResult | null = useMemo(() => {
    if (!plan) return null;
    try {
      return rebalance(plan, { guests, total });
    } catch {
      return null;
    }
  }, [plan, guests, total]);

  function applyChanges() {
    if (!result) return;
    setPlan(result.blueprint);
    saveActivePlan(result.blueprint);
  }

  async function generateBudget() {
    if (!result || !plan) return;
    setLoading(true);
    setError("");
    setGenerationNotice("");
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: result.blueprint.event, budget: result.blueprint.budget }),
      });
      const data = await response.json() as { budget?: Blueprint["budget"]; fallback?: boolean };
      if (!response.ok || !data.budget) throw new Error("Budget generation is unavailable.");
      if (data.fallback) {
        setError("We couldn't generate a fresh budget just now. Your current estimate is still available; please try again shortly.");
        return;
      }
      const updated = { ...result.blueprint, budget: data.budget };
      saveActivePlan(updated);
      setPlan(updated);
      setGuests(updated.event.guests);
      setTotal(updated.budget.total);
      setGenerationNotice("Your event-specific budget has been generated and saved.");
    } catch {
      setError("We couldn't generate a fresh budget just now. Your current estimate is still available; please try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  if (!plan || !result) {
    return <PlanRequired message={error || "Create a plan first to explore your estimated budget."} />;
  }
  const categories = result.blueprint.budget.categories;
  const segments = categories.map((category, index) => {
    const start = categories.slice(0, index).reduce((sum, item) => sum + item.share, 0);
    return `${["#d97706", "#059669", "#e11d48", "#2563eb", "#7c3aed"][index % 5]} ${start}% ${start + category.share}%`;
  }).join(", ");

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <header className="min-w-0"><p className="text-sm font-semibold uppercase tracking-widest text-primary">AI estimate · verify with local providers</p><h1 className="mt-2 font-heading text-4xl font-semibold">Budget, with room to adjust</h1><p className="mt-2 text-muted-foreground">Change your guest count or budget; the pure planning engine recalculates every category.</p></header>
        <CelebrationVisual city={plan.event.city} scene="tables" title="A thoughtful table, a thoughtful budget" caption="Make room for the details that matter most to your guests." />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-2xl border border-border bg-card p-5">
          <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full" style={{ background: `conic-gradient(${segments})` }}>
            <div className="flex h-36 w-36 flex-col items-center justify-center rounded-full bg-card text-center"><span className="text-xs text-muted-foreground">Total estimate</span><strong className="font-heading text-2xl">{formatINR(total)}</strong><span className="text-xs">AI estimate</span></div>
          </div>
          <label className="mt-6 block text-sm font-medium">Guests: {guests.toLocaleString("en-IN")}
            <input aria-label="Guest count" type="range" min="0" max={Math.max(500, plan.event.guests * 2)} step="1" value={guests} onChange={(event) => setGuests(Number(event.target.value))} className="mt-3 block w-full accent-primary" />
          </label>
          <label className="mt-5 block text-sm font-medium">Total budget
            <input aria-label="Total budget in rupees" type="range" min="0" max={Math.max(10000, plan.budget.total * 2)} step="1000" value={total} onChange={(event) => setTotal(Number(event.target.value))} className="mt-3 block w-full accent-primary" />
            <span className="mt-1 block text-muted-foreground">{formatINR(total)}</span>
          </label>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={applyChanges} className="min-h-11 rounded-xl bg-primary px-4 py-2 font-semibold text-primary-foreground">Save this scenario</button>
            <GenerateAiButton
              onClick={() => void generateBudget()}
              busy={loading}
              label="Generate budget with AI"
              busyLabel="Generating budget…"
            />
          </div>
          {generationNotice && <p className="mt-4 text-sm text-muted-foreground" role="status">{generationNotice}</p>}
          {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
        </aside>
        <div className="space-y-3">
          {categories.map((category) => {
            const perHead = guests === 0 ? 0 : Math.round(category.amount / guests);
            return (
              <article key={category.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-semibold">{category.name}</h2><p className="mt-1 text-xs text-muted-foreground">{category.share.toFixed(1)}% · {category.kind.replace("_", " ")} · {formatINR(perHead)} per guest</p></div>
                  <div className="text-right"><p className="font-heading text-xl font-semibold">{formatINR(category.amount)}</p><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">AI estimate</span></div>
                </div>
                {category.share > 20 && <p className="mt-2 text-xs font-medium text-amber-700">Above a typical category share; check whether this reflects your priorities.</p>}
                <p className="mt-2 text-sm text-muted-foreground">Save tip: {category.saveTip}</p>
                {category.hiddenCostWarnings.length > 0 && <p className="mt-2 text-xs text-amber-700">Hidden costs: {category.hiddenCostWarnings.join(" · ")}</p>}
                {result.deltas[category.id] !== 0 && <p className="mt-2 text-sm font-medium" aria-live="polite">Change: {result.deltas[category.id] > 0 ? "+" : ""}{formatINR(result.deltas[category.id])}</p>}
              </article>
            );
          })}
        </div>
      </div>
      <NextPlanStep current="/budget" />
    </section>
  );
}
