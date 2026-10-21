"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sparkles } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/budget", label: "Budget" },
  { href: "/timeline", label: "Timeline" },
  { href: "/vendors", label: "Vendors" },
  { href: "/ideas", label: "Ideas" },
  { href: "/ceremonies", label: "Ceremonies" },
  { href: "/moodboard", label: "Moodboard" },
  { href: "/panic", label: "Panic Button" },
];

/**
 * Global header with celebratory Marigold branding and navigation links.
 * Mobile-first responsive scrollable navigation.
 */
export function NavigationHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Utsav</span>
        </Link>

        {/* Desktop / Tablet Nav */}
        <nav
          className="flex items-center gap-1 overflow-x-auto py-2 no-scrollbar text-sm"
          aria-label="Main Navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 pl-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
