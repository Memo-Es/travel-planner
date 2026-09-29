"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const TASK_GREEN = "oklch(0.7 0.15 155)";

export default function RightRail({
  openCount,
  onOpenTasks,
  onOpenBalance,
}: {
  openCount: number;
  onOpenTasks: () => void;
  onOpenBalance: () => void;
}) {
  return (
    <div className="bg-white rounded-card border border-line py-3.5 flex flex-col items-center gap-2 box-border overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenTasks}
        aria-label="Tasks"
        title="Tasks"
        className="size-9 rounded-[9px] border-0 bg-hover cursor-pointer flex items-center justify-center hover:bg-hover-2"
      >
        <span
          className="w-[11px] h-[11px] rounded-full block"
          style={{ background: TASK_GREEN }}
        />
      </Button>
      <div className="text-[12px] text-muted-2 [font-variant-numeric:tabular-nums]">
        {openCount}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenBalance}
        aria-label="Balance"
        title="Balance"
        className="mt-2 size-9 rounded-[9px] text-accent-ink"
      >
        <Wallet size={16} />
      </Button>
    </div>
  );
}
