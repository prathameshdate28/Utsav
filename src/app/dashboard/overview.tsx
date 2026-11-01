"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowDownToLine, ArrowRight, Check, Sparkles } from "lucide-react";
import { blueprintSchema, type Blueprint } from "@/lib/schemas/blueprint";
import { localISODate, readiness } from "@/lib/engine/planner";
import { formatINR } from "@/lib/engine/format";
import { createPlanPdf } from "@/lib/engine/plan-pdf";
import {
  activateSavedPlan,
  loadActivePlan,
  saveActivePlan,
  savePlanWithId,
} from "@/lib/storage/plan-library";
import { NextPlanStep } from "@/components/next-plan-step";
import { CelebrationVisual } from "@/components/celebration-visual";
import { GenerateAiLink } from "@/components/generate-ai-button";
import cachedJaipurPlan from "../../../data/demo/jaipur-wedding.json";

const SCREENS = [
  ["Budget", "/budget"],
  ["Timeline", "/timeline"],
  ["Vendors", "/vendors"],
  ["Ideas", "/ideas"],
  ["Mood board", "/moodboard"],
  ["Ceremonies", "/ceremonies"],
] as const;

export function DashboardOverview() {
  const [plan, setPlan] = useState<Blueprint | null>(null);
  const [error, setError] = useState("");
  const [today, setToday] = useState("2026-10-29");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [planSource, setPlanSource] = useState("");
  const [visibleCompletedTaskIds, setVisibleCompletedTaskIds] = useState<Set<string>>(() => new Set());
  const reducedMotion = useReducedMotion();

  /* eslint-disable react-hooks/set-state-in-effect -- Load browser-only plan state after hydration. */
  useEffect(() => {
    const videoMode = new URLSearchParams(window.location.search).get("video") === "1" || localStorage.getItem("utsav-video-mode") === "1";
    setToday(videoMode ? "2026-10-29" : localISODate());
    try {
      if (videoMode) {
        localStorage.setItem("utsav-video-mode", "1");
        const demoPlan = blueprintSchema.parse(cachedJaipurPlan);
        setPlan(savePlanWithId(demoPlan, "video-demo").plan);
      } else {
        const selectedPlanId = new URLSearchParams(window.location.search).get("planId");
        if (selectedPlanId) {
          setPlan(activateSavedPlan(selectedPlanId).plan);
          setNotice("");
          setPlanSource("");
          localStorage.removeItem("utsav-plan-notice");
          localStorage.removeItem("utsav-plan-source");
        } else {
          const savedNotice = localStorage.getItem("utsav-plan-notice") || "";
          const containsProviderDetails = /\b(?:gemini|groq|quota|rate.?limit|api.?key|provider|http\s*\d{3})\b/i.test(savedNotice);
          const publicNotice = containsProviderDetails
            ? "Your editable plan is ready as a starting point. You can refine it now or try AI generation again later."
            : savedNotice;
          setNotice(publicNotice);
          if (containsProviderDetails) localStorage.setItem("utsav-plan-notice", publicNotice);
          setPlanSource(localStorage.getItem("utsav-plan-source") || "");
          setPlan(loadActivePlan());
        }
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Your saved plans could not be read.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const ready = useMemo(() => plan ? readiness(plan.timeline, today) : null, [plan, today]);
  const daysUntil = plan
    ? Math.max(0, Math.ceil((new Date(`${plan.event.date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000))
    : 0;

  function toggleTask(id: string) {
    if (!plan) return;
    const wasCompleted = plan.timeline.find((task) => task.id === id)?.completed ?? false;
    const updated = {
      ...plan,
      timeline: plan.timeline.map((task) => task.id === id ? { ...task, completed: !task.completed } : task),
    };
    try {
      saveActivePlan(updated);
      setPlan(updated);
      setVisibleCompletedTaskIds((current) => {
        const next = new Set(current);
        if (wasCompleted) next.delete(id);
        else next.add(id);
        return next;
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The plan could not be saved.");
    }
  }

  async function exportPdf() {
    if (!plan) return;
    setExporting(true);
    setError("");
    try {
      const bytes = await createPlanPdf(plan);
      const pdfBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(pdfBuffer).set(bytes);
      const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
      const slug = plan.event.title
        .normalize("NFKD")
        .replace(/[^\w -]/g, "")
        .trim()
        .replace(/[\s-]+/g, "-")
        .slice(0, 60);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slug || "utsav-plan"}.pdf`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The plan PDF could not be created.");
    } finally {
      setExporting(false);
    }
  }

  if (!plan) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="mx-auto max-w-3xl py-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-4xl font-semibold">Your celebration starts with a few details.</h1>
          <p className="mt-3 text-muted-foreground">{error || "Create a plan from your event prompt. Your saved plan will appear here."}</p>
          <GenerateAiLink href="/#plan-prompt" className="mt-6">Generate plan with AI</GenerateAiLink>
        </section>
      </main>
    );
  }

  const upcomingTasks = plan.timeline.filter((task) => !task.completed).slice(0, 5);
  const retainedCompletedTasks = plan.timeline.filter(
    (task) => task.completed && visibleCompletedTaskIds.has(task.id),
  );
  const taskIdsToShow = new Set([...retainedCompletedTasks, ...upcomingTasks].map((task) => task.id));
  const nextTasks = plan.timeline.filter((task) => taskIdsToShow.has(task.id));
  if (nextTasks.length === 0) {
    nextTasks.push(...plan.timeline.slice(-5));
  }
  const ringColors = ["#7A1F3D", "#F2A900", "#0F7C78", "#E35D7E", "#2563EB", "#C9A24B"];
  const ringStops = plan.budget.categories.reduce<{ end: number; stops: string[] }>((result, category, index) => ({
    end: result.end + category.share,
    stops: [...result.stops, `${ringColors[index % ringColors.length]} ${result.end}% ${result.end + category.share}%`],
  }), { end: 0, stops: [] }).stops.join(", ");
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" style={{ "--event-accent": plan.event.accentColor } as React.CSSProperties}>
      <div className="mb-8 grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex min-w-0 flex-col items-start gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Your celebration plan</p>
            <h1 className="mt-2 font-heading text-4xl font-semibold sm:text-5xl">{plan.event.title}</h1>
            <p className="mt-2 text-muted-foreground">{plan.event.city} · {plan.event.guests.toLocaleString("en-IN")} guests · {plan.event.concept}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2">
            <button type="button" onClick={() => void exportPdf()} disabled={exporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 font-medium hover:border-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" /> {exporting ? "Creating PDF…" : "Export PDF"}
            </button>
            <Link href="/panic" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Panic button
            </Link>
          </div>
        </motion.div>
        <CelebrationVisual city={plan.event.city} scene="entrance" title="The day you’re bringing to life" caption={plan.event.concept} />
      </div>
      {(planSource === "gemini" || planSource === "groq" || planSource === "grok") && <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Draft generated with {planSource === "groq" || planSource === "grok" ? "Groq backup" : "Gemini"}</p>}
      {planSource === "offline" && <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-800">Offline fallback plan</p>}
      {planSource === "demo" && <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground">Cached demo plan · vendor profiles are fictional</p>}
      {notice && <p className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{notice}<button type="button" onClick={() => { setNotice(""); localStorage.removeItem("utsav-plan-notice"); }} className="ml-3 underline">Dismiss</button></p>}
      {error && <p className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Countdown", `${daysUntil} days`, "Until your event"],
          ["Readiness", `${ready?.score ?? 0}%`, "Weighted by planning phase"],
          ["AI estimate", formatINR(plan.budget.total), "Budget total · verify locally"],
        ].map(([label, value, caption], index) => (
          <motion.article key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-heading text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
          </motion.article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold">Next steps</h2>
            <Link href="/timeline" className="text-sm font-medium text-primary">Full timeline</Link>
          </div>
          <ul className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {nextTasks.map((task) => (
                <motion.li
                  key={task.id}
                  layout={!reducedMotion}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  className={`relative flex items-start gap-3 rounded-xl border p-3 ${task.completed ? "border-emerald-600/25 bg-emerald-500/10" : "border-border bg-secondary/50"}`}
                >
                  <button
                    type="button"
                    aria-label={`${task.completed ? "Mark incomplete" : "Complete"} ${task.title}`}
                    onClick={() => toggleTask(task.id)}
                    className={`z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${task.completed ? "border-emerald-600/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border-border bg-card text-muted-foreground"}`}
                  >
                    {task.completed
                      ? <Check className="h-4 w-4" aria-hidden="true" />
                      : plan.timeline.findIndex((item) => item.id === task.id) + 1}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.ownerRole} · {task.reason}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </motion.section>
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-5">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(${ringStops})` }} aria-label="Budget category ring">
              <div className="flex h-[5.25rem] w-[5.25rem] flex-col items-center justify-center rounded-full bg-card text-center"><span className="text-[10px] text-muted-foreground">Budget</span><strong className="text-xs">{formatINR(plan.budget.total)}</strong></div>
            </div>
            <div><h2 className="font-heading text-2xl font-semibold">Why these suggestions?</h2><p className="mt-1 text-xs text-muted-foreground">Assumptions behind your plan</p></div>
          </div>
          <ul className="mt-4 space-y-3">
            {plan.assumptions.map((assumption, index) => (
              <li key={`${assumption.text}-${index}`} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{assumption.text}</p>
                <details className="mt-2">
                  <summary className="w-fit cursor-pointer rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Why?</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{assumption.reason}</p>
                </details>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
      <nav aria-label="Planning screens" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SCREENS.map(([label, href]) => <Link key={href} href={href} className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary focus-visible:outline-2 focus-visible:outline-ring">{label}<ArrowRight className="h-4 w-4" /></Link>)}
      </nav>
      <NextPlanStep current="/dashboard" />
    </section>
  );
}
