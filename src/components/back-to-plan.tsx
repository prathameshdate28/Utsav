import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackToPlan() {
  return (
    <Link
      href="/dashboard"
      className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to plan
    </Link>
  );
}
