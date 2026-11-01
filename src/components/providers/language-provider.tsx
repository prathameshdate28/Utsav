"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "hi" | "sa";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  translating: boolean;
  translationError: string;
};

type TranslationTarget = {
  source: string;
  set: (value: string) => void;
  get: () => string;
  remember: (source: string, translated: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "utsav-language";
const TRANSLATABLE_ATTRIBUTES = ["aria-label", "aria-description", "alt", "placeholder", "title", "content"] as const;
const MAX_TRANSLATION_BATCH = 80;

function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "hi" || value === "sa";
}

function hasWords(value: string): boolean {
  return /[\p{L}]/u.test(value);
}

function collectTargets(
  root: Node,
  textTranslations: WeakMap<Text, { source: string; translated: string }>,
  attributeTranslations: WeakMap<Element, Map<string, { source: string; translated: string }>>,
): TranslationTarget[] {
  const targets: TranslationTarget[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = root.nodeType === Node.TEXT_NODE ? root : walker.nextNode();

  while (node) {
    const textNode = node as Text;
    const parent = textNode.parentElement;
    const previous = textTranslations.get(textNode);
    const source = previous && textNode.data === previous.translated ? previous.source : textNode.data;
    if (
      parent
      && !parent.closest("script, style, noscript, textarea, [contenteditable='true'], [data-no-translate]")
      && source.trim()
      && hasWords(source)
    ) {
      targets.push({
        source,
        get: () => textNode.data,
        set: (value) => { textNode.data = value; },
        remember: (original, translated) => textTranslations.set(textNode, { source: original, translated }),
      });
    }
    node = walker.nextNode();
  }

  const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
  for (const element of elements) {
    if (element.closest("script, style, noscript, textarea, [contenteditable='true'], [data-no-translate]")) continue;
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      if (
        attribute === "content"
        && (element.tagName !== "META" || !/description/i.test(`${element.getAttribute("name") ?? ""} ${element.getAttribute("property") ?? ""}`))
      ) continue;
      const current = element.getAttribute(attribute);
      const previous = attributeTranslations.get(element)?.get(attribute);
      const source = previous && current === previous.translated ? previous.source : current;
      if (!source?.trim() || !hasWords(source)) continue;
      targets.push({
        source,
        get: () => element.getAttribute(attribute) ?? "",
        set: (value) => element.setAttribute(attribute, value),
        remember: (original, translated) => {
          const translations = attributeTranslations.get(element) ?? new Map();
          translations.set(attribute, { source: original, translated });
          attributeTranslations.set(element, translations);
        },
      });
    }
  }
  return targets;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");
  const textTranslations = useRef(new WeakMap<Text, { source: string; translated: string }>());
  const attributeTranslations = useRef(new WeakMap<Element, Map<string, { source: string; translated: string }>>());
  const currentLanguage = useRef<Language>("en");
  const requestId = useRef(0);
  const pendingRoots = useRef(new Set<Node>());
  const flushTimer = useRef<number | null>(null);
  const activeRequests = useRef(0);

  const restore = useCallback((root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const textNode = node as Text;
      const previous = textTranslations.current.get(textNode);
      if (previous && textNode.data === previous.translated) textNode.data = previous.source;
      node = walker.nextNode();
    }

    const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [];
    for (const element of elements) {
      const translations = attributeTranslations.current.get(element);
      if (!translations) continue;
      for (const [attribute, previous] of translations) {
        if (element.getAttribute(attribute) === previous.translated) {
          element.setAttribute(attribute, previous.source);
        }
      }
    }
  }, []);

  const translate = useCallback(async (roots: Node[], id: number) => {
    if (currentLanguage.current === "en") {
      for (const root of roots) restore(root);
      return;
    }

    const targets: TranslationTarget[] = [];
    for (const root of roots) {
      for (const target of collectTargets(root, textTranslations.current, attributeTranslations.current)) {
        if (target.source === target.get()) targets.push(target);
      }
    }
    if (targets.length === 0) return;

    activeRequests.current += 1;
    setTranslating(true);
    try {
      for (let start = 0; start < targets.length; start += MAX_TRANSLATION_BATCH) {
        if (id !== requestId.current) return;
        const batch = targets.slice(start, start + MAX_TRANSLATION_BATCH);
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: currentLanguage.current,
            texts: batch.map((target) => target.source),
          }),
        });
        const result = await response.json() as { translations?: string[]; error?: string };
        if (!response.ok || !result.translations || result.translations.length !== batch.length) {
          throw new Error("The page could not be translated.");
        }
        if (id !== requestId.current) return;

        batch.forEach((target, index) => {
          const translated = result.translations![index];
          target.set(translated);
          target.remember(target.source, translated);
        });
      }
      setTranslationError("");
    } catch {
      if (id === requestId.current) {
        setTranslationError("We couldn't translate the page right now. Please try again later.");
      }
    } finally {
      activeRequests.current = Math.max(0, activeRequests.current - 1);
      if (activeRequests.current === 0) setTranslating(false);
    }
  }, [restore]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    currentLanguage.current = nextLanguage;
    setLanguageState(nextLanguage);
    setTranslationError("");
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- Restore browser-only language preference after hydration. */
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) setLanguage(saved);
  }, [setLanguage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    currentLanguage.current = language;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    const id = ++requestId.current;
    restore(document.head);
    restore(document.body);
    void translate([document.head, document.body], id);
  }, [language, restore, translate]);

  useEffect(() => {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) pendingRoots.current.add(node);
        } else if (record.type === "characterData" && record.target.parentNode) {
          const previous = textTranslations.current.get(record.target as Text);
          if (previous && [previous.source, previous.translated].includes((record.target as Text).data)) continue;
          pendingRoots.current.add(record.target.parentNode);
        } else if (record.type === "attributes" && record.target instanceof Element) {
          const previous = attributeTranslations.current.get(record.target)?.get(record.attributeName ?? "");
          const value = record.target.getAttribute(record.attributeName ?? "") ?? "";
          if (previous && [previous.source, previous.translated].includes(value)) continue;
          pendingRoots.current.add(record.target);
        }
      }
      if (pendingRoots.current.size === 0 || flushTimer.current !== null) return;
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = null;
        const roots = [...pendingRoots.current];
        pendingRoots.current.clear();
        void translate(roots, requestId.current);
      }, 100);
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
    return () => {
      observer.disconnect();
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    };
  }, [translate]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translating, translationError }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider.");
  return context;
}
