import { Sparkles } from "lucide-react";

/**
 * Festive header badge with Devanagari typography and amber aura.
 * Communicates authentic Indian celebration identity.
 */
export function HeroBadge() {
  return (
    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-medium border border-primary/30 bg-primary/10 text-primary shadow-sm backdrop-blur-sm">
      <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
      <span className="font-serif tracking-widest text-[11px] uppercase opacity-90">
        उत्सव
      </span>
      <span className="text-muted-foreground/60">|</span>
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span>AI Event Co-Planner for India</span>
    </div>
  );
}
