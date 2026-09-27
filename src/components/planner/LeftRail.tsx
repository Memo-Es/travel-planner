"use client";

import { Button } from "@/components/ui/button";

import type { TripData } from "@/lib/types";
import { fmtRange } from "@/lib/dates";

const ACCENT = "oklch(0.62 0.19 285)";

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
    <div className="bg-white rounded-card border border-line py-3.5 flex flex-col items-center gap-2.5 box-border overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenLinks}
        aria-label="Trips"
        title="Trips"
        className="size-9 rounded-[9px] border-0 bg-hover cursor-pointer flex items-center justify-center hover:bg-hover-2"
      >
        <span
          className="w-[11px] h-[11px] rounded-full block"
          style={{ background: ACCENT }}
        />
      </Button>
      {trips.slice(0, 8).map((t) => (
        <Button
          variant="ghost"
          size="icon"
          key={t.id}
          onClick={() => onOpenTrip(t)}
          title={`${t.label} · ${fmtRange(t.start, t.end)}`}
          className="size-9 rounded-lg border-0 bg-transparent cursor-pointer flex items-center justify-center text-[11px] tracking-[0.03em] text-muted hover:bg-hover"
        >
          {t.label.slice(0, 3).toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
