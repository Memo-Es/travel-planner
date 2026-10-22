import { ms } from "@/lib/dates";

const DAY_MS = 86_400_000;

/** How far a date range is from today: "Starts in 3 days", "Day 2 of 5"… */
export function statusFor(start: string, end: string): string {
  const from = ms(start);
  const to = ms(end);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = (a: number, b: number) => Math.round((a - b) / DAY_MS);
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  if (today < from) {
    const n = days(from, today);
    return n === 1 ? "Starts tomorrow" : `Starts in ${plural(n, "day")}`;
  }
  if (today <= to) return `Day ${days(today, from) + 1} of ${days(to, from) + 1}`;
  const n = days(today, to);
  return n === 1 ? "Ended yesterday" : `Ended ${plural(n, "day")} ago`;
}
