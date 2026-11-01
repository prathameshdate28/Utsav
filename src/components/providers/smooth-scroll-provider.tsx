"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { BackToTop } from "@/components/back-to-top";

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

/**
 * Global smooth-scroll wrapper using Lenis.
 * Disabled completely if the user has enabled prefers-reduced-motion in their OS,
 * ensuring accessibility and vestibular comfort.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cleanupLenis: (() => void) | undefined;

    const setupLenis = () => {
      cleanupLenis?.();
      cleanupLenis = undefined;

      if (mediaQuery.matches) {
        return;
      }

      const lenis = new Lenis({
        duration: 0.8,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        anchors: true,
      });

      lenisRef.current = lenis;

      let animationFrameId = 0;
      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameId = requestAnimationFrame(raf);
      };

      animationFrameId = requestAnimationFrame(raf);

      cleanupLenis = () => {
        cancelAnimationFrame(animationFrameId);
        lenis.destroy();
        if (lenisRef.current === lenis) lenisRef.current = null;
      };
    };

    setupLenis();
    const handlePreferenceChange = () => setupLenis();
    mediaQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handlePreferenceChange);
      cleanupLenis?.();
    };
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
      return;
    }
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { duration: 1.2 });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      {children}
      <BackToTop onScrollToTop={scrollToTop} />
    </>
  );
}
