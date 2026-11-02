"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StopIcon } from "@/components/planner/StopIcon";
import { finishOnboarding } from "@/actions/onboarding";
import { stopColor } from "@/lib/theme";
import type { CityIconKey } from "@/lib/cityIcons";
import { firstName } from "@/lib/people";
import { cn } from "@/lib/utils";

const ICONS: [CityIconKey, string][] = [
  ["sagradaFamilia", "clay"],
  ["eiffel", "lavender"],
  ["canalHouse", "sage"],
  ["littleMermaid", "khaki"],
];

/** The welcome walkthrough a new account sees once: what stops, the calendar
 * and shared money are, then into the sample trip or their own. */
export default function Onboarding({
  userName,
  isMobile,
  pals,
  ownTeamId,
  onDone,
}: {
  userName: string;
  isMobile: boolean;
  /** The sample trip's pretend travel buddies, if it's the one open. */
  pals: string[];
  /** The user's own trip, when they're looking at the sample. */
  ownTeamId: string | null;
  onDone: () => void;
}) {
  const reduce = !!useReducedMotion();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [choice, setChoice] = useState<"own" | "sample" | null>(null);
  const names = pals.map(firstName);
  const palList =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : (names[0] ?? "");

  function finish(goTo: string | null, which: "own" | "sample") {
    setChoice(which);
    startTransition(async () => {
      await finishOnboarding(goTo);
      onDone();
    });
  }

  const steps = [
    {
      title: `Welcome, ${firstName(userName)}`,
      body: "Plan a trip together: where you'll stay, what you'll do each day, and who paid for what.",
      art: (
        <div className="flex items-center justify-center gap-3">
          {ICONS.map(([icon, color]) => (
            <span
              key={icon}
              className="flex size-14 items-center justify-center rounded-2xl bg-secondary"
              style={{ color: stopColor(color).base }}
            >
              <StopIcon icon={icon} className="size-8" />
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Every city is a stop",
      body: "Each stop has its dates, stays, transport and a day-by-day plan. Pick one to open its itinerary.",
      art: (
        <ul className="mx-auto w-full max-w-64 space-y-1">
          {[
            ["Paris", "eiffel", "lavender", "3 nights"],
            ["Amsterdam", "canalHouse", "sage", "4 nights"],
          ].map(([label, icon, color, nights], i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5",
                i === 0 && "bg-secondary",
              )}
            >
              <span style={{ color: stopColor(color).base }}>
                <StopIcon icon={icon as CityIconKey} className="size-6" />
              </span>
              <span className="flex-1 text-left text-sm font-medium text-ink">{label}</span>
              <span className="text-xs text-muted-2">{nights}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "The whole trip at a glance",
      body: "The calendar shows every stop. Open one to zoom in on its days, and tap a plan to see the rest of that day.",
      art: (
        <div className="relative mx-auto grid w-full max-w-72 grid-cols-7 gap-1">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} className="h-9 rounded-md bg-secondary" />
          ))}
          {/* Two stops as calendar bars across the days. */}
          <span
            className="absolute left-[15%] top-[1.6rem] h-3.5 w-[55%] rounded-full"
            style={{ background: stopColor("lavender").base }}
          />
          <span
            className="absolute left-[43%] top-[4.1rem] h-3.5 w-[56%] rounded-full"
            style={{ background: stopColor("sage").base }}
          />
        </div>
      ),
    },
    {
      title: "Shared costs, sorted",
      body: "Log what things cost and who paid. Finances works out who owes who, booking by booking.",
      art: (
        <div className="mx-auto w-full max-w-64 space-y-2">
          {(names.length ? names.slice(0, 2) : ["Sofía", "Kenji"]).map((n, i) => (
            <div key={n} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2">
              <Avatar name={n} size="sm" />
              <span className="flex-1 text-left text-sm text-ink">
                {n} <span className="text-muted-2">pays you</span>
              </span>
              <span className="text-sm font-medium tabular-nums text-task-green-ink">
                €{i === 0 ? "48" : "112"}
              </span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: ownTeamId ? "Try it, then make it yours" : "You're all set",
      body: ownTeamId
        ? `We set up a sample trip with ${palList || "a few pretend friends"}, pretend travel buddies, so you can try everything. Your own trip is ready whenever you are.`
        : "Your trip is ready. Add your first stop to get going.",
      art: (
        <div className="flex items-center justify-center -space-x-1.5">
          {[firstName(userName), ...names].map((n) => (
            <Avatar key={n} name={n} size="lg" className="ring-[3px] ring-white" />
          ))}
        </div>
      ),
    },
  ];
  const last = step === steps.length - 1;
  const current = steps[step];

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && finish(null, "sample")}>
      <DialogContent placement={isMobile ? "bottom" : "center"}>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className={cn("-ml-2 size-9", step === 0 && "invisible")}
            onClick={() => setStep((s) => s - 1)}
            aria-label="Back"
          >
            <ArrowLeft />
          </Button>
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-5 bg-ink" : "w-1.5 bg-stone-300",
                )}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn("-mr-2 text-muted-2", last && "invisible")}
            onClick={() => finish(null, "sample")}
            disabled={pending}
          >
            Skip
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pt-6 text-center"
          >
            <div className="flex min-h-32 items-center justify-center">{current.art}</div>
            <DialogTitle className="mt-6 text-2xl font-semibold">{current.title}</DialogTitle>
            <DialogDescription className="mx-auto mt-2 max-w-sm text-pretty text-sm leading-relaxed text-muted">
              {current.body}
            </DialogDescription>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex flex-col gap-2">
          {!last ? (
            <Button size="lg" onClick={() => setStep((s) => s + 1)}>
              Next
            </Button>
          ) : ownTeamId ? (
            <>
              <Button size="lg" disabled={pending} onClick={() => finish(ownTeamId, "own")}>
                {pending && choice === "own" && <Loader2 className="animate-spin" />}
                Start my own trip
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={pending}
                onClick={() => finish(null, "sample")}
              >
                {pending && choice === "sample" && <Loader2 className="animate-spin" />}
                Explore the sample trip
              </Button>
            </>
          ) : (
            <Button size="lg" disabled={pending} onClick={() => finish(null, "sample")}>
              {pending && <Loader2 className="animate-spin" />}
              Get started
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
