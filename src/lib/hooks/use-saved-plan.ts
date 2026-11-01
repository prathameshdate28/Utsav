"use client";

import { useCallback, useEffect, useState } from "react";
import { blueprintSchema, type Blueprint } from "../schemas/blueprint";
import cachedJaipurPlan from "../../../data/demo/jaipur-wedding.json";
import { loadActivePlan, saveActivePlan } from "@/lib/storage/plan-library";

export function useSavedPlan() {
  const [plan, setPlan] = useState<Blueprint | null>(null);
  const [error, setError] = useState("");

  /* eslint-disable react-hooks/set-state-in-effect -- Load the browser-only plan once after hydration. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("video") === "1") {
      setPlan(blueprintSchema.parse(cachedJaipurPlan));
      return;
    }
    try {
      setPlan(loadActivePlan());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The saved plan could not be loaded.");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const savePlan = useCallback((next: Blueprint) => {
    try {
      const saved = saveActivePlan(next);
      setPlan(saved.plan);
      setError("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The plan could not be saved.");
    }
  }, []);

  return { plan, setPlan: savePlan, error };
}
