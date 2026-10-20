import type { ItemData, ItemSectionKey } from "@/lib/types";

export const SECTION_DEFS: { key: ItemSectionKey; name: string; placeholder: string }[] = [
  { key: "stay", name: "Stay", placeholder: "Lodging / hotel name" },
  { key: "transport", name: "Transport", placeholder: "Flight, train or transfer" },
  { key: "activities", name: "Activities", placeholder: "Activity or reservation" },
];

/** A booking reads as confirmed once it has a name and a link to show for
 * it. Cost isn't required: a restaurant reservation or a free museum slot is
 * fully scheduled with nothing to pay. */
export function isScheduled(item: ItemData): boolean {
  return !!(item.t.trim() && item.url.trim());
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
