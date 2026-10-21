import { prisma } from "@/lib/prisma";
import type { PlaceResult } from "@/lib/places";

// Tracks real check_place calls against a team's monthly free Places
// lookups, and feeds the planner UI's "the agent just checked X" toast.
// Nothing here talks to Google: it only logs and counts what places.ts
// already confirmed actually happened.

/** check_place's field mask (rating, priceLevel, internationalPhoneNumber,
 * currentOpeningHours) bills at the Places API Text Search "Enterprise"
 * SKU, which gives this many free calls a month per Google Cloud project
 * before Google starts charging. Revisit this if the field mask in
 * places.ts changes tier. */
export const FREE_MONTHLY_LIMIT = 1000;

/** Warn once a team has used this fraction of its free monthly calls. */
const WARN_AT = 0.8;

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
}

export type PlacesUsage = {
  count: number;
  limit: number;
  remaining: number;
  warn: boolean;
};

export async function getPlacesUsage(teamId: string): Promise<PlacesUsage> {
  const count = await prisma.placesCall.count({
    where: { teamId, createdAt: { gte: monthStart() } },
  });
  return {
    count,
    limit: FREE_MONTHLY_LIMIT,
    remaining: Math.max(0, FREE_MONTHLY_LIMIT - count),
    warn: count >= FREE_MONTHLY_LIMIT * WARN_AT,
  };
}

/** Records a real check_place call and builds the message check_place
 * sends back to the agent, with a usage warning appended once the team is
 * close to its free monthly Places lookups - so the agent can mention it
 * rather than keep calling in the dark. Takes the already-resolved places
 * (never calls Google itself), so it's the one piece of check_place that
 * doesn't need a real API key to exercise. */
export async function recordCheckPlace(
  teamId: string,
  query: string,
  places: PlaceResult[],
): Promise<{ message: string; data: PlaceResult[] | undefined }> {
  await prisma.placesCall.create({ data: { teamId, query } });
  const usage = await getPlacesUsage(teamId);
  const note = usage.warn
    ? ` (${usage.count} of ${usage.limit} free Google Places lookups used this month for this team - getting close to the limit, past which Google starts billing)`
    : "";

  if (places.length === 0) {
    return { message: `No match found for "${query}"${note}`, data: undefined };
  }
  const base = places.length === 1 ? "1 match" : `${places.length} matches`;
  return { message: `${base}${note}`, data: places };
}

export type PlacesCallEvent = { id: string; query: string; createdAt: string };

/** New check_place calls for a team since a given cursor, oldest first -
 * the order a toast should play them in. `since: null` establishes a
 * baseline cursor without replaying history, so opening the planner
 * doesn't toast about everything the agent did earlier today. */
export async function placesCallsSince(
  teamId: string,
  since: string | null,
): Promise<{ calls: PlacesCallEvent[]; cursor: string }> {
  if (since === null) {
    return { calls: [], cursor: new Date().toISOString() };
  }
  const rows = await prisma.placesCall.findMany({
    where: { teamId, createdAt: { gt: new Date(since) } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  return {
    calls: rows.map((r) => ({
      id: r.id,
      query: r.query,
      createdAt: r.createdAt.toISOString(),
    })),
    cursor: rows.length > 0 ? rows[rows.length - 1].createdAt.toISOString() : since,
  };
}
