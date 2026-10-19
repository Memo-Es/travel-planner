"use client";

import { Fragment, useId } from "react";
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
import StopDays from "@/components/planner/StopDays";
import { NativeSelect } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ItemSectionKey, TripData, TeamOption } from "@/lib/types";
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
  daysTripId,
  currency,
  todayDate,
  onOpenItem,
  onAddPlan,
  onMoveItem,
  teams,
  teamId,
  teamName,
  userName,
  onSwitchTeam,
  onOpenSettings,
  onSelectTrip,
  onEditTrip,
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
  /** The stop whose days are open under it. */
  daysTripId: string | null;
  currency: string;
  todayDate: string;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  onAddPlan: (tripId: string, date: string | null) => void;
  onMoveItem: (itemId: string, date: string | null) => Promise<void>;
  teams: TeamOption[];
  teamId: string;
  teamName: string;
  userName: string;
  onSwitchTeam: (id: string) => void;
  onOpenSettings: () => void;
  /** Picks a stop: opens its days here and moves the calendar to it. */
  onSelectTrip: (t: TripData) => void;
  /** Opens the stop's drawer to edit it. */
  onEditTrip: (t: TripData) => void;
  onAddTrip: () => void;
  addingTrip: boolean;
  onDeleteTrip: (id: string, label: string) => void;
  onClose: () => void;
  showClose: boolean;
  todayLabel: string;
}) {
  const highlightId = useId();
  const overlayBox =
    "absolute bottom-3 left-[74px] top-3 z-panel w-[272px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  return (
    <aside aria-label="Trips" className={card + " p-5 " + positionClass}>
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="section-label">Your itinerary</p>
          <h2 className="panel-heading mt-1.5 break-words">{teamName}</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="-mr-2 -mt-2"
          onClick={showClose ? onClose : onOpenSettings}
          aria-label={showClose ? "Close trips" : "Trip settings"}
        >
          {showClose ? <X /> : <Settings2 />}
        </Button>
      </header>
      {showClose && (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mt-2 self-start"
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
        data-drag-scroll
        className="scroll-stable -mx-2 mt-5 min-h-0 space-y-0.5 overflow-y-auto overscroll-contain"
      >
        {trips.map((t) => (
          <Fragment key={t.id}>
          <div
            className={
              "list-row group relative isolate flex items-center gap-1 pr-1 " +
              (selectedTripId === t.id ? "hover:bg-transparent" : "")
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
              className="row-main flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pl-2 text-left"
            >
              {t.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photoUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
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
                <span className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-muted">
                  {fmtRange(t.start, t.end)}
                  {t.stay.some(isScheduled) && (
                    <Hotel size={12} role="img" aria-label="Stay scheduled" />
                  )}
                  {t.transport.some(isScheduled) && (
                    <Plane size={12} role="img" aria-label="Transport scheduled" />
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
                  className={
                    "focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 " +
                    (selectedTripId === t.id ? "opacity-100" : "opacity-0")
                  }
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => onEditTrip(t)}>
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
          {t.id === daysTripId && (
            <StopDays
              stop={t}
              currency={currency}
              todayDate={todayDate}
              onOpenItem={onOpenItem}
              onAddPlan={onAddPlan}
              onMoveItem={onMoveItem}
            />
          )}
          </Fragment>
        ))}
        {trips.length === 0 && (
          <p className="text-pretty px-2 py-4 text-sm leading-relaxed text-muted">
            Your next adventure starts with a stop.
          </p>
        )}
      </nav>
      <Button
        variant="outline"
        onClick={onAddTrip}
        disabled={addingTrip}
        className="mb-6 mt-3 w-full justify-start"
      >
        {addingTrip ? <Loader2 className="animate-spin" /> : <Plus />}
        {addingTrip ? "Adding stop…" : "Add stop"}
      </Button>
      <footer className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-line-soft pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink"
          >
            {initials(userName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink-soft">
              {userName}
            </span>
            <span className="block truncate text-xs tabular-nums text-muted">
              {trips.length} {trips.length === 1 ? "stop" : "stops"} ·{" "}
              {todayLabel}
            </span>
          </span>
        </div>
        <form action={logout} className="shrink-0">
          <Button type="submit" variant="ghost" size="sm" className="-mr-2">
            Sign out
          </Button>
        </form>
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
