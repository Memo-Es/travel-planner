import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "secondary",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "secondary" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium tabular-nums",
        variant === "success"
          ? "bg-task-green-soft text-task-green-ink"
          : "bg-secondary text-muted",
        className,
      )}
      {...props}
    />
  );
}
