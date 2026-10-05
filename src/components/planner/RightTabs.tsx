"use client";

import { useId } from "react";
import { AnimatedBackground } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export type RightView = "itinerary" | "finances";

const VIEWS: { id: RightView; label: string }[] = [
  { id: "itinerary", label: "Itinerary" },
  { id: "finances", label: "Finances" },
];

/** Switches the right column between the itinerary and finances, keeping
 * the planner at three columns. */
export default function RightTabs({
  view,
  onChange,
}: {
  view: RightView;
  onChange: (view: RightView) => void;
}) {
  const highlightId = useId();
  return (
    <div
      role="tablist"
      aria-label="Right panel"
      className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
    >
      {VIEWS.map((v) => {
        const active = view === v.id;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v.id)}
            className={cn(
              "relative isolate flex h-8 items-center justify-center rounded-md text-sm transition-colors duration-150",
              active ? "font-medium text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <AnimatedBackground
                layoutId={highlightId}
                className="rounded-md bg-white shadow-sm"
              />
            )}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
