import type { ItemData, ItemSectionKey, MemberOption, TripData } from "@/lib/types";

export const SECTION_DEFS: {
  key: ItemSectionKey;
  name: string;
  placeholder: string;
  sharersLabel: string;
}[] = [
  { key: "stay", name: "Stay", placeholder: "Lodging / hotel name", sharersLabel: "Who's staying here?" },
  { key: "transport", name: "Transport", placeholder: "Flight, train or transfer", sharersLabel: "Who's traveling?" },
  { key: "activities", name: "Activities", placeholder: "Activity or reservation", sharersLabel: "Who's going?" },
];

export function isScheduled(item: ItemData): boolean {
  return !!(item.t.trim() && item.url.trim() && item.costAmount !== null);
}

export function sectionTotal(items: ItemData[]): number {
  return items.reduce((sum, item) => sum + (item.costAmount ?? 0), 0);
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Each sharer's equal part of an item's cost, or null when there's nothing to split. */
export function perPersonCost(item: ItemData): number | null {
  if (item.costAmount === null || item.shareIds.length === 0) return null;
  return item.costAmount / item.shareIds.length;
}

function allItems(trip: TripData): ItemData[] {
  return [...trip.stay, ...trip.transport, ...trip.activities];
}

/** What each member owes across the given trips. Items nobody was assigned
 * to are counted in `unassigned` instead of being charged to anyone. */
export function shareTotals(
  trips: TripData[],
  members: MemberOption[],
): { byMember: Map<string, number>; unassigned: number } {
  const byMember = new Map<string, number>(members.map((m) => [m.id, 0]));
  let unassigned = 0;
  for (const item of trips.flatMap(allItems)) {
    const each = perPersonCost(item);
    if (each === null) {
      unassigned += item.costAmount ?? 0;
      continue;
    }
    for (const id of item.shareIds) byMember.set(id, (byMember.get(id) ?? 0) + each);
  }
  return { byMember, unassigned };
}
