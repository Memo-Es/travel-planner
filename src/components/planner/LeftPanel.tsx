"use client";

import { useId } from "react";
import { AnimatedBackground } from "@/components/motion/primitives";
import {
  X,
  Settings2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { NativeSelect } from "@/components/ui/input";
import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import { statusFor } from "@/lib/tripStatus";
import { AddRow } from "@/components/planner/AddRow";
import { logout } from "@/actions/team";
import { stopColor } from "@/lib/theme";

export default function LeftPanel({
  card,
  overlay,
  isMobile,
  trips,
  selectedTripId,
  teams,
  teamId,
  teamName,
  userName,
  onSwitchTeam,
  onOpenSettings,
  onSelectTrip,
  onAddTrip,
  addingTrip,
  onClose,
  showClose,
  todayLabel,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  trips: TripData[];
  selectedTripId: string | null;
  teams: TeamOption[];
  teamId: string;
  teamName: string;
  userName: string;
  onSwitchTeam: (id: string) => void;
  onOpenSettings: () => void;
  /** Opens the stop: its schedule here, its costs in Finances. */
  onSelectTrip: (t: TripData) => void;
  onAddTrip: () => void;
  addingTrip: boolean;
  onClose: () => void;
  showClose: boolean;
  todayLabel: string;
}) {
  const highlightId = useId();
  const overlayBox =
    "absolute bottom-3 left-[74px] top-3 z-panel w-[272px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  // The whole itinerary, first arrival to last departure.
  const status = trips.length
    ? statusFor(
        trips.reduce((a, t) => (t.start < a ? t.start : a), trips[0].start),
        trips.reduce((a, t) => (t.end > a ? t.end : a), trips[0].end),
      )
    : null;

  return (
    <aside aria-label="Trips" className={card + " p-5 " + positionClass}>
      <header className="shrink-0">
        <div className="flex items-center justify-between gap-2">
          <p className="section-label">Your itinerary</p>
          <Button
            variant="secondary"
            size="icon"
            className="-mr-1"
            onClick={showClose ? onClose : onOpenSettings}
            aria-label={showClose ? "Close trips" : "Trip settings"}
          >
            {showClose ? <X /> : <Settings2 />}
          </Button>
        </div>
        <h2 className="mt-1 text-balance break-words text-2xl font-semibold text-ink">
          {teamName}
        </h2>
        {status && (
          <p className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-medium tabular-nums text-ink">
            {status}
          </p>
        )}
        {showClose && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 mt-2"
            onClick={onOpenSettings}
          >
            <Settings2 />
            Trip settings
          </Button>
        )}
        {teams.length > 1 && (
          <NativeSelect
            aria-label="Workspace"
            className="mt-3"
            value={teamId}
            onChange={(e) => onSwitchTeam(e.target.value)}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </header>

      <nav
        aria-label="Trip stops"
        data-drag-scroll
        className="scroll-stable -mx-2 mt-5 min-h-0 overflow-y-auto overscroll-contain px-2"
      >
        <ul>
          {trips.map((t) => {
            const selected = selectedTripId === t.id;
            const color = stopColor(t.color);
            return (
              <li key={t.id} className="py-1">
                <button
                  type="button"
                  onClick={() => onSelectTrip(t)}
                  aria-current={selected ? "true" : undefined}
                  className="relative isolate -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl py-2.5 pl-2 pr-3 text-left outline-offset-[-2px] transition-colors duration-150 hover:bg-hover"
                >
                  {selected && (
                    <AnimatedBackground
                      layoutId={highlightId}
                      className="bg-secondary"
                    />
                  )}
                  {t.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.photoUrl}
                      alt=""
                      className="size-8 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex size-8 shrink-0 items-center justify-center">
                      <MapPin
                        className="size-5"
                        style={{ color: color.base }}
                        strokeWidth={2.25}
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-ink">
                      {t.label}
                    </span>
                    <span className="block truncate text-xs tabular-nums text-muted-2">
                      {fmtRange(t.start, t.end)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li className="py-1">
            <AddRow
              onClick={onAddTrip}
              busy={addingTrip}
              label={
                addingTrip
                  ? "Adding stop…"
                  : trips.length
                    ? "Add stop"
                    : "Add your first stop"
              }
            />
          </li>
        </ul>
      </nav>

      <footer className="mt-auto flex shrink-0 items-center justify-between gap-2 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={userName} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">
              {userName}
            </span>
            <span className="block truncate text-xs tabular-nums text-muted-2">
              {trips.length} {trips.length === 1 ? "stop" : "stops"} ·{" "}
              {todayLabel}
            </span>
          </span>
        </div>
        <form action={logout} className="shrink-0">
          <Button type="submit" variant="secondary" size="sm">
            Sign out
          </Button>
        </form>
      </footer>
    </aside>
  );
}
