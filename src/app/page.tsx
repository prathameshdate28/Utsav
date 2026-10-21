import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import { HeroBadge } from "@/components/landing/hero-badge";
import { InteractivePreviewCockpit } from "@/components/landing/interactive-preview-cockpit";
import { CelebrationPillars } from "@/components/landing/celebration-pillars";

/**
 * Elevated landing page for Utsav: An AI Event Co-Planner for Indian celebrations.
 * Adheres strictly to Marigold Noir design tokens, Fraunces serif display, and pure math engine.
 */
export default function Home() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Ambient Marigold Glow (Opacity & transform safe) */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/10 rounded-full blur-[140px] -z-10"
        aria-hidden="true"
      />

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <HeroBadge />

          <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.12]">
            The Art of Indian Celebration,{" "}
            <span className="italic text-primary font-normal">
              Orchestrated with AI.
            </span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Weddings, milestone birthdays, and community festivals. Experience
            deterministic budget calculations, cultural ritual checklists, and
            transparent demo vendor guides without stress.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 pb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              <span>Open Co-Planner Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/budget"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-primary/30 bg-card/60 backdrop-blur text-foreground font-medium text-sm hover:bg-secondary/60 transition-opacity"
            >
              <Calculator className="h-4 w-4 text-primary" />
              <span>Explore Budget Engine</span>
            </Link>
          </div>

          {/* Interactive Live Celebration Cockpit Preview */}
          <div className="pt-4">
            <InteractivePreviewCockpit />
          </div>
        </div>
      </section>

      {/* Four Pillars */}
      <CelebrationPillars />
    </div>
  );
}
