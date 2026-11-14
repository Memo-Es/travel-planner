"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/team";
import { currentOrigin, randomToken } from "@/lib/oauth";
import { disconnectGoogleCalendar, syncUserCalendar } from "@/lib/googleCalendar";

export type CalendarSyncStatus = {
  icsUrl: string;
  googleConnected: boolean;
  googleSyncedAt: string | null;
};

/** The signed-in person's sync status, creating the ICS link the first
 * time it's asked for - lazily, the same way the public demo team is. */
export async function getCalendarSyncStatus(): Promise<CalendarSyncStatus> {
  const user = await requireUser();
  const sync = await prisma.calendarSync.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: {},
  });
  const origin = await currentOrigin();
  return {
    icsUrl: `${origin}/api/calendar/${sync.icsToken}`,
    googleConnected: !!sync.googleRefreshToken,
    googleSyncedAt: sync.googleSyncedAt ? sync.googleSyncedAt.toISOString() : null,
  };
}

/** Rotates the ICS link's secret, so a copy that leaked (shared by
 * accident, or in a browser history on a shared machine) stops working.
 * Every calendar app subscribed to the old address needs to be re-added. */
export async function regenerateIcsLink(): Promise<string> {
  const user = await requireUser();
  const sync = await prisma.calendarSync.update({
    where: { userId: user.id },
    data: { icsToken: randomToken(12) },
  });
  const origin = await currentOrigin();
  return `${origin}/api/calendar/${sync.icsToken}`;
}

export async function disconnectGoogle() {
  const user = await requireUser();
  await disconnectGoogleCalendar(user.id);
}

/** Pushes right now, for the "Sync now" button - the on-load sync in the
 * home page is throttled, so this is the way to see a just-added plan
 * reflected without waiting. */
export async function syncGoogleNow() {
  const user = await requireUser();
  await syncUserCalendar(user.id);
  const sync = await prisma.calendarSync.findUnique({
    where: { userId: user.id },
    select: { googleSyncedAt: true },
  });
  return sync?.googleSyncedAt ? sync.googleSyncedAt.toISOString() : null;
}
