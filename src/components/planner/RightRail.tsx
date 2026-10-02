"use client";

import { Button } from "@/components/ui/button";

export default function RightRail({
  openCount,
  onOpenTasks,
}: {
  openCount: number;
  onOpenTasks: () => void;
}) {
  return (
    <div className="box-border flex flex-col items-center gap-2 overflow-hidden rounded-card border border-line bg-white py-3.5">
      <Button
        variant="secondary"
        size="icon"
        onClick={onOpenTasks}
        aria-label={`Open tasks, ${openCount} open`}
        title="Tasks"
      >
        <span aria-hidden="true" className="block size-2.5 rounded-full bg-task-green" />
      </Button>
      <span aria-hidden="true" className="text-xs tabular-nums text-muted">
        {openCount}
      </span>
    </div>
  );
}
