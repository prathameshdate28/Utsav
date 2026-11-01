import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PLAN_STEPS = [
  { href: "/dashboard", title: "Dashboard", description: "Review your celebration plan and latest progress." },
  { href: "/budget", title: "Budget", description: "Set your spending priorities and review estimates." },
  { href: "/timeline", title: "Timeline", description: "Organize the milestones leading up to your event." },
  { href: "/vendors", title: "Vendors", description: "Explore vendors for the services your event needs." },
  { href: "/ideas", title: "Ideas", description: "Explore themes, menu suggestions, and invitation text." },
  { href: "/ceremonies", title: "Ceremonies & programme", description: "Shape the order and details of your event programme." },
  { href: "/moodboard", title: "Moodboard", description: "See visual inspiration for your celebration." },
] as const;

type PlanStepHref = (typeof PLAN_STEPS)[number]["href"];

export function NextPlanStep({ current }: { current: PlanStepHref }) {
  const currentIndex = PLAN_STEPS.findIndex((step) => step.href === current);
  const next = PLAN_STEPS[(currentIndex + 1) % PLAN_STEPS.length];

  return (
    <Link
      href={next.href}
      className="mt-10 flex min-h-24 items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <span>
        <span className="block text-xs font-semibold uppercase tracking-widest text-primary">Next step</span>
        <span className="mt-1 block font-heading text-xl font-semibold">{next.title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{next.description}</span>
      </span>
      <ArrowRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
    </Link>
  );
}
