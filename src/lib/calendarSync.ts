import { prisma } from "@/lib/prisma";

// What a synced calendar (ICS feed or pushed Google events) is built from.
// Shared by both delivery methods, so they can never drift on what counts
// as "my busy time" - see TripItem and ItemAttendee for why transport and
// activities are read differently here.

/** A block of time to show as busy, with no name attached - the calendar
 * sync's whole point is that this is all a synced event ever carries. */
export type BusyBlock = {
  itemId: string;
  startDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endDate: string;
  endTime: string;
};

const DEFAULT_DURATION_MIN = 60;

/** `time` plus an hour, rolling into the next day if it crosses midnight.
 * Used only when a plan has a start with no known finish - the same gap
 * `fmtTimeRange` already renders as "Any time" everywhere else, except
 * here a block needs *some* end to exist on a calendar at all. */
function addDefaultDuration(date: string, time: string): { date: string; time: string } {
  // Treated as UTC purely as a scratch clock for the addition; the result
  // is read back out as the same kind of wall-clock date+time pair that
  // went in, with no timezone attached either way.
  const start = new Date(`${date}T${time}:00Z`);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60_000);
  return {
    date: end.toISOString().slice(0, 10),
    time: end.toISOString().slice(11, 16),
  };
}

/** Every plan that should block time on the signed-in person's own
 * calendar, across every team they're in - not just the active one.
 *
 * Transport has no sign-up of its own (see ItemAttendee): a flight or
 * train is something the whole group is on, not something you opt into
 * the way an activity is, so every transport plan with a time counts.
 * An activity only counts once this person has actually joined it, the
 * same "Going" signal the day sheet and inline schedule already show. */
export async function busyBlocksFor(userId: string): Promise<BusyBlock[]> {
  const teamIds = (
    await prisma.membership.findMany({
      where: { userId },
      select: { teamId: true },
    })
  ).map((m) => m.teamId);
  if (teamIds.length === 0) return [];

  const items = await prisma.tripItem.findMany({
    where: {
      trip: { teamId: { in: teamIds } },
      date: { not: null },
      time: { not: null },
      OR: [
        { section: "TRANSPORT" },
        { section: "ACTIVITIES", attendees: { some: { userId } } },
      ],
    },
    select: { id: true, date: true, time: true, endTime: true },
  });

  return items.map((item) => {
    const startDate = item.date!.toISOString().slice(0, 10);
    const startTime = item.time!;
    const end = item.endTime
      ? { date: startDate, time: item.endTime }
      : addDefaultDuration(startDate, startTime);
    return {
      itemId: item.id,
      startDate,
      startTime,
      endDate: end.date,
      endTime: end.time,
    };
  });
}

function icsStamp(date: string, time: string): string {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

/** A VCALENDAR of floating-time events, one per busy block, each titled
 * just "Busy" - never the plan's name, location or anything else. Floating
 * (no TZID, no trailing Z) rather than converted to a fixed zone: the app
 * doesn't track a timezone per stop either (plan times are destination
 * wall-clock, deliberately not converted), and a floating time is read by
 * the viewer's own device clock, which is right for the person doing the
 * actual travelling and the one case this really has to get right. */
export function buildIcs(blocks: BusyBlock[]): string {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//travel-planner//busy sync//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Busy (Travel)",
    "REFRESH-INTERVAL;VALUE=DURATION:PT30M",
    "X-PUBLISHED-TTL:PT30M",
    ...blocks.flatMap((b) => [
      "BEGIN:VEVENT",
      `UID:${b.itemId}@travel-planner`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsStamp(b.startDate, b.startTime)}`,
      `DTEND:${icsStamp(b.endDate, b.endTime)}`,
      "SUMMARY:Busy",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
