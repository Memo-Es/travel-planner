"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type MutableRefObject,
} from "react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

// Motion Primitives-inspired patterns, tailored to the planner's density and accessibility.
export const settle = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.8,
};
export const fade = { duration: 0.18, ease: "easeOut" as const };

export function AnimatedBackground({
  layoutId,
  className,
}: {
  layoutId: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      layoutId={reduce ? undefined : layoutId}
      initial={false}
      transition={reduce ? { duration: 0 } : settle}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 rounded-[inherit]",
        className,
      )}
    />
  );
}

const integer = (value: number) => String(Math.round(value));

export function AnimatedNumber({
  value,
  format = integer,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 220, damping: 30 });
  const display = useTransform(spring, (current) => format(current));
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return (
    <span className={cn("inline-block tabular-nums", className)}>
      <span className="sr-only">{format(value)}</span>
      <motion.span aria-hidden="true">{display}</motion.span>
    </span>
  );
}

function DisclosureBody({
  children,
  reduce,
  region,
}: {
  children: ReactNode;
  reduce: boolean;
  region: MutableRefObject<HTMLDivElement | null>;
}) {
  const present = useIsPresent();
  return (
    <motion.div
      ref={(node) => {
        region.current = node;
        if (node) node.inert = !present;
      }}
      aria-hidden={!present || undefined}
      // Compositor-only: fade and nudge rather than animating height.
      initial={{ opacity: 0, y: reduce ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.12 } }}
      transition={reduce ? { duration: 0 } : fade}
      className="-mx-1"
    >
      <div className="p-1">{children}</div>
    </motion.div>
  );
}

export function Disclosure({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const previous = useRef(open);
  const opener = useRef<HTMLElement | null>(null);
  const region = useRef<HTMLDivElement>(null);
  // Capture before a newly mounted field takes autofocus.
  if (open && !previous.current && typeof document !== "undefined")
    opener.current = document.activeElement as HTMLElement;
  previous.current = open;
  useEffect(() => {
    if (
      !open &&
      region.current?.contains(document.activeElement) &&
      opener.current?.isConnected
    )
      opener.current.focus();
  }, [open]);
  return (
    <AnimatePresence initial={false}>
      {open && (
        <DisclosureBody key="body" region={region} reduce={!!reduce}>
          {children}
        </DisclosureBody>
      )}
    </AnimatePresence>
  );
}

export function TransitionText({
  children,
  value,
  className,
}: {
  children: ReactNode;
  value: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("relative inline-grid", className)}>
      <span className="sr-only">{children}</span>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          aria-hidden="true"
          key={value}
          initial={{
            opacity: 0,
            y: reduce ? 0 : 8,
            filter: reduce ? "none" : "blur(3px)",
          }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{
            opacity: 0,
            y: reduce ? 0 : -6,
            filter: reduce ? "none" : "blur(3px)",
          }}
          transition={reduce ? { duration: 0 } : fade}
          className="inline-block"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
