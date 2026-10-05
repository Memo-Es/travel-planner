import type { ItemData, ItemSectionKey, TripData } from "@/lib/types";
import { DAY, MONTHS_SHORT, ms, toDateInput } from "@/lib/dates";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Sections whose bookings can be placed on a day of the itinerary. */
export const PLANNED_SECTIONS: ItemSectionKey[] = ["transport", "activities"];

export type Plan = {
  item: ItemData;
  key: ItemSectionKey;
  trip: TripData;
};

/** Every calendar day of a stop, arrival through departure. */
export function tripDays(trip: Pick<TripData, "start" | "end">): string[] {
  const days: string[] = [];
  for (let t = ms(trip.start); t <= ms(trip.end); t += DAY) {
    days.push(toDateInput(t));
  }
  return days;
}

/** "Mon 16 Nov" */
export function fmtDay(date: string): string {
  const d = new Date(ms(date));
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

/** Timed plans first in time order; untimed ones keep their saved order. */
export function byTime(a: Plan, b: Plan): number {
  if (a.item.time && b.item.time) return a.item.time.localeCompare(b.item.time);
  if (a.item.time) return -1;
  if (b.item.time) return 1;
  return 0;
}

export function tripPlans(trip: TripData): Plan[] {
  return PLANNED_SECTIONS.flatMap((key) =>
    trip[key].map((item) => ({ item, key, trip })),
  );
}

/** Plans grouped by day for one stop. Days with nothing planned are kept
 * (so free days show up), and undated plans are returned separately. */
export function itineraryFor(trip: TripData): {
  days: { date: string; plans: Plan[] }[];
  undated: Plan[];
} {
  const plans = tripPlans(trip);
  const days = tripDays(trip).map((date) => ({
    date,
    plans: plans.filter((p) => p.item.date === date).sort(byTime),
  }));
  const inRange = new Set(days.map((d) => d.date));
  // Activities without a date, plus any whose date falls outside the stop
  // (e.g. after the stop's dates were moved), still need a home.
  const undated = plans.filter(
    (p) => p.item.date === null || !inRange.has(p.item.date),
  );
  return { days, undated };
}

/** Plans on each date across all stops, for the calendar's day previews. */
export function plansByDate(trips: TripData[]): Map<string, Plan[]> {
  const map = new Map<string, Plan[]>();
  for (const plan of trips.flatMap(tripPlans)) {
    if (!plan.item.date) continue;
    const list = map.get(plan.item.date) ?? [];
    list.push(plan);
    map.set(plan.item.date, list);
  }
  for (const list of map.values()) list.sort(byTime);
  return map;
}

const DAY_PARTS = [
  { name: "morning", from: "00:00", to: "12:00" },
  { name: "afternoon", from: "12:00", to: "18:00" },
  { name: "evening", from: "18:00", to: "24:00" },
] as const;

/** Parts of the day with no timed plan, to surface gaps worth filling.
 * Returns null when there's nothing timed to compare against (a fully free
 * day, or plans without a time). */
export function freeParts(plans: Plan[]): string[] | null {
  const times = plans.map((p) => p.item.time).filter(Boolean) as string[];
  if (times.length === 0) return null;
  return DAY_PARTS.filter(
    (part) => !times.some((t) => t >= part.from && t < part.to),
  ).map((part) => part.name);
}

/** The stop to show by default: the one happening today, else the next
 * upcoming one, else the first. */
export function defaultTripId(trips: TripData[], todayMs: number): string | null {
  const today = toDateInput(todayMs);
  const current = trips.find((t) => t.start <= today && today <= t.end);
  if (current) return current.id;
  const upcoming = [...trips]
    .filter((t) => t.start > today)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  return (upcoming ?? trips[0])?.id ?? null;
}
