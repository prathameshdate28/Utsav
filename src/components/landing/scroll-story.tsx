"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import {
  ArrowUp,
  Building2,
  CalendarDays,
  ClipboardList,
  CloudRain,
  IndianRupee,
  Mail,
  MessageCircle,
  Mic2,
  PartyPopper,
  Sparkles,
  UsersRound,
} from "lucide-react";

const PLANNING_CARDS = [
  { title: "Family group chat", detail: "Everyone has a different detail.", Icon: MessageCircle, color: "#0F7C78" },
  { title: "Vendor spreadsheet", detail: "Quotes scattered across tabs.", Icon: ClipboardList, color: "#6C63C7" },
  { title: "Voice notes", detail: "Good ideas get buried in the thread.", Icon: Mic2, color: "#E35D7E" },
  { title: "Budget scraps", detail: "The numbers are hard to keep together.", Icon: IndianRupee, color: "#B76500" },
];

const MILESTONES = [
  { phase: "6 months", title: "Choose your venue", detail: "Set the scene for your celebration.", Icon: Building2, color: "#0F7C78" },
  { phase: "3 months", title: "Confirm the guest list", detail: "Bring your favorite people together.", Icon: UsersRound, color: "#6C63C7" },
  { phase: "1 month", title: "Send the invitations", detail: "Make the date official.", Icon: Mail, color: "#E35D7E" },
  { phase: "Day-of", title: "Celebrate together", detail: "Be present for the moments.", Icon: PartyPopper, color: "#B76500" },
];

const MOODBOARD_CARDS = [
  { label: "Entrance", src: "/demo/jaipur-wedding/entrance.svg", alt: "An arched celebration entrance" },
  { label: "Stage", src: "/demo/jaipur-wedding/stage.svg", alt: "A decorated celebration stage" },
  { label: "Tables", src: "/demo/jaipur-wedding/tables.svg", alt: "A festive table setting with flowers" },
  { label: "Lighting", src: "/demo/jaipur-wedding/lighting.svg", alt: "Warm hanging lights at a celebration" },
  { label: "Florals", src: "/demo/jaipur-wedding/florals.svg", alt: "Colorful floral decorations" },
  { label: "The moment", src: "/demo/jaipur-wedding/signature-moment.svg", alt: "A signature celebration moment" },
];

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;
const SCROLL_SPRING = { stiffness: 120, damping: 30, mass: 0.25 };

