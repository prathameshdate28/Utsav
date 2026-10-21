import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Budget & What-If — Utsav",
  description: "Deterministic Indian event budget engine with what-if scenario levers.",
};

export default function BudgetPage() {
  return (
    <PagePlaceholder
      badge="Deterministic Maths Engine"
      title="Budget & What-If Planner"
      description="Interactive category breakdowns (Catering, Mandap/Decor, Venue, Attire) with live what-if sliders. All calculations run strictly in pure TypeScript functions."
      actionHref="/timeline"
      actionLabel="View Event Timeline"
    />
  );
}
