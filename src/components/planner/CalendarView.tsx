"use client";

import type * as React from "react";
import { Hotel, Plane } from "lucide-react";
import type { CalendarWeek } from "@/lib/calendar";
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

export default function CalendarView({
  weeks,
  width,
  onBarPointerDown,
  onOpenTrip,
  onResizeStart,
  plans,
}: {
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

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
      <div
        className="sticky top-0 z-sticky grid border-b border-line-soft bg-white pb-2"
        style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}
      >
        {weekdays.map((wd, i) => (
          <div
            key={i}
            className="overflow-hidden pr-1.5 text-right text-xs text-muted"
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
                {first && (
                  <button
                    type="button"
                    onClick={() => onOpenTrip(first.trip.id)}
                    title={dayPlans
                      .map((p) => `${p.item.time ?? "—"}  ${p.item.t}`)
                      .join("\n")}
                    aria-label={`${dayPlans.length} ${dayPlans.length === 1 ? "plan" : "plans"}: ${dayPlans
                      .map((p) => (p.item.time ? `${p.item.time} ${p.item.t}` : p.item.t))
                      .join(", ")}`}
                    className="relative z-bar-focus -mx-1 mb-1 mt-auto flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-4 text-ink-soft transition-colors duration-150 hover:bg-secondary"
                  >
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ background: stopColor(first.trip.color).base }}
                    />
                    {first.item.time && (
                      <span className="shrink-0 font-medium tabular-nums">
                        {first.item.time}
                      </span>
                    )}
                    <span className="min-w-0 truncate">{first.item.t}</span>
                    {dayPlans.length > 1 && (
                      <span className="shrink-0 text-muted">
                        +{dayPlans.length - 1}
                      </span>
                    )}
                  </button>
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
