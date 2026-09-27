"use client";

import { useId } from "react";
import { AnimatedBackground } from "@/components/motion/primitives";
import {
  Hotel,
  Plane,
  Plus,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Settings2,
  MapPin,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import { isScheduled } from "@/lib/tripSections";
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
  onDeleteTrip,
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
  onSelectTrip: (t: TripData) => void;
  onAddTrip: () => void;
  addingTrip: boolean;
  onDeleteTrip: (id: string, label: string) => void;
  onClose: () => void;
  showClose: boolean;
  todayLabel: string;
}) {
  const highlightId = useId();
  const overlayBox =
    "absolute top-3 bottom-3 z-20 w-[272px] shadow-[0_18px_44px_rgba(28,27,25,0.18)] left-[74px]";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  return (
    <aside aria-label="Trips" className={card + " p-5 " + positionClass}>
      <div className="mb-1 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="section-label mb-2">Your itinerary</p>
          <h2 className="panel-heading break-words">{teamName}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={showClose ? onClose : onOpenSettings}
          aria-label={showClose ? "Close trips" : "Trip settings"}
        >
          {showClose ? <X /> : <Settings2 />}
        </Button>
      </div>
      {showClose && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 self-start"
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
      <nav
        aria-label="Trip stops"
        className="-mx-2 mt-5 min-h-0 space-y-1 overflow-y-auto px-1"
      >
        {trips.map((t) => (
          <div
            key={t.id}
            className={
              "relative isolate flex items-center rounded-xl transition-colors " +
              (selectedTripId === t.id ? "" : "hover:bg-hover")
            }
          >
            {selectedTripId === t.id && (
              <AnimatedBackground
                layoutId={highlightId}
                className="bg-accent-soft"
              />
            )}
            <button
              onClick={() => onSelectTrip(t)}
              aria-current={selectedTripId === t.id ? "true" : undefined}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-3 pl-2 text-left"
            >
              {t.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photoUrl}
                  alt=""
                  className="size-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: stopColor(t.color).soft,
                    color: stopColor(t.color).ink,
                  }}
                >
                  <MapPin size={15} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {t.label}
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs tabular-nums text-muted">
                  {fmtRange(t.start, t.end)}
                  {t.stay.some(isScheduled) && (
                    <Hotel size={12} aria-label="Stay scheduled" />
                  )}
                  {t.transport.some(isScheduled) && (
                    <Plane size={12} aria-label="Transport scheduled" />
                  )}
                </span>
              </span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Options for ${t.label}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => onSelectTrip(t)}>
                  <Pencil />
                  Edit stop
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onSelect={() => onDeleteTrip(t.id, t.label)}
                >
                  <Trash2 />
                  Delete stop
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        {trips.length === 0 && (
          <p className="px-2 py-4 text-sm leading-relaxed text-muted">
            Your next adventure starts with a stop.
          </p>
        )}
      </nav>
      <Button
        variant="outline"
        onClick={onAddTrip}
        disabled={addingTrip}
        className="mt-4 w-full justify-start"
      >
        {addingTrip ? <Loader2 className="animate-spin" /> : <Plus />}
        {addingTrip ? "Adding stop…" : "Add stop"}
      </Button>
      <footer className="mt-auto shrink-0 pt-6">
        <div className="mb-4 text-xs leading-relaxed text-muted">
          <p>{todayLabel}</p>
          <p>
            {trips.length} {trips.length === 1 ? "stop" : "stops"} planned
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">
              {initials(userName)}
            </span>
            <span className="truncate text-xs font-medium text-ink-soft">
              {userName}
            </span>
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="px-2 text-xs"
            >
              Sign out
            </Button>
          </form>
        </div>
      </footer>
    </aside>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
