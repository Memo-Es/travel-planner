"use client";

import { Button } from "@/components/ui/button";

import type { TripData } from "@/lib/types";
import { fmtRange } from "@/lib/dates";

export default function LeftRail({
  trips,
  onOpenLinks,
  onOpenTrip,
}: {
  trips: TripData[];
  onOpenLinks: () => void;
  onOpenTrip: (t: TripData) => void;
}) {
  return (
    <nav
      aria-label="Trip shortcuts"
      className="box-border flex flex-col items-center gap-2.5 overflow-hidden rounded-card border border-line bg-white py-3.5"
    >
      <Button
        variant="secondary"
        size="icon"
        onClick={onOpenLinks}
        aria-label="Open trips"
        title="Trips"
      >
        <span aria-hidden="true" className="block size-2.5 rounded-full bg-accent" />
      </Button>
      {trips.slice(0, 8).map((t) => (
        <Button
          variant="ghost"
          size="icon"
          key={t.id}
          onClick={() => onOpenTrip(t)}
          aria-label={`${t.label}, ${fmtRange(t.start, t.end)}`}
          title={`${t.label} · ${fmtRange(t.start, t.end)}`}
          className="text-xs font-medium"
        >
          <span aria-hidden="true">{t.label.slice(0, 3).toUpperCase()}</span>
        </Button>
      ))}
    </nav>
  );
}
