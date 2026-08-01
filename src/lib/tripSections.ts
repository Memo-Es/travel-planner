import type { ItemData, ItemSectionKey } from "@/lib/types";

export const SECTION_DEFS: { key: ItemSectionKey; name: string; placeholder: string }[] = [
  { key: "stay", name: "Stay", placeholder: "Lodging / hotel name" },
  { key: "transport", name: "Transport", placeholder: "Flight, train or transfer" },
  { key: "activities", name: "Activities", placeholder: "Activity or reservation" },
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
