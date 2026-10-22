import * as React from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "flex h-10 w-full rounded-xl border border-transparent bg-secondary px-3 py-2 text-sm text-ink transition-colors duration-150 placeholder:text-muted-2 hover:bg-hover-2 focus-visible:border-ring focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/15";

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

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[4.5rem] w-full resize-none rounded-xl border border-transparent bg-secondary px-3 py-2 text-sm text-ink transition-colors duration-150 placeholder:text-muted-2 hover:bg-hover-2 focus-visible:border-ring focus-visible:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-secondary disabled:opacity-60",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
