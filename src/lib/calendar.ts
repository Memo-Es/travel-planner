import type { CSSProperties } from "react";
import { ACCENT, ACCENT_INK, ACCENT_SOFT } from "@/lib/theme";
import { DAY, MONTHS_SHORT, ms } from "@/lib/dates";

export type CalendarEvent = {
  id: string;
  label: string;
  start: string;
  end: string;
  isNote: boolean;
  hasStay: boolean;
  hasTransport: boolean;
};

export type DayCell = {
  label: string;
  bg: string;
  color: string;
  weight: number;
};

export type BarPill = {
  key: string;
  tripId: string | null;
  label: string;
  showDot: boolean;
  hasStay: boolean;
  hasTransport: boolean;
  style: CSSProperties;
  dotStyle: CSSProperties;
  canDragLeft: boolean;
  canDragRight: boolean;
};

export type CalendarWeek = {
  days: DayCell[];
  bars: BarPill[];
  rowStyle: CSSProperties;
};

/** Direct port of the Claude Design prototype's lane-packing algorithm, so trip
 * bars keep the exact same overlap-free layout at any viewport width. */
export function buildWeeks(
  cursor: { y: number; m: number },
  events: CalendarEvent[],
  opts: { startWeekOn: "Sunday" | "Monday"; mainWidth: number; todayMs: number },
): CalendarWeek[] {
  const { y, m } = cursor;
  const startOn = opts.startWeekOn === "Monday" ? 1 : 0;
  const first = Date.UTC(y, m, 1);
  const shift = (new Date(first).getUTCDay() - startOn + 7) % 7;
  const gridStart = first - shift * DAY;

  const cellW = Math.max(28, opts.mainWidth / 7);
  const pillMin = Math.max(52, Math.min(96, Math.round(cellW * 2.4)));
  const pillCols = Math.min(7, Math.max(1, Math.ceil(pillMin / cellW)));
  const band = 24;
  const pitch = 23;
  const pillH = 21;

  const weeks: CalendarWeek[] = [];

  for (let w = 0; w < 6; w++) {
    const wStart = gridStart + w * 7 * DAY;
    const wEnd = wStart + 6 * DAY;
    const days: DayCell[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = wStart + i * DAY;
      const d = new Date(cur);
      const inMonth = d.getUTCMonth() === m;
      days.push({
        label: d.getUTCDate() === 1 && cellW > 52 ? "1 " + MONTHS_SHORT[d.getUTCMonth()] : String(d.getUTCDate()),
        bg: inMonth ? "#ffffff" : "#fbfaf9",
        color: cur === opts.todayMs ? ACCENT_INK : inMonth ? "#4b4843" : "#c3bfb9",
        weight: cur === opts.todayMs ? 700 : 400,
      });
    }

    const lanes: boolean[][] = [];
    const bars: BarPill[] = [];

    events.forEach((e) => {
      const s0 = ms(e.start);
      const e0 = ms(e.end);
      if (e0 < wStart || s0 > wEnd) return;

      const s = Math.max(s0, wStart);
      const en = Math.min(e0, wEnd);
      const col = Math.round((s - wStart) / DAY);
      const span = Math.round((en - s) / DAY) + 1;
      const wide = span < pillCols;
      const occSpan = wide ? pillCols : span;
      const occEnd = Math.min(7, col + occSpan);
      const occStart = Math.max(0, occEnd - occSpan);

      let lane = 0;
      while (true) {
        if (!lanes[lane]) lanes[lane] = new Array(7).fill(false);
        let free = true;
        for (let i = occStart; i < occEnd; i++) if (lanes[lane][i]) free = false;
        if (free) {
          for (let i = occStart; i < occEnd; i++) lanes[lane][i] = true;
          break;
        }
        lane++;
      }

      const contL = s0 < wStart;
      const contR = e0 > wEnd;
      const anchorRight = wide && occStart < col;

      bars.push({
        key: e.id + ":" + w,
        tripId: e.isNote ? null : e.id,
        label: e.label,
        showDot: !e.isNote && !contL && span > 1,
        hasStay: !e.isNote && e.hasStay,
        hasTransport: !e.isNote && e.hasTransport,
        // Dragging only makes sense on a segment showing the stop's real edge,
        // and not on the fixed-width "wide" pills used for very short stops.
        canDragLeft: !e.isNote && !wide && !contL,
        canDragRight: !e.isNote && !wide && !contR,
        dotStyle: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: ACCENT,
          flex: "none",
          display: "block",
          marginLeft: 1,
        },
        style: {
          position: "absolute",
          top: band + lane * pitch,
          ...(anchorRight ? { right: 3 } : { left: `calc(${(col / 7) * 100}% + 3px)` }),
          width: `calc(${(span / 7) * 100}% - 6px)`,
          minWidth: wide ? pillMin : 0,
          zIndex: wide ? 2 : 1,
          height: pillH,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "0 6px",
          boxSizing: "border-box",
          fontSize: 11.5,
          lineHeight: 1,
          color: e.isNote ? "#7c7873" : ACCENT_INK,
          background: e.isNote ? "#f4f3f1" : ACCENT_SOFT,
          borderRadius: contL ? "0 999px 999px 0" : contR ? "999px 0 0 999px" : 999,
          opacity: contL ? 0.72 : 1,
          pointerEvents: e.isNote ? "none" : "auto",
          cursor: e.isNote ? "default" : "pointer",
        },
      });
    });

    weeks.push({
      days,
      bars,
      rowStyle: {
        position: "relative",
        flex: "1 1 auto",
        minHeight: band + Math.max(1, lanes.length) * pitch + 8,
        display: "grid",
        gridTemplateColumns: "repeat(7,minmax(0,1fr))",
      },
    });
  }

  return weeks;
}

export type LayoutMode = "full" | "compact" | "mobile";

export function layoutMode(vw: number, leftW: number, rightW: number, minMain: number): LayoutMode {
  if (vw < 720) return "mobile";
  if (vw >= leftW + rightW + minMain + 48) return "full";
  return "compact";
}

export function mainWidth(vw: number, mode: LayoutMode, leftW: number, rightW: number, railW: number): number {
  if (mode === "mobile") return vw - 20 - 48;
  const sides = mode === "full" ? leftW + rightW : railW * 2;
  return vw - sides - 48 - 24 - 48;
}
