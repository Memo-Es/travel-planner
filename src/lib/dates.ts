export const DAY = 86400000;

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Parses a "YYYY-MM-DD" date string into a UTC epoch-ms timestamp. */
export function ms(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function toDateInput(msVal: number): string {
  return new Date(msVal).toISOString().slice(0, 10);
}

export function fmtRange(start: string, end: string): string {
  const a = new Date(ms(start));
  const b = new Date(ms(end));
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return (
    a.getUTCDate() +
    (sameMonth ? "" : " " + MONTHS_SHORT[a.getUTCMonth()]) +
    "–" +
    b.getUTCDate() +
    " " +
    MONTHS_SHORT[b.getUTCMonth()]
  );
}

export function nightsBetween(start: string, end: string): number {
  return Math.round((ms(end) - ms(start)) / DAY);
}
