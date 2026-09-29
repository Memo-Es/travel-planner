"use client";

import { useId } from "react";
import {
  AnimatedBackground,
  AnimatedNumber,
} from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import type { MobileTab } from "@/components/Planner";

const ACCENT = "oklch(0.62 0.19 285)";
const TASK_GREEN = "oklch(0.7 0.15 155)";

const TABS: {
  id: MobileTab;
  label: (openCount: number) => string;
  dot: string;
}[] = [
  { id: "links", label: () => "Trips", dot: ACCENT },
  { id: "calendar", label: () => "Calendar", dot: ACCENT },
  { id: "tasks", label: (n) => `Tasks [${n}]`, dot: TASK_GREEN },
  { id: "balance", label: () => "Balance", dot: ACCENT },
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
      className="grid grid-cols-4 gap-1 bg-white border border-line rounded-2xl p-1.5 flex-none"
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Button
            variant="ghost"
            key={tab.id}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(tab.id)}
            className="relative isolate flex items-center justify-center gap-1.5 min-h-11 border-0 rounded-[10px] cursor-pointer px-1 text-[13px] hover:bg-transparent"
            style={{
              background: "transparent",
              color: isActive ? "#1c1b19" : "#6f6b65",
            }}
          >
            {isActive && (
              <AnimatedBackground
                layoutId={highlightId}
                className="border border-white bg-secondary shadow-sm"
              />
            )}
            <span
              className="w-2 h-2 rounded-full block flex-none"
              style={{ background: isActive ? tab.dot : "#cdc9c3" }}
            />
            <span>
              {tab.id === "tasks" ? (
                <>
                  Tasks{" "}
                  <AnimatedNumber
                    value={openCount}
                    className="ml-1 text-muted"
                  />
                </>
              ) : (
                tab.label(openCount)
              )}
            </span>
          </Button>
        );
      })}
    </nav>
  );
}
