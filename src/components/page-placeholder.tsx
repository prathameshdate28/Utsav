import Link from "next/link";
import { Sparkles, ArrowRight, ShieldAlert } from "lucide-react";

interface PagePlaceholderProps {
  badge: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}

/**
 * Reusable placeholder view for module pages.
 * Displays Marigold Noir aesthetic tokens, Fraunces typography, and ethics disclaimers.
 */
export function PagePlaceholder({
  badge,
  title,
  description,
  actionHref = "/dashboard",
  actionLabel = "Back to Dashboard",
}: PagePlaceholderProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/25">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{badge}</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
          {description}
        </p>

        <div className="rounded-xl border border-border/80 bg-card/60 p-4 text-xs text-muted-foreground text-left flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground">Policy Guardrail:</strong> All
            pricing figures are estimated prices. All service partners are demo
            vendors. Cultural traditions presented are commonly practised;
            traditions vary by family.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:opacity-90 transition-opacity"
          >
            <span>{actionLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
