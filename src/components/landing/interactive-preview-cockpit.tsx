"use client";

import { useState, useMemo } from "react";
import { Users, Sparkles, AlertCircle, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { calculateBudgetEstimate, BudgetTier } from "@/lib/engine/budget";
import { formatINR, formatCompactINR } from "@/lib/engine/format";

const EVENT_MODES = [
  { id: "wedding", label: "Royal Wedding (विवाह)", ceremonies: 4 },
  { id: "birthday", label: "Milestone 50th (जन्मोत्सव)", ceremonies: 2 },
  { id: "community", label: "Diwali / Dandiya Utsav", ceremonies: 3 },
];

/**
 * Interactive live celebration preview cockpit.
 * Demonstrates real-time pure math engine recalculations without LLM hallucination.
 */
export function InteractivePreviewCockpit() {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_MODES[0]);
  const [guests, setGuests] = useState(250);
  const [tier, setTier] = useState<BudgetTier>("grand");

  // Pure mathematical calculation - AI never touches totals
  const estimate = useMemo(() => {
    return calculateBudgetEstimate({
      guestCount: guests,
      tier,
      ceremonyCount: selectedEvent.ceremonies,
    });
  }, [guests, tier, selectedEvent]);

  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-primary/30 bg-card/80 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
      {/* Event Selector Pill Tabs */}
      <div className="flex flex-wrap gap-2 pb-5 border-b border-border/60">
        {EVENT_MODES.map((ev) => (
          <button
            key={ev.id}
            type="button"
            onClick={() => setSelectedEvent(ev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedEvent.id === ev.id
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            {ev.label}
          </button>
        ))}
      </div>

      {/* Live Sliders & Controls */}
      <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Guest Count
            </span>
            <span className="font-semibold text-primary">{guests} Attendees</span>
          </div>
          <input
            type="range"
            min="50"
            max="1200"
            step="25"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
            aria-label="Guest count slider"
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-foreground">Celebration Scale</div>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {(["intimate", "grand", "royal"] as BudgetTier[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`py-1.5 rounded-md capitalize font-medium transition-opacity ${
                  tier === t
                    ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
                    : "border border-border/70 text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Math Output Card */}
      <div className="rounded-xl border border-primary/20 bg-background/70 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
              Deterministic Engine Estimate
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              {formatINR(estimate.totalEstimatedCost)}
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (~{formatCompactINR(estimate.perGuestCost)} / guest)
              </span>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-accent/15 text-accent font-medium border border-accent/30">
            <Sparkles className="h-3 w-3" />
            <span>Pure Engine Math</span>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-border/40">
          <div>
            <div className="text-muted-foreground text-[10px]">Catering (Feast)</div>
            <div className="font-semibold">{formatCompactINR(estimate.cateringCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px]">Mandap & Decor</div>
            <div className="font-semibold">{formatCompactINR(estimate.decorCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px]">Venue Benchmark</div>
            <div className="font-semibold">{formatCompactINR(estimate.venueCost)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[10px]">10% Contingency</div>
            <div className="font-semibold text-primary">{formatCompactINR(estimate.contingencyCost)}</div>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <div className="flex items-start gap-2 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
          <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            Estimated price. All suggested providers are demo vendors. Ceremonies commonly
            practised; traditions vary by family.
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 flex justify-end">
        <Link
          href="/budget"
          className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline group"
        >
          <span>Open Full Interactive What-If Simulator</span>
          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