export function ScrollStory() {
  const reducedMotion = useReducedMotion();
  const painRef = useRef<HTMLElement | null>(null);
  const sentenceRef = useRef<HTMLElement | null>(null);
  const budgetRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLElement | null>(null);
  const moodRef = useRef<HTMLElement | null>(null);
  const panicRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress: painProgress } = useScroll({ target: painRef, offset: ["start end", "end start"] });
  const { scrollYProgress: sentenceProgress } = useScroll({ target: sentenceRef, offset: ["start end", "end start"] });
  const { scrollYProgress: budgetProgress } = useScroll({ target: budgetRef, offset: ["start end", "end start"] });
  const { scrollYProgress: timelineProgress } = useScroll({ target: timelineRef, offset: ["start end", "end start"] });
  const { scrollYProgress: moodProgress } = useScroll({ target: moodRef, offset: ["start end", "end start"] });
  const { scrollYProgress: panicProgress } = useScroll({ target: panicRef, offset: ["start end", "end start"] });
  const smoothPainProgress = useSpring(painProgress, SCROLL_SPRING);
  const smoothSentenceProgress = useSpring(sentenceProgress, SCROLL_SPRING);
  const smoothBudgetProgress = useSpring(budgetProgress, SCROLL_SPRING);
  const smoothTimelineProgress = useSpring(timelineProgress, SCROLL_SPRING);
  const smoothMoodProgress = useSpring(moodProgress, SCROLL_SPRING);
  const smoothPanicProgress = useSpring(panicProgress, SCROLL_SPRING);
  const ringRotation = useTransform(smoothBudgetProgress, [0, 1], [0, 240]);
  const timelineScale = useTransform(smoothTimelineProgress, [0.2, 0.8], [0, 1]);
  const moodY = useTransform(smoothMoodProgress, [0, 1], [14, -14]);
  const painY = useTransform(smoothPainProgress, [0.15, 0.75], [0, -20]);
  const sentenceOpacity = useTransform(smoothSentenceProgress, [0.2, 0.5, 0.8], [0.2, 1, 1]);
  const panicY = useTransform(smoothPanicProgress, [0.1, 0.7], [16, 0]);

  return (
    <div className="overflow-clip">
      <section ref={painRef} className="relative min-h-[50vh] px-4 py-5 sm:px-8 sm:py-6">
        <div className="sticky top-24 mx-auto flex min-h-[38vh] max-w-5xl flex-col items-center justify-center">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reducedMotion ? 0 : 0.65, ease: SMOOTH_EASE }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-primary"
          >
            The planning pile-up
          </motion.p>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : 0.08, ease: SMOOTH_EASE }}
            className="mt-4 text-center font-heading text-3xl font-semibold sm:text-5xl"
          >
            One celebration. A hundred scattered details.
          </motion.h2>
          <motion.div
            style={reducedMotion ? undefined : { y: painY }}
            className="relative mt-10 grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {PLANNING_CARDS.map(({ title, detail, Icon, color }, index) => (
              <motion.article
                key={title}
                initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.97, rotate: (index - 2) * 2 }}
                whileInView={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : index * 0.08, ease: SMOOTH_EASE }}
                whileHover={reducedMotion ? undefined : { y: -4, scale: 1.015, rotate: 0 }}
                whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
              >
                <div
                  className="flex h-24 items-center justify-center"
                  style={{ backgroundImage: `linear-gradient(135deg, ${color}32, ${color}12, hsl(var(--card)))` }}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card/90 shadow-sm" style={{ color }}>
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold leading-snug">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
          <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 px-6 py-5 text-center font-semibold">
            One clear plan, together.
          </div>
        </div>
      </section>

      <section ref={sentenceRef} className="relative min-h-[42vh] px-4 py-4">
        <div className="sticky top-24 mx-auto flex min-h-[32vh] max-w-4xl items-center justify-center text-center">
          <motion.p
            style={reducedMotion ? undefined : { opacity: sentenceOpacity }}
            initial={reducedMotion ? false : { y: 18, scale: 0.985 }}
            whileInView={{ y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.65 }}
            transition={{ duration: reducedMotion ? 0 : 0.82, ease: SMOOTH_EASE }}
            className="font-heading text-4xl font-medium leading-tight sm:text-6xl"
          >
            Celebrate the moment.{" "}
            <span className="text-primary">We’ll hold the details.</span>
          </motion.p>
        </div>
      </section>

      <section ref={budgetRef} className="relative min-h-[48vh] px-4 py-5 sm:px-8 sm:py-6">
        <div className="sticky top-24 mx-auto grid min-h-[36vh] max-w-4xl items-start gap-6 md:grid-cols-2">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reducedMotion ? 0 : 0.68, ease: SMOOTH_EASE }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Budget, made legible</p>
            <h2 className="mt-4 font-heading text-3xl font-semibold sm:text-5xl">Know where every rupee goes.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">Transparent estimates, clear trade-offs, and calm what-if planning.</p>
          </motion.div>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reducedMotion ? 0 : 0.82, ease: SMOOTH_EASE }}
            whileHover={reducedMotion ? undefined : { scale: 1.015 }}
            className="mx-auto flex h-64 w-64 self-center items-center justify-center rounded-full border-[26px] border-primary/20 border-t-primary border-r-accent shadow-xl sm:h-80 sm:w-80"
            style={reducedMotion ? { borderBottomColor: "#0F7C78" } : { rotate: ringRotation, borderBottomColor: "#0F7C78" }}
            aria-label="Illustrative budget ring"
          >
            <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
              <IndianRupee className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-heading text-3xl font-bold">₹25L</span>
              <span className="text-xs text-muted-foreground">AI estimate</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section ref={timelineRef} className="relative min-h-[50vh] px-4 py-5 sm:px-8 sm:py-6">
        <div className="sticky top-24 mx-auto max-w-4xl">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reducedMotion ? 0 : 0.62, ease: SMOOTH_EASE }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-primary"
          >
            Milestones in motion
          </motion.p>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : 0.08, ease: SMOOTH_EASE }}
            className="mt-4 font-heading text-3xl font-semibold sm:text-5xl"
          >
            A timeline that meets you where you are.
          </motion.h2>
          <div className="relative mt-10 space-y-6 pl-10">
            <motion.div style={reducedMotion ? undefined : { scaleY: timelineScale }} className="absolute bottom-4 left-3 top-2 w-0.5 origin-top bg-primary" />
            {MILESTONES.map(({ phase, title, detail, Icon, color }) => (
              <motion.article
                key={title}
                initial={reducedMotion ? false : { opacity: 0, x: 18, scale: 0.985 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reducedMotion ? 0 : 0.68, delay: reducedMotion ? 0 : MILESTONES.findIndex((milestone) => milestone.title === title) * 0.08, ease: SMOOTH_EASE }}
                whileHover={reducedMotion ? undefined : { x: 4, scale: 1.01 }}
                className="relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm"
              >
                <span className="absolute -left-[2.1rem] top-5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}20` }}>
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">{phase}</span>
                  <h3 className="mt-1 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section ref={moodRef} className="relative min-h-[50vh] px-4 py-5 sm:px-8 sm:py-6">
        <div className="sticky top-24 mx-auto max-w-5xl">
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reducedMotion ? 0 : 0.65, ease: SMOOTH_EASE }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-primary"
          >
            A feeling, made visible
          </motion.p>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : 0.08, ease: SMOOTH_EASE }}
            className="mt-4 font-heading text-3xl font-semibold sm:text-5xl"
          >
            Find the look that feels like you.
          </motion.h2>
          <motion.div style={reducedMotion ? undefined : { y: moodY }} className="mt-10 grid grid-cols-2 auto-rows-fr gap-3 md:grid-cols-3">
            {MOODBOARD_CARDS.map((tile, index) => (
              <motion.article
                key={tile.label}
                initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.975 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: reducedMotion ? 0 : 0.72, delay: reducedMotion ? 0 : index * 0.07, ease: SMOOTH_EASE }}
                whileHover={reducedMotion ? undefined : { y: -4, scale: 1.015, rotate: index % 2 === 0 ? 0.2 : -0.2 }}
                className="group h-full overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-md"
              >
                <div className="relative aspect-[5/3] overflow-hidden">
                  <Image src={tile.src} alt={tile.alt} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none" />
                </div>
                <h3 className="px-4 py-3 text-sm font-semibold">{tile.label}</h3>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section ref={panicRef} className="relative min-h-[46vh] px-4 py-5">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.45 }}
          transition={{ duration: reducedMotion ? 0 : 0.76, ease: SMOOTH_EASE }}
          style={reducedMotion ? undefined : { y: panicY }}
          className="sticky top-24 mx-auto flex min-h-[38vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-primary/25 bg-primary/5 p-6 text-center"
        >
          <CloudRain className="h-10 w-10 text-primary" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">For the unexpected</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold sm:text-5xl">A calm next step, when plans change.</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">Rain in the forecast? A vendor cancels? Keep a short list of practical options close by.</p>
          <div className="mt-6 rounded-full bg-rose-700 px-5 py-3 font-semibold text-white shadow-lg">Panic Button · Help me adjust</div>
        </motion.div>
      </section>

      <section className="min-h-[34vh] bg-foreground px-4 py-8 text-center text-background">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reducedMotion ? 0 : 0.76, ease: SMOOTH_EASE }}
          className="mx-auto flex max-w-3xl flex-col items-center"
        >
          <motion.span
            animate={reducedMotion ? undefined : { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 2, ease: SMOOTH_EASE }}
          >
            <Sparkles className="h-8 w-8 text-accent" aria-hidden="true" />
          </motion.span>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Your celebration starts here</p>
          <h2 className="mt-4 font-heading text-4xl font-semibold sm:text-6xl">Make room for the moments.</h2>
          <motion.a
            href="#homepage-hero"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("event-prompt")?.focus({ preventScroll: true });
            }}
            whileHover={reducedMotion ? undefined : { y: -3, scale: 1.015 }}
            whileTap={reducedMotion ? undefined : { scale: 0.99 }}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-lg transition-[transform,opacity] duration-300 hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background motion-reduce:transition-none"
          >
            Start planning <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </motion.a>
          <a
            href="#homepage-hero"
            onClick={(event) => event.preventDefault()}
            aria-label="Back to top"
            className="mt-8 inline-flex h-11 w-11 items-center justify-center rounded-full border border-accent/60 text-accent transition-colors hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background motion-reduce:transition-none"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </a>
        </motion.div>
      </section>
    </div>
  );
}
