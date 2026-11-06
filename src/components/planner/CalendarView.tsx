"use client";

import type * as React from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { Hotel, Plane } from "lucide-react";
import {
  VIEW_PLANS,
  type CalendarView as View,
  type CalendarWeek,
} from "@/lib/calendar";
import type { Plan } from "@/lib/itinerary";
import { stopColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
/** How much of a month day's plan line fits, by day width: dots alone
 * (phones), the time and "+n", or the time, name and "+n". A name cut to a
 * letter or two is noise, so it only shows with room to read. */
type Density = "dots" | "time" | "full";
const TIME_DAY_W = 70;
const NAME_DAY_W = 100;
function densityFor(dayW: number): Density {
  return dayW < TIME_DAY_W ? "dots" : dayW < NAME_DAY_W ? "time" : "full";
}
/** Dots a day shows before "+n". */
const COMPACT_DOTS = 3;

const handleStyle = {
  position: "absolute" as const,
  top: 0,
  bottom: 0,
  width: 7,
  cursor: "ew-resize",
  touchAction: "none" as const,
};

// Trip bars are native buttons so they get keyboard focus and semantics for
// free; holiday notes are passive labels.
function Bar({
  interactive,
  ...props
}: { interactive: boolean } & React.HTMLAttributes<HTMLElement>) {
  return interactive ? <button type="button" {...props} /> : <div {...props} />;
}

/** One plan in a day: its stop's dot, time and name. */
function PlanLine({
  plan,
  all,
  wrap,
  density = "full",
  onOpen,
  className,
}: {
  /** Let a long name run onto a second line, in days wide enough for it. */
  wrap?: boolean;
  /** "dots": one per plan in its stop's colour, "+n" past a few. "time":
   * the time (or the name, for a plan without one) and "+n". */
  density?: Density;
  plan: Plan;
  /** On a one-line preview, every plan that day: the rest show as "+n" and
   * all of them in the tooltip and label. */
  all?: Plan[];
  onOpen: (plan: Plan) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(plan)}
      title={all?.map((p) => `${p.item.time ?? "—"}  ${p.item.t}`).join("\n")}
      aria-label={
        all &&
        `${all.length} ${all.length === 1 ? "plan" : "plans"}: ${all
          .map((p) => (p.item.time ? `${p.item.time} ${p.item.t}` : p.item.t))
          .join(", ")}`
      }
      className={cn(
        "relative z-bar-focus -mx-1 flex min-w-0 gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-4 text-ink-soft transition-colors duration-150 hover:bg-secondary [@media(pointer:coarse)]:py-1",
        wrap ? "items-start" : "items-center",
        className,
      )}
    >
      {density === "dots" && all ? (
        <span
          aria-hidden="true"
          className="flex min-w-0 items-center gap-[3px] py-[5px]"
        >
          {all.slice(0, COMPACT_DOTS).map((p) => (
            <span
              key={p.item.id}
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: stopColor(p.trip.color).base }}
            />
          ))}
          {all.length > COMPACT_DOTS && (
            <span className="ml-0.5 shrink-0 text-[10px] leading-none text-muted">
              +{all.length - COMPACT_DOTS}
            </span>
          )}
        </span>
      ) : (
        <>
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", wrap && "mt-[5px]")}
            style={{ background: stopColor(plan.trip.color).base }}
          />
          {wrap ? (
            // Time and name flow as one text, so a long name wraps under the time.
            <span className="line-clamp-2 min-w-0 break-words">
              {plan.item.time && (
                <span className="font-medium tabular-nums">
                  {plan.item.time}{" "}
                </span>
              )}
              {plan.item.t}
            </span>
          ) : (
            <>
              {plan.item.time && (
                <span className="shrink-0 font-medium tabular-nums">
                  {plan.item.time}
                </span>
              )}
              {(density === "full" || !plan.item.time) && (
                <span className="min-w-0 truncate">{plan.item.t}</span>
              )}
            </>
          )}
          {all && all.length > 1 && (
            <span className="shrink-0 text-muted">+{all.length - 1}</span>
          )}
        </>
      )}
    </button>
  );
}

