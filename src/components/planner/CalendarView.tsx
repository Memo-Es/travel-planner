"use client";

import type * as React from "react";
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
  return interactive ? (
    <button type="button" {...props} />
  ) : (
    <div {...props} />
  );
}

/** One plan in a day: its stop's dot, time and name. */
function PlanLine({
  plan,
  all,
  wrap,
  onOpenTrip,
  className,
}: {
  /** Let a long name run onto a second line, in days wide enough for it. */
  wrap?: boolean;
  plan: Plan;
  /** On a one-line preview, every plan that day: the rest show as "+n" and
   * all of them in the tooltip and label. */
  all?: Plan[];
  onOpenTrip: (tripId: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenTrip(plan.trip.id)}
      title={all?.map((p) => `${p.item.time ?? "—"}  ${p.item.t}`).join("\n")}
      aria-label={
        all &&
        `${all.length} ${all.length === 1 ? "plan" : "plans"}: ${all
          .map((p) => (p.item.time ? `${p.item.time} ${p.item.t}` : p.item.t))
          .join(", ")}`
      }
      className={cn(
        "relative z-bar-focus -mx-1 flex min-w-0 gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-4 text-ink-soft transition-colors duration-150 hover:bg-secondary",
        wrap ? "items-start" : "items-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", wrap && "mt-[5px]")}
        style={{ background: stopColor(plan.trip.color).base }}
      />
      {wrap ? (
        // Time and name flow as one text, so a long name wraps under the time.
        <span className="line-clamp-2 min-w-0 break-words">
          {plan.item.time && (
            <span className="font-medium tabular-nums">{plan.item.time} </span>
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
          <span className="min-w-0 truncate">{plan.item.t}</span>
        </>
      )}
      {all && all.length > 1 && (
        <span className="shrink-0 text-muted">+{all.length - 1}</span>
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
  onResizeStart,
  plans,
}: {
  view: View;
  weeks: CalendarWeek[];
  /** Plans by "YYYY-MM-DD", shown as a one-line preview in each day. */
  plans: Map<string, Plan[]>;
  width: number;
  onOpenTrip: (tripId: string) => void;
  onBarPointerDown: (tripId: string, clientX: number) => void;
  onResizeStart: (
    tripId: string,
    edge: "left" | "right",
    clientX: number,
  ) => void;
}) {
  const weekdays = width / 7 < 48 ? WEEKDAYS_SHORT : WEEKDAYS_FULL;
  const maxPlans = VIEW_PLANS[view];

  return (
    <div className="scroll-quiet flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
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
                    onOpenTrip={onOpenTrip}
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
                            wrap={width / 7 >= 80}
                            onOpenTrip={onOpenTrip}
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
