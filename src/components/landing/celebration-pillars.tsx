import { Calculator, Flame, CalendarHeart, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: Calculator,
    title: "Pure Math Engine",
    subtitle: "Zero LLM Halftruths",
    desc: "Every rupee calculated by pure TypeScript functions in src/lib/engine/. What-if sliders let you tweak guests, plates, and decor live.",
    tag: "Deterministic",
  },
  {
    icon: CalendarHeart,
    title: "Ceremonial Sequences",
    subtitle: "Cultural Nuances",
    desc: "Curated schedules for Haldi, Sangeet, Muhurat, or milestone 50th pujas. Commonly practised; traditions vary by family.",
    tag: "Heritage",
  },
  {
    icon: ShieldCheck,
    title: "Transparent Estimates",
    subtitle: "Demo Directory",
    desc: "Every price is clearly marked as an estimated price. Every caterer, decorator, or artist is designated as a demo vendor.",
    tag: "Ethics",
  },
  {
    icon: Flame,
    title: "The Panic Button",
    subtitle: "Real-time Contingency",
    desc: "Instant rain cover protocols, backup generator playbooks, and vendor delay templates ready at a single tap.",
    tag: "Resilience",
  },
];

/**
 * Editorial four-pillar feature grid with Marigold Noir brass borders.
 */
export function CelebrationPillars() {
  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border/60 bg-gradient-to-b from-transparent via-secondary/10 to-transparent">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="text-xs uppercase tracking-widest text-primary font-semibold">
            Engineered for High-Stakes Celebrations
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            Where Tradition Meets Deterministic Precision
          </h2>
          <p className="text-sm text-muted-foreground">
            A celebration should be filled with memories, not computational errors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="group relative rounded-2xl border border-primary/20 bg-card/60 p-6 sm:p-7 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card/90"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {p.tag}
                  </span>
                </div>

                <div className="text-xs text-primary font-medium tracking-wide">
                  {p.subtitle}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  {p.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
