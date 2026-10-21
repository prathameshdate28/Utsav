import { PagePlaceholder } from "@/components/page-placeholder";

export const metadata = {
  title: "Panic Button — Utsav",
  description: "Emergency contingency playbooks and vendor delay backups.",
};

export default function PanicPage() {
  return (
    <PagePlaceholder
      badge="Emergency Co-Pilot"
      title="The Panic Button"
      description="Instant crisis management: heavy sudden rain contingencies, generator failures, delay announcements, and emergency vendor substitutes."
      actionHref="/dashboard"
      actionLabel="Return to Safety Cockpit"
    />
  );
}
