"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Check } from "lucide-react";
import { type Blueprint, type PlanTask } from "@/lib/schemas/blueprint";
import { localISODate, readiness, reflow } from "@/lib/engine/planner";
import { loadActivePlan, saveActivePlan } from "@/lib/storage/plan-library";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { CelebrationVisual } from "@/components/celebration-visual";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";

const PHASES: PlanTask["phase"][] = ["6 months", "3 months", "1 month", "1 week", "day-of"];

function TaskRow({
  task,
  stepNumber,
  onComplete,
}: {
  task: PlanTask;
  stepNumber: number;
  onComplete: (task: PlanTask) => void;
}) {
  return (
    <article className={`relative rounded-xl border p-4 ${task.completed ? "border-emerald-600/30 bg-emerald-500/10" : task.compressed ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-card"}`}>
      <span className={`absolute -left-9 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${task.completed ? "bg-emerald-600 text-white" : "border border-border bg-card text-xs font-semibold text-muted-foreground"}`} aria-hidden="true">
        {task.completed ? <Check className="h-4 w-4" /> : stepNumber}
      </span>
      <div className="flex items-start gap-3">
        <input aria-label={`${task.completed ? "Mark incomplete" : "Mark complete"}: ${task.title}`} type="checkbox" checked={task.completed} onChange={() => onComplete(task)} className="mt-1 h-4 w-4 accent-emerald-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={`font-semibold ${task.completed ? "text-foreground" : ""}`}>{task.title}</h3>
            <time className="text-sm text-muted-foreground" dateTime={task.dueDate}>{task.dueDate}</time>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{task.ownerRole} · {task.reason}</p>
          {task.compressed && <p className="mt-2 text-sm font-medium text-amber-800">Compressed: this milestone is already due. Consider delegating or simplifying it.</p>}
        </div>
      </div>
    </article>
  );
}

function TimelineScrollSection({
  children,
  reducedMotion,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
}) {
  const timelineRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ["start 70%", "end 80%"] });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section ref={timelineRef} className="relative mt-8 space-y-9 pl-9">
      <motion.div style={reducedMotion ? undefined : { scaleY: lineScale }} className="absolute bottom-4 left-3 top-2 w-0.5 origin-top bg-border" aria-hidden="true" />
      {children}
    </section>
  );
}

