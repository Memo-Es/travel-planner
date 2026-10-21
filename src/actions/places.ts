"use server";

import { requireTeamMembership } from "@/lib/team";
import { getPlacesUsage, placesCallsSince } from "@/lib/places-usage";

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
