import type { CSSProperties } from "react";
import { ACCENT, ACCENT_INK, ACCENT_SOFT, stopColor } from "@/lib/theme";
import { DAY, MONTHS_SHORT, ms, toDateInput } from "@/lib/dates";

export type CalendarEvent = {
  id: string;
  label: string;
  start: string;
  end: string;
  isNote: boolean;
  hasStay: boolean;
  hasTransport: boolean;
  color: string | null;
};

export type DayCell = {
  /** "YYYY-MM-DD" */
  date: string;
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
  /** Fixed-width pill for a short stop; stacks above full-span bars. */
  wide: boolean;
};

export type CalendarWeek = {
  days: DayCell[];
  bars: BarPill[];
  rowStyle: CSSProperties;
  /** Where the bars end, so a day's plans can start below them. */
  barsBottom: number;
};

export type CalendarView = "month" | "2weeks" | "week";

/** Weeks shown, and how many of a day's plans are listed before "+n", per
 * view. Shorter views have taller days, so they list more. */
export const VIEW_WEEKS: Record<CalendarView, number> = { month: 6, "2weeks": 2, week: 1 };
export const VIEW_PLANS: Record<CalendarView, number> = { month: 1, "2weeks": 4, week: 12 };

/** Height of one plan line in a day. */
const PREVIEW_H = 20;

/** The tightest view that shows a stop whole: one week, two, or its month. */
export function fitView(start: string, end: string, startOn = 0): CalendarView {
  const from = ms(start);
  const weekStart = from - ((new Date(from).getUTCDay() - startOn + 7) % 7) * DAY;
  const days = Math.round((ms(end) - weekStart) / DAY);
  return days < 7 ? "week" : days < 14 ? "2weeks" : "month";
}

/** The first day shown: the start of the month's first week, or of the
 * week holding the cursor's day. */
export function gridStart(
  cursor: { y: number; m: number; d: number },
  view: CalendarView,
  startOn: number,
): number {
  const anchor = Date.UTC(cursor.y, cursor.m, view === "month" ? 1 : cursor.d);
  const shift = (new Date(anchor).getUTCDay() - startOn + 7) % 7;
  return anchor - shift * DAY;
}

/** Direct port of the Claude Design prototype's lane-packing algorithm, so trip
 * bars keep the exact same overlap-free layout at any viewport width. */
export function buildWeeks(
  cursor: { y: number; m: number; d: number },
  events: CalendarEvent[],
  opts: {
    view: CalendarView;
    startWeekOn: "Sunday" | "Monday";
    mainWidth: number;
    todayMs: number;
    /** Plans per day, which get room under the bars. */
    planCounts?: Map<string, number>;
    /** The open stop's dates; days outside them are grayed out. */
    focus?: { start: string; end: string } | null;
  },
): CalendarWeek[] {
  const { m } = cursor;
  const startOn = opts.startWeekOn === "Monday" ? 1 : 0;
  const start = gridStart(cursor, opts.view, startOn);
  const month = opts.view === "month";
  const maxPlans = VIEW_PLANS[opts.view];

  const cellW = Math.max(28, opts.mainWidth / 7);
  const pillMin = Math.max(52, Math.min(96, Math.round(cellW * 2.4)));
  const pillCols = Math.min(7, Math.max(1, Math.ceil(pillMin / cellW)));
  const band = 24;
  const pitch = 23;
  const pillH = 21;

  const weeks: CalendarWeek[] = [];

  for (let w = 0; w < VIEW_WEEKS[opts.view]; w++) {
    const wStart = start + w * 7 * DAY;
    const wEnd = wStart + 6 * DAY;
    const days: DayCell[] = [];

    for (let i = 0; i < 7; i++) {
      const cur = wStart + i * DAY;
      const d = new Date(cur);
      // Week views have no "other month" days to dim; with a stop open, the
      // days outside it are dimmed instead.
      const date = toDateInput(cur);
      const inMonth = opts.focus
        ? date >= opts.focus.start && date <= opts.focus.end
        : !month || d.getUTCMonth() === m;
      const named = d.getUTCDate() === 1 || (!month && w === 0 && i === 0);
      days.push({
        date,
        label:
          named && cellW > 52
            ? `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`
            : String(d.getUTCDate()),
        bg: inMonth ? "#ffffff" : "#fafaf9", // stone-50
        color: cur === opts.todayMs ? ACCENT_INK : inMonth ? "#44403c" : "#a8a29e", // stone-700 / 400
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
      const c = e.color ? stopColor(e.color) : null;

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
        wide,
        dotStyle: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: c ? c.base : ACCENT,
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
          height: pillH,
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "0 6px",
          boxSizing: "border-box",
          fontSize: 11.5,
          lineHeight: 1,
          color: e.isNote ? "#57534e" : c ? c.ink : ACCENT_INK, // stone-600
          background: e.isNote ? "#f5f5f4" : c ? c.soft : ACCENT_SOFT, // stone-100
          borderRadius: contL ? "0 999px 999px 0" : contR ? "999px 0 0 999px" : 999,
          opacity: contL ? 0.72 : 1,
          pointerEvents: e.isNote ? "none" : "auto",
          cursor: e.isNote ? "default" : "pointer",
        },
      });
    });

    // Room for the most plans any day this week lists, plus its "+n" line.
    const planLines = Math.max(
      0,
      ...days.map((d) => {
        const n = opts.planCounts?.get(d.date) ?? 0;
        return n > maxPlans ? maxPlans + (maxPlans > 1 ? 1 : 0) : n;
      }),
    );
    const barsBottom = band + lanes.length * pitch;
    weeks.push({
      days,
      bars,
      barsBottom,
      rowStyle: {
        position: "relative",
        flex: "1 1 auto",
        minHeight:
          Math.max(band + pitch, barsBottom) + 8 + planLines * PREVIEW_H,
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
