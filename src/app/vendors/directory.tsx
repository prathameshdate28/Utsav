"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, MessageSquareText, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSavedPlan } from "@/lib/hooks/use-saved-plan";
import { formatINR } from "@/lib/engine/format";
import type { Blueprint } from "@/lib/schemas/blueprint";
import { BackToPlan } from "@/components/back-to-plan";
import { NextPlanStep } from "@/components/next-plan-step";
import { CelebrationVisual } from "@/components/celebration-visual";
import { PlanRequired } from "@/components/plan-required";
import { GenerateAiButton } from "@/components/generate-ai-button";

type DemoVendor = NonNullable<Blueprint["vendorCategories"][number]["shortlist"]>[number];
export function VendorDirectory() {
  const { plan, setPlan, error: savedError } = useSavedPlan();
  const reducedMotion = useReducedMotion();
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ whatsapp: string; email: string } | null>(null);
  const [inquiryVendorName, setInquiryVendorName] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState("");
  const [generationNotice, setGenerationNotice] = useState("");
  const categories = plan?.vendorCategories.filter(
    (category) => !category.name.toLowerCase().includes("guest support"),
  ) ?? [];
  const hasRightPanel = inquiryVendorName !== null;

  function toggleCategory(categoryName: string) {
    setCollapsedCategories((current) => current.includes(categoryName)
      ? current.filter((name) => name !== categoryName)
      : [...current, categoryName]);
  }

  async function draftInquiry(vendor: DemoVendor, categoryName: string) {
    if (!plan) return;
    const category = categories.find((item) => item.name === categoryName);
    if (!category) return;
    setLoading(true);
    setError("");
    setInquiryVendorName(vendor.name);
    setMessages(null);
    setCopiedMessage(null);
    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Draft an inquiry for ${vendor.name}.`,
          inquiry: {
            vendor: vendor.name,
            category: categoryName,
            date: plan.event.date,
            guests: plan.event.guests,
            city: plan.event.city,
            budgetMin: vendor.priceMin,
            budgetMax: vendor.priceMax,
            questions: category.mustAskQuestions.slice(0, 3),
          },
        }),
      });
      const data = (await response.json()) as { whatsapp?: string; email?: string; error?: string };
      if (!response.ok || !data.whatsapp || !data.email) throw new Error("We could not prepare the vendor inquiry.");
      setMessages({ whatsapp: data.whatsapp, email: data.email });
    } catch {
      setError("We couldn't prepare the inquiry just now. You can try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  async function generateCategory(categoryName: string) {
    if (!plan || generatingCategory) return;
    const category = categories.find((item) => item.name === categoryName);
    if (!category) return;
    setGeneratingCategory(categoryName);
    setError("");
    setGenerationNotice("");
    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: plan.event, category, budgetTotal: plan.budget.total }),
      });
      const data = await response.json() as { category?: Blueprint["vendorCategories"][number]; fallback?: boolean };
      if (!response.ok || !data.category) throw new Error("Vendor generation is unavailable.");
      if (data.fallback) {
        setError(`We couldn't refresh the ${categoryName.toLowerCase()} shortlist just now. Your current suggestions are still available.`);
        return;
      }
      setPlan({
        ...plan,
        vendorCategories: plan.vendorCategories.map((item) => item.name === categoryName ? data.category! : item),
      });
      setGenerationNotice(`${categoryName} suggestions generated and saved. These are fictional demo profiles, not verified vendors.`);
    } catch {
      setError("We couldn't generate a new vendor shortlist just now. Your current suggestions are still available; please try again shortly.");
    } finally {
      setGeneratingCategory("");
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(label);
      setError("");
    } catch {
      setCopiedMessage(null);
      setError("Clipboard access is unavailable in this browser. You can select and copy the message text.");
    }
  }

  if (!plan) return <PlanRequired message={savedError || "Create or load a plan to view its vendor checklist."} />;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <BackToPlan />
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <header className="min-w-0"><p className="text-sm font-semibold uppercase tracking-widest text-primary">Fictional profiles · estimates, not quotes</p><h1 className="mt-2 font-heading text-4xl font-semibold">Vendor shortlist</h1><p className="mt-2 text-muted-foreground">Review vendor details and create ready-to-send email and WhatsApp messages. Confirm rates, availability and terms directly before booking.</p></header>
        <CelebrationVisual city={plan.event.city} scene="florals" title="Find the right people" caption="Use your shortlist to start a conversation and confirm the details that matter." />
      </div>
      <div className={`mt-6 grid min-w-0 gap-6 transition-[grid-template-columns] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${hasRightPanel ? "lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)] xl:grid-cols-[minmax(190px,0.65fr)_minmax(320px,1fr)_minmax(440px,1.35fr)]" : "lg:grid-cols-1"}`}>
        <motion.div layout transition={{ layout: { duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] } }} className={`min-w-0 space-y-8 ${hasRightPanel ? "lg:col-span-2 xl:col-span-2" : ""}`}>
          {categories.map((category, categoryIndex) => {
            const isCategoryOpen = !collapsedCategories.includes(category.name);
            const contentId = `vendor-category-content-${categoryIndex}`;
            const bestValueVendorId = (category.shortlist ?? []).slice(0, 3).reduce<DemoVendor | null>(
              (best, vendor) => !best || vendor.priceMax / vendor.rating < best.priceMax / best.rating ? vendor : best,
              null,
            )?.id;
            return (
            <section key={category.name} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <button type="button" aria-expanded={isCategoryOpen} aria-controls={contentId} onClick={() => toggleCategory(category.name)} className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
                  <span className="min-w-0">
                    <span className="block font-heading text-xl font-semibold">{category.name}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">Book about {category.bookByDays} days ahead</span>
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${reducedMotion ? "duration-0" : "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"} ${isCategoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                <GenerateAiButton
                  className="shrink-0"
                  disabled={Boolean(generatingCategory) && generatingCategory !== category.name}
                  busy={generatingCategory === category.name}
                  onClick={() => void generateCategory(category.name)}
                  label="Generate with AI"
                  busyLabel="Generating…"
                />
              </div>
              <AnimatePresence initial={false}>
                {isCategoryOpen && (
                  <motion.div
                    id={contentId}
                    key="category-content"
                    initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Must ask</h3>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm">{category.mustAskQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Red flags</h3>
                  <ul className="vendor-red-flags mt-2 list-inside list-disc space-y-1 text-sm font-medium">{category.redFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                {(category.shortlist ?? []).slice(0, 3).map((vendor) => {
                  const bestValue = vendor.id === bestValueVendorId;
                  return (
                    <article key={vendor.id} className="min-w-0 rounded-xl border border-border p-4">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <h3 className="min-w-0 font-semibold">{vendor.name}</h3>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="max-w-24 rounded-full bg-primary/10 px-2 py-1 text-center text-xs font-semibold leading-tight text-primary">Demo vendor</span>
                          {bestValue && <span title="Lowest estimated maximum price per rating point in this category" className="rounded-full bg-emerald-500/10 px-2 py-1 text-center text-xs font-semibold leading-tight text-emerald-800 dark:text-emerald-300">Best value</span>}
                        </div>
                      </div>
                      <p className="mt-2 text-sm">{formatINR(vendor.priceMin)}–{formatINR(vendor.priceMax)} <span className="text-xs text-muted-foreground">AI estimate</span></p>
                      <p className="mt-1 text-sm">★ {vendor.rating.toFixed(1)} <span className="text-muted-foreground">· {vendor.tier}</span></p>
                      <div className="mt-2 flex flex-wrap gap-1">{vendor.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-2 py-1 text-xs">{tag}</span>)}</div>
                      <button
                        type="button"
                        aria-label={`Create email and WhatsApp messages for ${vendor.name}`}
                        disabled={loading}
                        onClick={() => void draftInquiry(vendor, category.name)}
                        className="mt-3 inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
                        {loading && inquiryVendorName === vendor.name ? "Creating messages…" : "Create messages"}
                      </button>
                    </article>
                  );
                })}
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          );
          })}
        </motion.div>
        <AnimatePresence initial={false}>
          {hasRightPanel && (
            <motion.aside
              key="vendor-workspace"
              aria-label="Vendor comparison and message drafts"
              initial={reducedMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: 20 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="max-h-[calc(100vh-7rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-2 lg:self-start xl:sticky xl:top-24 xl:col-span-1"
            >
              {inquiryVendorName && <section aria-labelledby="inquiry-drafts-heading">
                <div className="flex items-start justify-between gap-2">
                  <h2 id="inquiry-drafts-heading" className="font-heading text-xl font-semibold">Messages for {inquiryVendorName}</h2>
                  <button type="button" aria-label="Close message drafts" title="Close message drafts" onClick={() => { setInquiryVendorName(null); setMessages(null); setCopiedMessage(null); setError(""); }} className="shrink-0 rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {loading && <p role="status" className="mt-3 text-sm text-muted-foreground">Creating your email and WhatsApp messages…</p>}
                {!loading && messages && <div className="mt-4 space-y-3">{([["WhatsApp", messages.whatsapp], ["Formal email", messages.email]] as const).map(([label, message]) => { const copied = copiedMessage === label; return <article key={label} className="rounded-xl border border-border/70 bg-background/50 p-3"><div className="flex justify-between gap-2"><h3 className="font-semibold">{label}</h3><button type="button" aria-label={copied ? `${label} copied` : `Copy ${label}`} onClick={() => void copy(message, label)} className={`shrink-0 rounded-lg border border-border p-2 ${copied ? "text-emerald-600" : ""}`}><span className="sr-only">{copied ? "Copied" : "Copy"}</span>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}</button></div><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{message}</pre></article>; })}</div>}
                {!loading && !messages && error && <p className="mt-3 text-sm text-muted-foreground">Couldn’t create the messages. See the notice below and try again.</p>}
              </section>}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
      {generationNotice && <p role="status" className="mt-4 rounded-lg bg-primary/5 p-3 text-sm">{generationNotice}</p>}
      {(error || savedError) && <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900">{error || savedError}{loading ? " Preparing your inquiry..." : ""}</p>}
      <NextPlanStep current="/vendors" />
    </section>
  );
}
