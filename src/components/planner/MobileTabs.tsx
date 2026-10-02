"use client";

import { useId } from "react";
import {
  AnimatedBackground,
  AnimatedNumber,
} from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import type { MobileTab } from "@/components/Planner";

const TABS: { id: MobileTab; label: string; dot: string }[] = [
  { id: "links", label: "Trips", dot: "bg-accent" },
  { id: "calendar", label: "Calendar", dot: "bg-accent" },
  { id: "tasks", label: "Tasks", dot: "bg-task-green" },
];

export default function MobileTabs({
  active,
  openCount,
  onChange,
}: {
  active: MobileTab;
  openCount: number;
  onChange: (tab: MobileTab) => void;
}) {
  const highlightId = useId();
  return (
    <nav
      aria-label="Planner views"
      className="grid flex-none grid-cols-3 gap-1.5 rounded-card border border-line bg-white p-1.5"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            className={cn(
              "ui-button relative isolate flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors duration-150",
              isActive ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {isActive && (
              <AnimatedBackground
                layoutId={highlightId}
                className="bg-secondary shadow-sm"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "block size-2 flex-none rounded-full",
                isActive ? tab.dot : "bg-input",
              )}
            />
            <span>{tab.label}</span>
            {tab.id === "tasks" && (
              <AnimatedNumber value={openCount} className="text-muted" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
