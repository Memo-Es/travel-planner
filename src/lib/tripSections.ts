import type { ItemData, ItemSectionKey, MemberOption, TripData } from "@/lib/types";

export const SECTION_DEFS: {
  key: ItemSectionKey;
  name: string;
  placeholder: string;
  sharersLabel: string;
  addressLabel: string;
  timeLabel: string | null;
}[] = [
  {
    key: "stay",
    name: "Stay",
    placeholder: "Lodging / hotel name",
    sharersLabel: "Who's staying here?",
    addressLabel: "Address",
    timeLabel: null,
  },
  {
    key: "transport",
    name: "Transport",
    placeholder: "Flight, train or transfer",
    sharersLabel: "Who's traveling?",
    addressLabel: "Departs from",
    timeLabel: "Departure",
  },
  {
    key: "food",
    name: "Food",
    placeholder: "Restaurant, café, market…",
    sharersLabel: "Who's eating?",
    addressLabel: "Place",
    timeLabel: "Date & time",
  },
  {
    key: "activities",
    name: "Activities",
    placeholder: "Museum, tour, show…",
    sharersLabel: "Who's going?",
    addressLabel: "Place",
    timeLabel: "Date & time",
  },
];

/** Timed bookings first, in chronological order; the rest keep their order. */
export function byTime(items: ItemData[]): ItemData[] {
  return [...items].sort((a, b) => {
    if (a.startsAt && b.startsAt) return a.startsAt.localeCompare(b.startsAt);
    if (a.startsAt) return -1;
    if (b.startsAt) return 1;
    return 0;
  });
}

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

export function allItems(trip: TripData): ItemData[] {
  return SECTION_DEFS.flatMap((sec) => trip[sec.key]);
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
