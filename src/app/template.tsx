"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export default function AppTemplate({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="flex flex-1 flex-col" aria-busy="true">{children}</div>}>
      <TransitionedPage>{children}</TransitionedPage>
    </Suspense>
  );
}

function TransitionedPage({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [videoMode, setVideoMode] = useState(false);
  const transitionEase = [0.22, 1, 0.36, 1] as const;
  /* eslint-disable react-hooks/set-state-in-effect -- Read the user's video-mode preference after hydration. */
  useEffect(() => {
    setVideoMode(localStorage.getItem("utsav-video-mode") === "1");
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
        transition={{
          duration: reducedMotion ? 0 : videoMode ? 0.32 : 0.3,
          ease: transitionEase,
        }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
