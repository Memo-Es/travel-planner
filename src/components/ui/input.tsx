import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "flex h-10 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors duration-150 placeholder:text-muted-2 hover:border-stone-400 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/15";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(fieldClass, className)}
    {...props}
  />
));
Input.displayName = "Input";

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldClass, "cursor-pointer", className)}
    {...props}
  />
));
NativeSelect.displayName = "NativeSelect";
