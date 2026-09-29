import { Hotel, Plane, UtensilsCrossed, MapPin, type LucideIcon } from "lucide-react";
import type { ItemSectionKey } from "@/lib/types";

export const SECTION_ICONS: Record<ItemSectionKey, LucideIcon> = {
  stay: Hotel,
  transport: Plane,
  food: UtensilsCrossed,
  activities: MapPin,
};
