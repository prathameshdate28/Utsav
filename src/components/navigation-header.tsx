"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/components/providers/language-provider";
import { Sparkles } from "lucide-react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/saved-plans", label: "Saved Plans" },
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
  const { language, setLanguage, translating, translationError } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between px-4 py-2 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-heading text-xl font-bold tracking-tight text-foreground transition-opacity hover:opacity-85"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Utsav</span>
        </Link>

        <div className="order-2 flex items-center gap-2 pl-2 lg:order-3">
          <label className="sr-only" htmlFor="page-language">Page language</label>
          <select
            id="page-language"
            aria-label="Page language"
            value={language}
            onChange={(event) => {
              const nextLanguage = event.target.value;
              if (nextLanguage === "en" || nextLanguage === "hi" || nextLanguage === "sa") {
                setLanguage(nextLanguage);
              }
            }}
            className="h-9 max-w-28 rounded-lg border border-border bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="sa">संस्कृत</option>
          </select>
          <ThemeToggle />
        </div>

        <nav
          className="order-3 flex w-full items-center gap-1 overflow-x-auto py-2 no-scrollbar text-sm lg:order-2 lg:w-auto lg:py-0"
          aria-label="Main Navigation"
        >
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-[transform,opacity] ${
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
      </div>
      {(translating || translationError) && (
        <p aria-live="polite" className={`container mx-auto px-4 pb-2 text-xs ${translationError ? "text-destructive" : "text-muted-foreground"}`}>
          {translationError || "Translating page with Gemini…"}
        </p>
      )}
    </header>
  );
}
