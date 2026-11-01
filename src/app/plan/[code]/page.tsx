import { Suspense } from "react";
import { notFound } from "next/navigation";
import { decodePlan } from "@/lib/engine/planner";
import { formatINR } from "@/lib/engine/format";
import { CelebrationVisual } from "@/components/celebration-visual";
import { GenerateAiLink } from "@/components/generate-ai-button";

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Opening shared plan...</p>}>
      <SharedPlanContent params={params} />
    </Suspense>
  );
}

async function SharedPlanContent({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let plan;
  try {
    plan = decodePlan(code);
  } catch {
    notFound();
  }
  const now = new Date();
  const eventDate = new Date(`${plan.event.date}T00:00:00.000Z`);
  const days = Math.max(0, Math.ceil((eventDate.getTime() - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / 86400000));
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="grid items-center gap-5 rounded-3xl border border-border bg-card p-5 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)]">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-widest">Shared celebration plan · read only</p>
          <h1 className="mt-4 font-heading text-4xl font-semibold sm:text-6xl">{plan.event.title}</h1>
          <p className="mt-3 text-lg">{plan.event.city} · {plan.event.guests.toLocaleString("en-IN")} guests · {days} days to go</p>
        </div>
        <CelebrationVisual city={plan.event.city} scene="entrance" title={plan.event.title} caption={plan.event.concept} />
      </header>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Budget estimate</p><p className="mt-2 font-heading text-3xl font-semibold">{formatINR(plan.budget.total)}</p></article>
        <article className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Date</p><p className="mt-2 font-heading text-3xl font-semibold">{plan.event.date}</p></article>
        <article className="rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">Concept</p><p className="mt-2 text-lg font-medium">{plan.event.concept}</p></article>
      </section>
      <section className="mt-8">
        <h2 className="font-heading text-3xl font-semibold">Planning milestones</h2>
        <ol className="mt-4 space-y-3">
          {plan.timeline.slice(0, 8).map((task) => (
            <li key={task.id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium">{task.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{task.phase} · {task.ownerRole}</p>
            </li>
          ))}
        </ol>
      </section>
      <p className="mt-8 text-sm text-muted-foreground">AI estimates are illustrative, not quotes. Traditions vary by family.</p>
      <GenerateAiLink href="/#plan-prompt" className="mt-6">Generate your own plan with AI</GenerateAiLink>
    </main>
  );
}