export default function CalendarView({
  view,
  weeks,
  width,
  onBarPointerDown,
  onOpenTrip,
  onOpenPlan,
  onResizeStart,
  plans,
}: {
  view: View;
  weeks: CalendarWeek[];
  /** Plans by "YYYY-MM-DD", shown as a one-line preview in each day. */
  plans: Map<string, Plan[]>;
  width: number;
  onOpenTrip: (tripId: string) => void;
  /** A plan tapped in a day: opens that day's plans with it in focus. */
  onOpenPlan: (plan: Plan) => void;
  onBarPointerDown: (tripId: string, clientX: number) => void;
  onResizeStart: (
    tripId: string,
    edge: "left" | "right",
    clientX: number,
  ) => void;
}) {
  // The real width of a day, measured, so what fits in it is decided on
  // what's there; the panel's width (minus its padding) until it's measured.
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredDayW, setMeasuredDayW] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMeasuredDayW(el.clientWidth / 7));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const dayW = measuredDayW ?? width / 7;
  const weekdays = dayW < 48 ? WEEKDAYS_SHORT : WEEKDAYS_FULL;
  const maxPlans = VIEW_PLANS[view];

  return (
    <div
      ref={gridRef}
      className="scroll-quiet flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden"
    >
      <div
        className="sticky top-0 z-sticky grid border-b border-line-soft bg-white pb-2"
        style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}
      >
        {weekdays.map((wd, i) => (
          <div
            key={i}
            className="overflow-hidden pr-1.5 text-right text-xs font-semibold uppercase text-muted-2"
          >
            {wd}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} style={week.rowStyle}>
          {week.days.map((day, di) => {
            const dayPlans = plans.get(day.date) ?? [];
            const first = dayPlans[0];
            return (
              <div
                key={di}
                className="box-border flex min-w-0 flex-col border-b border-r border-line-soft px-1.5 pt-1"
                style={{ background: day.bg }}
              >
                <div
                  className="whitespace-nowrap text-right text-xs tabular-nums"
                  style={{ color: day.color, fontWeight: day.weight }}
                >
                  {day.label}
                </div>
                {first && maxPlans === 1 ? (
                  // Month view: one line at the bottom of the day.
                  <PlanLine
                    plan={first}
                    all={dayPlans}
                    density={densityFor(dayW)}
                    onOpen={onOpenPlan}
                    className="mb-1 mt-auto"
                  />
                ) : (
                  first && (
                    // Shorter views: the day's plans listed under its bars.
                    <ul
                      aria-label={`Plans on ${day.date}`}
                      className="mb-1 flex flex-col"
                      style={{ marginTop: Math.max(2, week.barsBottom - 18) }}
                    >
                      {dayPlans.slice(0, maxPlans).map((p) => (
                        <li key={p.item.id} className="flex min-w-0 flex-col">
                          <PlanLine
                            plan={p}
                            wrap={dayW >= 80}
                            onOpen={onOpenPlan}
                          />
                        </li>
                      ))}
                      {dayPlans.length > maxPlans && (
                        <li className="px-0 py-0.5 text-[11px] leading-4 text-muted">
                          +{dayPlans.length - maxPlans} more
                        </li>
                      )}
                    </ul>
                  )
                )}
              </div>
            );
          })}
          <div className="absolute inset-0 pointer-events-none">
            {week.bars.map((bar) => (
              <Bar
                key={bar.key}
                interactive={!!bar.tripId}
                aria-label={bar.tripId ? `Open ${bar.label}` : undefined}
                className={cn(
                  bar.wide ? "z-bar-wide" : "z-bar",
                  bar.tripId &&
                    "text-left transition-[filter] duration-150 hover:brightness-95 focus-visible:z-bar-focus",
                )}
                onKeyDown={
                  bar.tripId
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenTrip(bar.tripId!);
                        }
                      }
                    : undefined
                }
                style={{
                  ...bar.style,
                  touchAction: bar.tripId ? "none" : bar.style.touchAction,
                }}
                onPointerDown={
                  bar.tripId
                    ? (e) => {
                        if (e.button === 0)
                          onBarPointerDown(bar.tripId!, e.clientX);
                      }
                    : undefined
                }
              >
                {bar.canDragLeft && (
                  <div
                    style={{ ...handleStyle, left: 0 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onResizeStart(bar.tripId!, "left", e.clientX);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                {bar.showDot && <span style={bar.dotStyle} />}
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {bar.label}
                </span>
                {(bar.hasStay || bar.hasTransport) && (
                  <span className="flex items-center gap-[3px] flex-none">
                    {bar.hasStay && <Hotel size={11} strokeWidth={2} />}
                    {bar.hasTransport && <Plane size={11} strokeWidth={2} />}
                  </span>
                )}
                {bar.canDragRight && (
                  <div
                    style={{ ...handleStyle, right: 0 }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onResizeStart(bar.tripId!, "right", e.clientX);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </Bar>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
