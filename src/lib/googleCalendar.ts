// Pushes the same busy blocks the ICS feed serves into a dedicated Google
// Calendar, for anyone who wants a real calendar entry rather than a feed
// to subscribe to. A thin wrapper over the REST API (no googleapis SDK),
// the same call this app already makes to Google's Places API - see
// lib/places.ts.
//
// Every write here goes through one function, syncUserCalendar, which
// reconciles Google against busyBlocksFor rather than being told about
// each change: plans can change through the UI or through an AI assistant
// over MCP, and those don't share a single write path, so recomputing the
// whole set each time is the only way both are covered.
import { prisma } from "@/lib/prisma";
import { busyBlocksFor, type BusyBlock } from "@/lib/calendarSync";

const CALENDAR_SUMMARY = "Busy (Travel)";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

type Sync = {
  id: string;
  userId: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: Date | null;
  googleCalendarId: string | null;
  googleTimeZone: string | null;
};

function clientCreds() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar isn't configured on this deployment.");
  }
  return { clientId, clientSecret };
}

/** Exchanges the authorization code the callback route received for
 * tokens. Called once, right after the person approves access. */
export async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = clientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

/** A valid access token for this sync, refreshing it first if it's expired
 * or close to it. Google only hands back a refresh token on the very
 * first consent, which is why one is required to connect at all. */
async function freshAccessToken(sync: Sync): Promise<string> {
  const expiresSoon =
    !sync.googleTokenExpiry || sync.googleTokenExpiry.getTime() < Date.now() + 60_000;
  if (sync.googleAccessToken && !expiresSoon) return sync.googleAccessToken;
  if (!sync.googleRefreshToken) {
    throw new Error("Google Calendar is no longer connected.");
  }

  const { clientId, clientSecret } = clientCreds();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: sync.googleRefreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data: { access_token: string; expires_in: number } = await res.json();

  await prisma.calendarSync.update({
    where: { id: sync.id },
    data: {
      googleAccessToken: data.access_token,
      googleTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    },
  });
  return data.access_token;
}

async function call(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

/** This sync's dedicated calendar, creating it the first time - never the
 * person's primary calendar, so disconnecting can delete it outright and
 * nothing else on their account is touched either way. */
async function ensureCalendarId(sync: Sync, accessToken: string): Promise<string> {
  if (sync.googleCalendarId) return sync.googleCalendarId;
  const res = await call(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: CALENDAR_SUMMARY }),
  });
  if (!res.ok) throw new Error(`Could not create the Google calendar: ${await res.text()}`);
  const { id } = (await res.json()) as { id: string };
  await prisma.calendarSync.update({
    where: { id: sync.id },
    data: { googleCalendarId: id },
  });
  return id;
}

function eventBody(block: BusyBlock, timeZone: string) {
  return {
    summary: "Busy",
    start: { dateTime: `${block.startDate}T${block.startTime}:00`, timeZone },
    end: { dateTime: `${block.endDate}T${block.endTime}:00`, timeZone },
  };
}

const sameBlock = (a: BusyBlock, b: { startDate: string; startTime: string; endDate: string; endTime: string }) =>
  a.startDate === b.startDate &&
  a.startTime === b.startTime &&
  a.endDate === b.endDate &&
  a.endTime === b.endTime;

/** Reconciles the connected Google Calendar to exactly the blocks
 * busyBlocksFor returns right now: new plans are inserted, changed times
 * are updated, and anything no longer there - deleted, or an activity this
 * person left - is removed. Silent no-op if Google isn't connected, so
 * this is safe to call from anywhere without checking first. */
export async function syncUserCalendar(userId: string): Promise<void> {
  const sync = await prisma.calendarSync.findUnique({ where: { userId } });
  if (!sync?.googleRefreshToken) return;

  const accessToken = await freshAccessToken(sync);
  const calendarId = await ensureCalendarId(sync, accessToken);
  const timeZone = sync.googleTimeZone ?? "UTC";

  const [blocks, existing] = await Promise.all([
    busyBlocksFor(userId),
    prisma.syncedEvent.findMany({ where: { syncId: sync.id } }),
  ]);
  const byItem = new Map(existing.map((e) => [e.itemId, e]));
  const wanted = new Set(blocks.map((b) => b.itemId));

  for (const block of blocks) {
    const current = byItem.get(block.itemId);
    if (!current) {
      const res = await call(accessToken, `/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(eventBody(block, timeZone)),
      });
      if (!res.ok) continue; // one plan failing to push shouldn't stop the rest
      const { id: googleEventId } = (await res.json()) as { id: string };
      await prisma.syncedEvent.create({
        data: { syncId: sync.id, googleEventId, ...block },
      });
    } else if (!sameBlock(block, current)) {
      const res = await call(
        accessToken,
        `/calendars/${calendarId}/events/${current.googleEventId}`,
        { method: "PATCH", body: JSON.stringify(eventBody(block, timeZone)) },
      );
      if (res.ok) {
        await prisma.syncedEvent.update({ where: { id: current.id }, data: { ...block } });
      }
    }
  }

  for (const stale of existing) {
    if (wanted.has(stale.itemId)) continue;
    const res = await call(
      accessToken,
      `/calendars/${calendarId}/events/${stale.googleEventId}`,
      { method: "DELETE" },
    );
    if (res.ok || res.status === 404 || res.status === 410) {
      await prisma.syncedEvent.delete({ where: { id: stale.id } });
    }
  }

  await prisma.calendarSync.update({
    where: { id: sync.id },
    data: { googleSyncedAt: new Date() },
  });
}

/** Syncs only if it's been a while, so opening the app doesn't call
 * Google's API on every page load - see the home page's after(). */
export async function syncUserCalendarIfDue(userId: string, minMinutesBetween = 10) {
  const sync = await prisma.calendarSync.findUnique({
    where: { userId },
    select: { googleRefreshToken: true, googleSyncedAt: true },
  });
  if (!sync?.googleRefreshToken) return;
  if (sync.googleSyncedAt && Date.now() - sync.googleSyncedAt.getTime() < minMinutesBetween * 60_000) {
    return;
  }
  await syncUserCalendar(userId).catch(() => {});
}

/** Deletes the dedicated calendar from the person's Google account (taking
 * every event with it) and forgets the connection. The ICS link, on the
 * same row, is untouched. */
export async function disconnectGoogleCalendar(userId: string) {
  const sync = await prisma.calendarSync.findUnique({ where: { userId } });
  if (!sync?.googleRefreshToken) return;

  if (sync.googleCalendarId) {
    try {
      const accessToken = await freshAccessToken(sync);
      await call(accessToken, `/calendars/${sync.googleCalendarId}`, { method: "DELETE" });
    } catch {
      // Revoking the tokens below still disconnects it from this app's
      // side even if the delete call itself couldn't reach Google.
    }
  }

  await prisma.syncedEvent.deleteMany({ where: { syncId: sync.id } });
  await prisma.calendarSync.update({
    where: { id: sync.id },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarId: null,
      googleSyncedAt: null,
    },
  });
}
