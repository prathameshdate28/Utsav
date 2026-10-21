import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Dashboard — Utsav",
  description: "Central command center for your celebration co-planner.",
};

export default function DashboardPage() {
  return (
    <PagePlaceholder
      badge="Event Command Center"
      title="Celebration Overview"
      description="Track guest RSVP velocity, readiness health scores, budget burn rates, and key milestone alerts all in one unified cockpit."
      actionHref="/budget"
      actionLabel="Inspect Budget"
    />
  );
}
