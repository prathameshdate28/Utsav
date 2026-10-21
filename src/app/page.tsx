import Link from "next/link";
import { Sparkles, ArrowRight, Calculator, CalendarDays, ShieldCheck, Flame } from "lucide-react";

/**
 * Landing page introducing Utsav: An AI event co-planner for Indian celebrations.
 * Styled with Marigold Noir design tokens and Fraunces editorial typography.
 */
export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
            <Sparkles className="h-4 w-4" />
            <span>AI Event Co-Planner for India</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            The Art of Indian Celebration,{" "}
            <span className="text-primary italic">Orchestrated with AI.</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Co-plan weddings, milestone birthdays, and community utsavs. Pure
            deterministic budget calculations, cultural ritual checklists, and
            transparent demo vendor guides.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              <span>Open Co-Planner Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/budget"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border bg-card text-foreground font-medium text-sm hover:bg-secondary/60 transition-opacity"
            >
              <span>Explore Budget Engine</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-12 px-4 sm:px-6 border-t border-border/50 bg-secondary/20">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl border border-border/70 bg-card space-y-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Calculator className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Engine-Driven Maths
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All totals, what-if sliders, and readiness metrics are calculated
                by pure functions in code—never hallucinated by an LLM.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card space-y-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <CalendarDays className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Ceremonial Rituals
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Step-by-step guidance for Mehendi, Haldi, Sangeet & Muhurat.
                Commonly practised; traditions vary by family.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card space-y-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Honest Disclaimers
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every price is an estimated price. Every partner is a demo vendor.
                Transparent, ethical co-planning.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-border/70 bg-card space-y-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Flame className="h-5 w-5" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Panic Button
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rain at the mandap? Caterer running late? Rapid contingency
                playbooks ready at a single tap.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
