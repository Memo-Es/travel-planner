import { MapPin } from "lucide-react";
import { CITY_ICONS, iconFor, type CityIconKey } from "@/lib/cityIcons";
import { cn } from "@/lib/utils";

/** A stop's city icon, or the plain pin when there isn't one. Color comes
 * from the text color (currentColor). */
export function StopIcon({
  stop,
  icon,
  className,
  strokeWidth = 1.75,
}: {
  stop?: { label: string; icon: string | null };
  /** Draws this icon instead of resolving one from the stop. */
  icon?: CityIconKey | null;
  className?: string;
  strokeWidth?: number;
}) {
  const key = icon !== undefined ? icon : stop ? iconFor(stop) : null;
  if (!key) {
    return (
      <MapPin
        aria-hidden="true"
        className={cn("shrink-0", className)}
        strokeWidth={strokeWidth + 0.25}
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      {CITY_ICONS[key].paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
