"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "relative size-[18px] shrink-0 rounded-[5px] border border-input bg-white shadow-sm transition-colors before:absolute before:-inset-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-task-green-ink data-[state=checked]:bg-task-green-ink data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
          <motion.path
            d="m5 12 4 4L19 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={mounted && !reduce ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = "Checkbox";
