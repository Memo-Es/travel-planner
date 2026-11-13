"use client";

import { ArrowUpRight, FileText } from "lucide-react";
import {
  fmtDay,
  fmtTimeRange,
  freeParts,
  itineraryFor,
  type Plan,
} from "@/lib/itinerary";
import { fmtRange, nightsBetween } from "@/lib/dates";
import type { TripData } from "@/lib/types";
import { StopIcon } from "@/components/planner/StopIcon";

/** A focused stop's own days, stacked one after another rather than as
 * calendar columns. A short stop (Hamburg, 2 nights) used to zoom the
 * Month/Week grid to its tightest built-in view, which still forced a full
 * calendar week of mostly-empty columns, each stretched to match whichever
 * day had the most planned. Here only the stop's own days render, each as
 * tall as its own content - a 2-event day doesn't inherit a 6-event day's
 * height - in one column, top to bottom in date order. A wrapping grid was
 * tried first and dropped: reading several cards per row breaks the
 * chronological thread a stop's days actually have, where a single stacked
 * column reads the same way the schedule itself does.
 *
 * Only for a focused stop: the general Month/2 weeks/Week views keep the
 * strict grid, since lining a day up under its weekday is what makes
 * scanning a whole trip's pattern work. */
export default function StopDayCards({
  trip,
  onOpenPlan,
}: {
  trip: TripData;
  onOpenPlan: (plan: Plan) => void;
}) {
  const { days } = itineraryFor(trip);
  return (
    <div className="scroll-stable scroll-quiet min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
      <div className="mx-auto flex max-w-xl flex-col gap-3.5 pb-3">
        {days.map(({ date, plans }) => (
          <DayCard key={date} date={date} plans={plans} onOpen={onOpenPlan} />
        ))}
      </div>
    </div>
  );
}

function DayCard({
  date,
  plans,
  onOpen,
}: {
  date: string;
  plans: Plan[];
  onOpen: (plan: Plan) => void;
}) {
  // Same "Free ..." wording StopPanel's own day tabs use: a fully open day
  // reads as "Free day"; a day with something planned but gaps left in it
  // names which parts are still free.
  const free = plans.length > 0 ? freeParts(plans) : null;
  return (
    <article className="rounded-2xl border border-line-soft p-3.5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {fmtDay(date)}
      </h3>
      {plans.length === 0 ? (
        <p className="text-pretty text-sm text-muted-2">Free day</p>
      ) : (
        <ul className="-mx-1.5">
          {plans.map((plan) => {
            const when = fmtTimeRange(plan.item.time, plan.item.endTime);
            return (
              <li key={plan.item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(plan)}
                  className="focus-inset flex w-full items-start gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-hover"
                >
                  {when && (
                    <span className="shrink-0 pt-px text-xs font-medium tabular-nums text-muted-2">
                      {when}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                    {plan.item.t}
                  </span>
                  {(plan.item.url || plan.item.attachments.length > 0) && (
                    <span className="mt-px flex shrink-0 items-center gap-1 text-muted-2">
                      {plan.item.url && (
                        <>
                          <ArrowUpRight className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">Has a booking link</span>
                        </>
                      )}
                      {plan.item.attachments.length > 0 && (
                        <>
                          <FileText className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">
                            {plan.item.attachments.length === 1
                              ? "Has an attachment"
                              : `Has ${plan.item.attachments.length} attachments`}
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {free && free.length > 0 && (
        <p className="mt-1 px-1.5 text-xs text-muted-2">
          Free {free.join(", ")}
        </p>
      )}
    </article>
  );
}

/** The header a focused stop replaces the Month/2 weeks/Week switcher with -
 * there's nothing to switch between once only one stop's days are shown. */
export function StopDayCardsHeader({
  trip,
  onClose,
}: {
  trip: TripData;
  onClose: () => void;
}) {
  const nights = nightsBetween(trip.start, trip.end);
  return (
    <div className="flex min-h-10 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary"
        >
          <StopIcon stop={trip} className="size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight text-ink">
            {trip.label}
          </h1>
          <p className="truncate text-sm tabular-nums text-muted-2">
            {fmtRange(trip.start, trip.end)} · {nights}{" "}
            {nights === 1 ? "night" : "nights"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="focus-inset shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
      >
        All stops
      </button>
    </div>
  );
}
