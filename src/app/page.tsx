import {
  CalendarDays,
  Check,
  CircleDollarSign,
  Flower2,
  Heart,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { HeroBadge } from "@/components/landing/hero-badge";
import { FestiveIllustration } from "@/components/landing/festive-illustration";
import { PlanPromptBox } from "@/components/landing/plan-prompt-box";
import { ScrollStory } from "@/components/landing/scroll-story";

/**
 * Elevated landing page for Utsav: An AI Event Co-Planner for Indian celebrations.
 * Adheres strictly to Marigold Noir design tokens, Fraunces serif display, and pure math engine.
 */
export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px]"
        style={{ backgroundImage: "radial-gradient(ellipse at 18% 18%, hsl(var(--accent) / 0.16), transparent 38%), radial-gradient(ellipse at 84% 26%, hsl(var(--primary) / 0.12), transparent 36%), radial-gradient(ellipse at 78% 72%, rgb(15 124 120 / 0.1), transparent 34%), radial-gradient(ellipse at 12% 78%, rgb(227 93 126 / 0.08), transparent 32%)" }}
        aria-hidden="true"
      />

      <section id="homepage-hero" className="landing-hero-section relative scroll-mt-16 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:pt-20">
        <div className="landing-hero-grid container mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
          <div className="landing-hero-copy relative z-10 mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="animate-landing-enter" style={{ animationDelay: "80ms" }}>
              <HeroBadge />
            </div>
            <h1 className="landing-hero-title animate-landing-enter mt-7 font-heading text-5xl font-bold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl" style={{ animationDelay: "180ms" }}>
              Plan the celebration,
              <span className="mt-1 block font-normal italic text-primary">not the chaos.</span>
            </h1>
            <p className="landing-hero-description animate-landing-enter mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0" style={{ animationDelay: "300ms" }}>
              Bring the big day, the little details, and everyone you love into
              one thoughtful plan.
            </p>

            <div className="landing-hero-prompt animate-landing-enter mt-8 scroll-mt-24" style={{ animationDelay: "420ms" }}>
              <PlanPromptBox />
            </div>

            <div className="landing-hero-assurances animate-landing-enter mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground lg:justify-start" style={{ animationDelay: "540ms" }}>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Your plan, saved on your device</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Estimates clearly labelled</span>
            </div>
          </div>

          <div className="landing-hero-preview animate-landing-enter relative mx-auto mb-5 w-full max-w-xl sm:pt-8 lg:ml-auto" style={{ animationDelay: "260ms" }}>
            <div className="absolute -inset-6 -z-10 rounded-[3rem] blur-2xl" style={{ backgroundImage: "radial-gradient(ellipse at 20% 20%, rgb(227 93 126 / 0.28), transparent 42%), radial-gradient(ellipse at 80% 18%, rgb(108 99 199 / 0.24), transparent 40%), radial-gradient(ellipse at 50% 90%, rgb(15 124 120 / 0.2), transparent 45%)" }} aria-hidden="true" />
            <div className="absolute -right-3 top-3 z-10 hidden items-center gap-2 whitespace-nowrap rounded-2xl border border-border/70 bg-card px-4 py-3 text-xs font-semibold shadow-xl sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "rgb(227 93 126 / 0.18)", color: "#E35D7E" }}><Sparkles className="h-4 w-4" /></span>
              One calm plan, start to finish
            </div>

            <div className="landing-hero-card animate-landing-glow overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 p-5 shadow-2xl shadow-primary/10 ring-1 ring-foreground/[0.04] backdrop-blur transition-transform duration-500 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0 sm:p-7 sm:pb-14">
              <div className="landing-hero-illustration relative -mx-5 -mt-5 mb-5 h-40 overflow-hidden sm:-mx-7 sm:-mt-7 sm:h-48">
                <FestiveIllustration />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-background/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur">
                  <Flower2 className="h-3.5 w-3.5" style={{ color: "#E35D7E" }} aria-hidden="true" />
                  Made for your big day
                </span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Your celebration, in rhythm</p>
                  <h2 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">From first thought to day-of</h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-primary">
                  <Flower2 className="h-5 w-5" />
                </span>
              </div>

              <div className="landing-hero-budget mt-7 grid grid-cols-[0.82fr_1.18fr] items-center gap-4 rounded-2xl bg-muted/55 p-4 sm:gap-6 sm:p-5">
                <div className="landing-hero-budget-ring relative mx-auto flex aspect-square w-full max-w-36 items-center justify-center rounded-full p-3" style={{ background: "conic-gradient(from 225deg, hsl(var(--primary)) 0 38%, hsl(var(--accent)) 38% 65%, #0F7C78 65% 84%, hsl(var(--border)) 84% 100%)" }} aria-label="Illustrative budget category ring">
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-card text-center">
                    <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Budget</span>
                    <span className="text-xs font-medium text-muted-foreground">in balance</span>
                  </div>
                </div>
                <div className="landing-hero-budget-items space-y-3">
                  {[
                    { label: "Budget", detail: "Clear, adjustable estimates", icon: CircleDollarSign, color: "#0F7C78" },
                    { label: "Timeline", detail: "The next step, right on time", icon: CalendarDays, color: "#E35D7E" },
                    { label: "People", detail: "Guests, vendors & family", icon: UsersRound, color: "#6C63C7" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm" style={{ color: item.color, backgroundColor: `${item.color}24` }}>
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="landing-hero-path mt-4 rounded-2xl border border-border/70 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">A little at a time</p>
                    <p className="mt-1 font-heading text-lg font-semibold">Your planning path</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary">MADE FOR YOU</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {["Imagine", "Organise", "Celebrate"].map((step, index) => (
                    <div key={step} className="relative rounded-xl bg-muted/60 px-2 py-3 text-center">
                      <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{index + 1}</span>
                      <p className="mt-2 text-[11px] font-semibold sm:text-xs">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-border/70 bg-card px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3 lg:-left-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Heart className="h-4 w-4" /></span>
              <span className="text-xs font-semibold">More presence.<br /><span className="font-normal text-muted-foreground">Less planning stress.</span></span>
            </div>
          </div>

          <div className="landing-hero-cta flex flex-wrap items-center justify-center gap-3 text-center lg:col-span-2">
            <span className="text-xs text-muted-foreground">Weddings · Birthdays · Community celebrations</span>
          </div>
        </div>
      </section>

      <ScrollStory />
    </div>
  );
}
