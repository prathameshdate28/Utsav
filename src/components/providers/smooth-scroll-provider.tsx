"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

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
    // Check if the user prefers reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const setupLenis = () => {
      // If reduced motion is requested, do not initialize smooth scrolling
      if (mediaQuery.matches) {
        if (lenisRef.current) {
          lenisRef.current.destroy();
          lenisRef.current = null;
        }
        return;
      }

      // Initialize Lenis for luxurious celebratory inertia scrolling
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
      });

      lenisRef.current = lenis;

      let animationFrameId: number;
      const raf = (time: number) => {
        lenis.raf(time);
        animationFrameId = requestAnimationFrame(raf);
      };

      animationFrameId = requestAnimationFrame(raf);

      return () => {
        cancelAnimationFrame(animationFrameId);
        lenis.destroy();
        lenisRef.current = null;
      };
    };

    const cleanup = setupLenis();

    // Listen for changes in OS reduced-motion preference
    const handlePreferenceChange = () => {
      if (cleanup) cleanup();
      setupLenis();
    };

    mediaQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      mediaQuery.removeEventListener("change", handlePreferenceChange);
      if (cleanup) cleanup();
    };
  }, []);

  return <>{children}</>;
}
