"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CakeSlice, Heart, UsersRound } from "lucide-react";
import jaipurWedding from "../../../data/demo/jaipur-wedding.json";
import puneBirthday from "../../../data/demo/pune-birthday.json";
import thaneCommunity from "../../../data/demo/thane-community.json";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import { saveNewPlan } from "@/lib/storage/plan-library";
import { GenerateAiButton } from "@/components/generate-ai-button";

export const DEMO_PROMPTS = [
  { name: "jaipur-wedding", label: "Jaipur wedding", prompt: "My sister's wedding in Jaipur, 300 guests, ₹25 lakh, February, mix of traditional and modern", icon: Heart },
  { name: "pune-birthday", label: "Pune birthday", prompt: "A 5th birthday for my daughter in Pune, 40 guests, ₹60,000, she loves dinosaurs and butterflies", icon: CakeSlice },
  { name: "thane-community", label: "Ganesh Utsav", prompt: "Society Ganesh Utsav in Thane, 400 residents, ₹2 lakh, eco-friendly", icon: UsersRound },
] as const;

const NARRATION = [
  "Reading your event...",
  "Balancing your budget...",
  "Building your timeline and vendor shortlist...",
  "Checking the full plan...",
  "This can take up to 90 seconds...",
] as const;
const DEMO_PLANS = {
  "jaipur-wedding": jaipurWedding,
  "pune-birthday": puneBirthday,
  "thane-community": thaneCommunity,
} as const;

export function PlanPromptBox() {
  const router = useRouter();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.hash === "#plan-prompt") {
      window.requestAnimationFrame(() => promptRef.current?.focus({ preventScroll: true }));
    }
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("video") !== "1") return;
    localStorage.setItem("utsav-video-mode", "1");
    const plan = blueprintSchema.parse(jaipurWedding);
    saveNewPlan(plan);
    router.replace("/dashboard?video=1");
  }, [router]);

  async function createPlan(value: string) {
    if (loading) return;
    setPrompt(value);
    setError("");
    if (value.trim().length < 12) {
      setError("Add at least 12 characters so we can shape a useful first plan.");
      return;
    }
    setLoading(true);
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 1, NARRATION.length - 1));
    }, 8000);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      });
      const result = (await response.json()) as {
        plan?: unknown;
        error?: string;
        fallback?: boolean;
        notice?: string;
        provider?: "gemini" | "groq";
      };
      if (!response.ok || !result.plan) {
        throw new Error(result.error || "We could not make your plan. Please try again.");
      }
      saveNewPlan(blueprintSchema.parse(result.plan));
      localStorage.removeItem("utsav-video-mode");
      if (result.fallback) {
        localStorage.setItem("utsav-plan-notice", result.notice || "A ready-to-use offline planning draft is available.");
        localStorage.setItem("utsav-plan-source", "offline");
      } else {
        const provider = result.provider === "groq" ? "groq" : "gemini";
        localStorage.setItem("utsav-plan-notice", result.notice || `AI-generated draft by ${provider === "groq" ? "Groq backup" : "Gemini"}. Utsav calculates budget totals and due dates in code.`);
        localStorage.setItem("utsav-plan-source", provider);
      }
      router.push("/dashboard");
    } catch {
      setError("We couldn't create your plan just now. Please try again shortly.");
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function loadDemo(name: (typeof DEMO_PROMPTS)[number]["name"]) {
    if (loading) return;
    setError("");
    try {
      const plan = blueprintSchema.parse(DEMO_PLANS[name]);
      saveNewPlan(plan);
      localStorage.removeItem("utsav-video-mode");
      localStorage.removeItem("utsav-plan-notice");
      localStorage.setItem("utsav-plan-source", "demo");
      router.push("/dashboard");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "This demo could not be loaded.");
    }
  }

  return (
    <div id="plan-prompt" className="mx-auto w-full max-w-2xl rounded-3xl border border-border/80 bg-card/95 p-3 text-left shadow-2xl shadow-primary/10 ring-1 ring-foreground/[0.03] backdrop-blur sm:p-4">
      <label htmlFor="event-prompt" className="sr-only">Describe your celebration</label>
      <textarea
        ref={promptRef}
        id="event-prompt"
        value={prompt}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (error) setError("");
        }}
        placeholder="Tell us what you are celebrating, where, and your budget..."
        rows={3}
        maxLength={2000}
        disabled={loading}
        aria-describedby="prompt-help prompt-feedback"
        aria-invalid={Boolean(error)}
        className="w-full resize-y rounded-2xl border border-transparent bg-muted/35 p-4 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/90 focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/10 disabled:opacity-70 sm:min-h-28"
      />
      <div className="flex flex-col gap-3 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-10 text-sm sm:py-1">
          <p id="prompt-feedback" aria-live="polite" className={error ? "font-medium text-destructive" : "text-muted-foreground"}>
            {loading ? NARRATION[progress] : error || "A few details are enough to get started."}
          </p>
          <p id="prompt-help" className="mt-1 text-xs text-muted-foreground/80">
            {prompt.trim().length}/2000 characters · include the occasion, city, and budget
          </p>
        </div>
        <GenerateAiButton
          className="shrink-0"
          onClick={() => void createPlan(prompt)}
          busy={loading}
          label="Generate plan with AI"
          busyLabel="Generating your plan…"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 px-2 pt-4">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Explore a demo</span>
        {DEMO_PROMPTS.map((demo) => (
          <button
            key={demo.name}
            type="button"
            disabled={loading}
            onClick={() => void loadDemo(demo.name)}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs font-semibold text-foreground transition-[transform,opacity] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <demo.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {demo.label}
          </button>
        ))}
      </div>
    </div>
  );
}
