"use server";

import { prisma } from "@/lib/prisma";
import { requireTeamMembership, requireUser } from "@/lib/team";
import { getPlacesUsage, placesCallsSince, recordCheckPlace } from "@/lib/places-usage";
import { checkPlace, resolvePlacesKey, type PlaceResult } from "@/lib/places";
import { stopAccess } from "@/lib/planner";

/** Polled by the planner while a team's page is open, so a teammate
 * planning with an agent over MCP sees a toast the moment it checks a real
 * place, and a warning once the team is close to its free monthly Places
 * lookups. `since` is the cursor returned by the last call, or null on
 * first mount. */
export async function pollPlacesActivity(teamId: string, since: string | null) {
  await requireTeamMembership(teamId);
  const [usage, activity] = await Promise.all([
    getPlacesUsage(teamId),
    placesCallsSince(teamId, since),
  ]);
  return { usage, ...activity };
}

/** Up to 3 real candidates for a free-typed location on an activity - the
 * same Google Places lookup check_place uses, just triggered by a person
 * typing instead of an agent. Returns null when the stop's team hasn't set
 * a Places API key yet, so the field can fall back to plain text; an empty
 * array means the key works but nothing matched. */
export async function searchActivityLocation(
  tripId: string,
  query: string,
): Promise<PlaceResult[] | null> {
  const user = await requireUser();
  const trip = await stopAccess(user.id, tripId);
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: trip.teamId },
    select: { id: true, placesApiKey: true },
  });
  const key = resolvePlacesKey(team);
  if (!key) return null;
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const places = await checkPlace(trimmed, key);
  if (!places) return null;
  const { data } = await recordCheckPlace(team.id, trimmed, places, "human");
  return data ?? [];
}
