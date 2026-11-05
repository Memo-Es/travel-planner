"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AnimatedBackground,
} from "@/components/motion/primitives";
import { X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { NativeSelect } from "@/components/ui/input";
import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import { statusFor } from "@/lib/tripStatus";
import { AddRow } from "@/components/planner/AddRow";
import { StopIcon } from "@/components/planner/StopIcon";
import { logout } from "@/actions/team";
import { stopColor } from "@/lib/theme";

export default function LeftPanel({
  card,
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
  sampleOwnTeamId,
  demoMode,
  detail,
}: {
  card: string;
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
  /** On the sample trip: the user's own trip to switch to (null if none). */
  sampleOwnTeamId?: string | null;
  /** The public, unauthenticated tour: no one to sign out, so the footer
   * offers signing up instead. */
  demoMode?: boolean;
  /** The open stop's itinerary, shown beside the list. */
  detail: ReactNode;
}) {
  const highlightId = useId();
  const reduce = !!useReducedMotion();
  const positionClass = isMobile ? "flex-1 min-h-0" : "";

  // The whole itinerary, first arrival to last departure.
  const status = trips.length
    ? statusFor(
        trips.reduce((a, t) => (t.start < a ? t.start : a), trips[0].start),
        trips.reduce((a, t) => (t.end > a ? t.end : a), trips[0].end),
      )
    : null;

  return (
    <motion.aside
      aria-label="Trips"
      className={card + " !flex-row p-5 " + positionClass}
    >
      <div
        className={
          "flex min-h-0 flex-col " +
          (isMobile ? "flex-1" : "w-[232px] shrink-0")
        }
      >
        <header className="shrink-0">
          <div className="flex min-h-10 items-center justify-between gap-2">
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
          <h2 className="mt-3 text-balance break-words text-2xl font-semibold text-ink">
            {teamName}
          </h2>
          {status && (
            <p className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-medium tabular-nums text-ink">
              {status}
            </p>
          )}
          {sampleOwnTeamId !== undefined &&
            (sampleOwnTeamId ? (
              <button
                type="button"
                onClick={() => onSwitchTeam(sampleOwnTeamId)}
                className="focus-inset tap-target mt-2 flex w-full items-center justify-between gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm text-accent-ink transition-colors duration-150 hover:bg-accent-soft/70"
              >
                <span>Sample trip</span>
                <span className="font-medium">Start my own →</span>
              </button>
            ) : demoMode ? (
              <Link
                href="/signup"
                className="focus-inset tap-target mt-2 flex w-full items-center justify-between gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm text-accent-ink transition-colors duration-150 hover:bg-accent-soft/70"
              >
                <span>Sample trip</span>
                <span className="font-medium">Sign up →</span>
              </Link>
            ) : (
              <p className="mt-2 rounded-full bg-accent-soft px-4 py-2 text-center text-sm text-accent-ink">
                Sample trip
              </p>
            ))}
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
          className="scroll-stable scroll-quiet -mx-2 mt-5 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-2"
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
                    className="relative isolate -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl py-2.5 pl-2 pr-3 text-left focus-inset transition-colors duration-150 hover:bg-hover"
                  >
                    {selected && (
                      <AnimatedBackground
                        layoutId={highlightId}
                        className="bg-secondary"
                      />
                    )}
                    <span
                      className="flex size-8 shrink-0 items-center justify-center"
                      style={{ color: color.base }}
                    >
                      <StopIcon stop={t} className="size-6" />
                    </span>
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
          {/* The demo has nobody signed in to show, just the ways in. */}
          {!demoMode && (
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
          )}
          {demoMode ? (
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              <Button asChild variant="secondary">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          ) : (
            <form action={logout} className="shrink-0">
              <Button type="submit" variant="secondary" size="sm">
                Sign out
              </Button>
            </form>
          )}
        </footer>
      </div>

      <AnimatePresence initial={false}>
        {detail && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            className="ml-5 flex min-h-0 min-w-0 flex-1 flex-col border-l border-dotted border-stone-300 pl-5"
          >
            {detail}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