export function TimelinePlanner() {
  const [plan, setPlan] = useState<Blueprint | null>(null);
  const [date, setDate] = useState("");
  const [today, setToday] = useState("2026-10-29");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [todayOnly, setTodayOnly] = useState(false);
  const reducedMotion = useReducedMotion();
  /* eslint-disable react-hooks/set-state-in-effect -- Hydrate the client-only saved plan once. */
  useEffect(() => {
    const videoMode = new URLSearchParams(window.location.search).get("video") === "1" || localStorage.getItem("utsav-video-mode") === "1";
    if (videoMode) localStorage.setItem("utsav-video-mode", "1");
    const currentDate = videoMode ? "2026-10-29" : localISODate();
    setToday(currentDate);
    try {
      const validated = loadActivePlan();
      if (!validated) return;
      const updated = reflow(validated, validated.event.date, currentDate);
      setPlan(updated);
      if (!videoMode) saveActivePlan(updated);
      setDate(validated.event.date);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The saved timeline could not be loaded.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const readinessResult = useMemo(() => plan ? readiness(plan.timeline, today) : null, [plan, today]);

  function persist(updated: Blueprint) {
    setPlan(updated);
    saveActivePlan(updated);
  }

  function changeDate(value: string) {
    if (!plan) return;
    setDate(value);
    try {
      persist(reflow(plan, value, today));
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The timeline could not be reflowed.");
    }
  }

  function toggleTask(target: PlanTask) {
    if (!plan) return;
    persist({
      ...plan,
      timeline: plan.timeline.map((task) => task.id === target.id ? { ...task, completed: !task.completed } : task),
    });
  }

  async function generateTimeline() {
    if (!plan) return;
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json() as { timeline?: Blueprint["timeline"]; fallback?: boolean };
      if (!response.ok || !data.timeline) throw new Error("Timeline generation is unavailable.");
      if (data.fallback) {
        setError("We couldn't generate a new timeline just now. Your current timeline is still available; please try again shortly.");
        return;
      }
      persist({ ...plan, timeline: data.timeline });
    } catch {
      setError("We couldn't generate a new timeline just now. Your current timeline is still available; please try again shortly.");
    } finally {
      setGenerating(false);
    }
  }

  function isInTodayWindow(task: PlanTask): boolean {
    if (!task.dueDate) return false;
    const due = new Date(`${task.dueDate}T00:00:00Z`).getTime();
    const start = new Date(`${today}T00:00:00Z`).getTime();
    return due < start || due <= start + 7 * 86400000;
  }

  if (!plan) return <PlanRequired message={error || "Create a plan first to build your timeline."} />;
  const shown = plan.timeline.filter((task) => todayOnly ? !task.completed && isInTodayWindow(task) : true);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <header className="flex min-w-0 flex-wrap items-end justify-between gap-5">
          <div><p className="text-sm font-semibold uppercase tracking-widest text-primary">Your milestones</p><h1 className="mt-2 font-heading text-4xl font-semibold">Timeline</h1><p className="mt-2 text-muted-foreground">Dates respect task dependencies; past milestones are marked for a practical reset.</p></div>
          <label className="text-sm font-medium">Event date
            <input aria-label="Change event date" type="date" value={date} onChange={(event) => changeDate(event.target.value)} className="mt-1 block min-h-11 rounded-lg border border-border bg-card px-3 py-2" />
          </label>
        </header>
        <CelebrationVisual city={plan.event.city} scene="lighting" title="Every detail, in its own time" caption="A clear sequence lets you focus on one milestone at a time." />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Readiness</p><p className="mt-1 font-heading text-3xl font-semibold">{readinessResult?.score ?? 0}%</p><div className="mt-2 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${readinessResult?.score ?? 0}%` }} /></div></article>
        <article className="rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">Next best action</p><p className="mt-2 font-semibold">{readinessResult?.nextBestAction?.title ?? "All caught up"}</p></article>
      </div>
      <div className="mt-5">
        <GenerateAiButton
          onClick={() => void generateTimeline()}
          busy={generating}
          label="Generate timeline with AI"
          busyLabel="Generating timeline…"
        />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" aria-pressed={todayOnly} onClick={() => setTodayOnly(!todayOnly)} className={`min-h-11 rounded-xl border px-4 py-2 font-medium ${todayOnly ? "border-primary bg-primary/10" : "border-border bg-card"}`}>Today · overdue and next 7 days</button>
        <p className="text-sm text-muted-foreground">{today}</p>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900">{error}</p>}
      <TimelineScrollSection reducedMotion={Boolean(reducedMotion)}>
        {PHASES.map((phase) => {
          const tasks = shown.filter((task) => task.phase === phase);
          if (tasks.length === 0) return null;
          return (
            <section key={phase} aria-labelledby={`phase-${phase.replaceAll(" ", "-")}`}>
              <h2 id={`phase-${phase.replaceAll(" ", "-")}`} className="mb-3 font-heading text-2xl font-semibold">{phase}</h2>
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <motion.div key={task.id} initial={reducedMotion ? false : { opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: reducedMotion ? 0 : 0.25, delay: reducedMotion ? 0 : index * 0.04 }}>
                    <TaskRow task={task} stepNumber={plan.timeline.findIndex((item) => item.id === task.id) + 1} onComplete={toggleTask} />
                  </motion.div>
                ))}
              </div>
            </section>
          );
        })}
        {shown.length === 0 && <p className="rounded-xl border border-border bg-card p-5 text-muted-foreground">No open tasks in this view. Take a breath; you’re on track.</p>}
      </TimelineScrollSection>
      <NextPlanStep current="/timeline" />
    </section>
  );
}
