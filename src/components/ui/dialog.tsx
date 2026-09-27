"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, useIsPresent, useReducedMotion } from "motion/react";
import { fade } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export function Dialog(
  props: React.ComponentProps<typeof DialogPrimitive.Root>,
) {
  const present = useIsPresent();
  return (
    <DialogPrimitive.Root
      {...props}
      open={props.open === undefined ? undefined : props.open && present}
    />
  );
}
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold tracking-tight text-ink", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm leading-relaxed text-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    placement?: "center" | "right" | "bottom";
  }
>(
  (
    { className, children, placement = "center", onCloseAutoFocus, ...props },
    ref,
  ) => {
    const reduce = useReducedMotion();
    const present = useIsPresent();
    const offset =
      placement === "right"
        ? { x: 28, y: 0 }
        : { x: 0, y: placement === "bottom" ? 32 : 8 };
    const hidden = {
      opacity: 0,
      x: reduce ? 0 : offset.x,
      y: reduce ? 0 : offset.y,
      scale: reduce || placement !== "center" ? 1 : 0.97,
    };
    const returnFocus = React.useRef(
      typeof document === "undefined"
        ? null
        : (document.activeElement as HTMLElement | null),
    );
    return (
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay forceMount asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? { duration: 0 } : fade}
            className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]"
          />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          forceMount
          asChild
          ref={ref}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event);
            if (!event.defaultPrevented) {
              event.preventDefault();
              const target = returnFocus.current;
              if (target?.isConnected && !target.hasAttribute("disabled"))
                target.focus();
              else document.querySelector<HTMLElement>("main button")?.focus();
            }
          }}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden border border-line bg-white p-6 shadow-overlay outline-none",
            placement === "center" &&
              "left-1/2 top-1/2 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md rounded-2xl",
            placement === "right" &&
              "bottom-3 right-3 top-3 w-[min(480px,calc(100%-2rem))] rounded-2xl",
            placement === "bottom" &&
              "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            className,
          )}
          {...props}
        >
          <motion.div
            ref={(node) => {
              if (node) node.inert = !present;
            }}
            initial={hidden}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={hidden}
            transition={
              reduce
                ? { duration: 0 }
                : { ...fade, duration: present ? 0.24 : 0.16 }
            }
            style={
              placement === "center" ? { translate: "-50% -50%" } : undefined
            }
          >
            {children}
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
DialogContent.displayName = "DialogContent";
