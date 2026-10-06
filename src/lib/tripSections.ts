import type { ItemData, ItemSectionKey } from "@/lib/types";

export const SECTION_DEFS: { key: ItemSectionKey; name: string; placeholder: string }[] = [
  { key: "stay", name: "Stay", placeholder: "Lodging / hotel name" },
  { key: "transport", name: "Transport", placeholder: "Flight, train or transfer" },
  { key: "activities", name: "Activities", placeholder: "Activity or reservation" },
];

/** A booking is complete once it has a name and a location, plus a time for
 * the sections that sit on the itinerary. Cost is optional. */
export function isScheduled(item: ItemData, key: ItemSectionKey): boolean {
  const needsTime = key !== "stay";
  return !!(item.t.trim() && item.location.trim() && (!needsTime || item.time));
}

/** What's still missing for `isScheduled`, for the form hint. */
export function scheduleRequirements(key: ItemSectionKey): string {
  return key === "stay" ? "a name and a location" : "a name, a location and a time";
}

/** Opens a pasted Google Maps link as is, or searches Maps for an address. */
export function mapsHref(location: string): string {
  const value = location.trim();
  return /^https?:\/\//i.test(value)
    ? value
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

/** Short label for a location: the host for links, the text for addresses. */
export function locationLabel(location: string): string {
  const value = location.trim();
  return /^https?:\/\//i.test(value) ? "Open in Maps" : value;
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
