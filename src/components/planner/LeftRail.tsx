"use client";

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
      <button
        onClick={onOpenLinks}
        title="Trips"
        className="w-[34px] h-[34px] rounded-[9px] border-0 bg-hover cursor-pointer flex items-center justify-center hover:bg-hover-2"
      >
        <span className="w-[11px] h-[11px] rounded-full block" style={{ background: ACCENT }} />
      </button>
      {trips.slice(0, 8).map((t) => (
        <button
          key={t.id}
          onClick={() => onOpenTrip(t)}
          title={`${t.label} · ${fmtRange(t.start, t.end)}`}
          className="w-[34px] h-[26px] rounded-lg border-0 bg-transparent cursor-pointer flex items-center justify-center text-[11px] tracking-[0.03em] text-muted hover:bg-hover"
        >
          {t.label.slice(0, 3).toUpperCase()}
        </button>
      ))}
    </div>
  );
}
