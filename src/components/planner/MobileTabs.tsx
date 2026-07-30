"use client";

import type { MobileTab } from "@/components/Planner";

const ACCENT = "oklch(0.62 0.19 285)";
const TASK_GREEN = "oklch(0.7 0.15 155)";

const TABS: { id: MobileTab; label: (openCount: number) => string; dot: string }[] = [
  { id: "links", label: () => "Trips", dot: ACCENT },
  { id: "calendar", label: () => "Calendar", dot: ACCENT },
  { id: "tasks", label: (n) => `Tasks [${n}]`, dot: TASK_GREEN },
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
  return (
    <nav className="grid grid-cols-3 gap-1.5 bg-white border border-line rounded-2xl p-1.5 flex-none">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center justify-center gap-1.5 min-h-11 border-0 rounded-[10px] cursor-pointer text-[13.5px]"
            style={{
              background: isActive ? "#f4f3f1" : "transparent",
              color: isActive ? "#1c1b19" : "#8d8983",
            }}
          >
            <span
              className="w-2 h-2 rounded-full block flex-none"
              style={{ background: isActive ? tab.dot : "#cdc9c3" }}
            />
            <span>{tab.label(openCount)}</span>
          </button>
        );
      })}
    </nav>
  );
}
