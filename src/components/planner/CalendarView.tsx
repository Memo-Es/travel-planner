"use client";

import { Hotel, Plane } from "lucide-react";
import type { CalendarWeek } from "@/lib/calendar";

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

export default function CalendarView({
  weeks,
  width,
  onBarPointerDown,
  onResizeStart,
}: {
  weeks: CalendarWeek[];
  width: number;
  onBarPointerDown: (tripId: string, clientX: number) => void;
  onResizeStart: (tripId: string, edge: "left" | "right", clientX: number) => void;
}) {
  const weekdays = width / 7 < 48 ? WEEKDAYS_SHORT : WEEKDAYS_FULL;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
      <div
        className="sticky top-0 z-[4] bg-white grid border-b border-line-soft pb-[7px]"
        style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}
      >
        {weekdays.map((wd, i) => (
          <div key={i} className="text-right pr-1.5 text-[12px] text-muted-3 tracking-[0.01em] overflow-hidden">
            {wd}
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} style={week.rowStyle}>
          {week.days.map((day, di) => (
            <div
              key={di}
              className="border-r border-b border-line-soft pt-[5px] px-1.5 box-border min-w-0"
              style={{ background: day.bg }}
            >
              <div
                className="text-right whitespace-nowrap text-[13px] [font-variant-numeric:tabular-nums]"
                style={{ color: day.color, fontWeight: day.weight }}
              >
                {day.label}
              </div>
            </div>
          ))}
          <div className="absolute inset-0 pointer-events-none">
            {week.bars.map((bar) => (
              <div
                key={bar.key}
                style={{ ...bar.style, touchAction: bar.tripId ? "none" : bar.style.touchAction }}
                onPointerDown={bar.tripId ? (e) => onBarPointerDown(bar.tripId!, e.clientX) : undefined}
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
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{bar.label}</span>
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
