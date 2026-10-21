import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Timeline & Due Dates — Utsav",
  description: "Reverse-scheduled milestones and ceremony schedules.",
};

export default function TimelinePage() {
  return (
    <PagePlaceholder
      badge="Reverse Schedule Engine"
      title="Milestone Timeline"
      description="Backward-calculated deadlines from Muhurat hour to T-6 months. Pure date math handles priest booking, card distribution, and outfit fittings."
      actionHref="/ceremonies"
      actionLabel="Explore Ceremonies"
    />
  );
}
