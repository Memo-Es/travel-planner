"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type MutableRefObject,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
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

/** The rule under the selected line tab, sliding to whichever tab is picked. */
export function AnimatedUnderline({
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
        "pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink",
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
  // A fixed-length tween rather than a spring: a spring's exponential tail
  // makes big jumps (MX$70,000 → 0) creep for a second, while this lands in
  // 0.45s whatever the distance, together with the accordion motion.
  const current = useMotionValue(value);
  const display = useTransform(current, (n) => format(n));
  useEffect(() => {
    if (reduce) {
      current.jump(value);
      return;
    }
    const controls = animate(current, value, {
      duration: 0.45,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, reduce, current]);
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

/** Spring used for accordion height: no overshoot, settles in ~350ms. */
export const accordionSpring = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.35,
};

function AccordionBodyInner({
  children,
  className,
  id,
  labelledBy,
  reduce,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  reduce: boolean;
}) {
  const present = useIsPresent();
  return (
    <motion.div
      ref={(node) => {
        if (node) node.inert = !present;
      }}
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : {
              height: accordionSpring,
              opacity: { duration: present ? 0.25 : 0.15, ease: "easeOut" },
            }
      }
      className="overflow-hidden"
    >
      <div className={className}>{children}</div>
    </motion.div>
  );
}

/** Motion Primitives-style accordion content: height and opacity animate
 * together, so one card closing while another opens trades space smoothly
 * instead of jumping. Small, isolated surfaces only (see UI_RULES). */
export function AccordionBody({
  open,
  children,
  className,
  id,
  labelledBy,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}) {
  const reduce = !!useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <AccordionBodyInner
          key="body"
          id={id}
          labelledBy={labelledBy}
          className={className}
          reduce={reduce}
        >
          {children}
        </AccordionBodyInner>
      )}
    </AnimatePresence>
  );
}
