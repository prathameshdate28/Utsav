import Link from "next/link";
import { LifeBuoy } from "lucide-react";

export function PanicButton() {
  return (
    <Link
      href="/panic"
      aria-label="Open the Panic Button for help with a plan change"
      className="fixed bottom-4 right-4 z-50 inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/20 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:transition-none max-[420px]:h-12 max-[420px]:w-12 max-[420px]:justify-center max-[420px]:px-0"
    >
      <LifeBuoy className="h-4 w-4" aria-hidden="true" />
      <span className="max-[420px]:sr-only">Need a backup?</span>
    </Link>
  );
}
