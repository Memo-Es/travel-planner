"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Paperclip, Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ItemSectionKey, TripData } from "@/lib/types";
import { MoveHandle, UNDATED, useDayDrag, type Target } from "@/components/planner/useDayDrag";
import { Avatars } from "@/components/planner/Going";
import {
  dayShareText,
  fmtDay,
  freeParts,
  itineraryFor,
  tripDays,
  type Plan,
} from "@/lib/itinerary";
import { formatCost } from "@/lib/currency";

/**
 * A stop's days, shown under the stop in the left panel: its plans in time
 * order, free days, plans with no day yet, and a grip on each plan to drag it
 * onto another day (or tap for a "Move to" menu). The list that scrolls is the
 * nearest ancestor marked data-drag-scroll, which a drag scrolls at its edges.
 */
export default function StopDays({
  stop,
  currency,
  todayDate,
  onOpenItem,
  onAddPlan,
  onMoveItem,
}: {
  stop: TripData;
  currency: string;
  todayDate: string;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  onAddPlan: (tripId: string, date: string | null) => void;
  /** Puts a plan on another day of its stop, or on no day (null). */
  onMoveItem: (itemId: string, date: string | null) => Promise<void>;
}) {
  const dd = useDayDrag(stop, onMoveItem);
  const itinerary = itineraryFor(dd.trip);
  const days = tripDays(dd.trip);
  const rowProps = (from: Target) => ({ currency, onOpenItem, days, from, dd });
  const dropClass = (target: Target) =>
    "-mx-1.5 rounded-lg px-1.5 py-1 transition-colors duration-150 " +
    (dd.isOver(target) ? "bg-accent-soft" : "");

  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  async function copyDay(date: string, plans: Plan[]) {
    try {
      await navigator.clipboard.writeText(dayShareText(dd.trip, date, plans));
      setCopiedDate(date);
      setCopyStatus(`${fmtDay(date)} copied`);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedDate(null), 2000);
    } catch {
      setCopyStatus("Couldn't copy. Try again.");
    }
  }

  return (
    <div className="mb-2 ml-2 mt-1 space-y-1 border-l border-line pl-2 pr-1.5">
      <p className="sr-only" role="status" aria-live="polite">
        {dd.status}
      </p>
      {dd.error && (
        <p role="alert" className="field-error">
          {dd.error}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {copyStatus}
      </p>

      {itinerary.days.map(({ date, plans }) => {
        const free = freeParts(plans);
        return (
          <section
            key={date}
            aria-labelledby={`day-${stop.id}-${date}`}
            data-drop={date}
            className={dropClass(date)}
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id={`day-${stop.id}-${date}`}
                className="flex items-baseline gap-1.5 text-xs font-semibold tabular-nums text-ink"
              >
                {fmtDay(date)}
                {date === todayDate && (
                  <span className="font-medium text-accent-ink">Today</span>
                )}
                {plans.length === 0 && (
                  <span className="font-normal text-muted">· Free</span>
                )}
              </h3>
              <div className="flex items-center gap-0.5">
                {plans.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyDay(date, plans)}
                    aria-label={
                      copiedDate === date
                        ? `${fmtDay(date)} copied`
                        : `Copy ${fmtDay(date)} as text`
                    }
                    title="Copy as text"
                  >
                    {copiedDate === date ? <Check /> : <Copy />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-1.5"
                  onClick={() => onAddPlan(stop.id, date)}
                  aria-label={`Add a plan on ${fmtDay(date)}`}
                  title="Add a plan"
                >
                  <Plus />
                </Button>
              </div>
            </div>
            {plans.length > 0 && (
              <>
                <PlanList plans={plans} {...rowProps(date)} />
                {free && free.length > 0 && (
                  <p className="pb-1 text-xs text-muted">
                    Free {joinParts(free)}
                  </p>
                )}
              </>
            )}
          </section>
        );
      })}

      {(itinerary.undated.length > 0 || dd.dragActive) && (
        <section
          aria-labelledby={`day-${stop.id}-undated`}
          data-drop={UNDATED}
          className={dropClass(UNDATED)}
        >
          <h3
            id={`day-${stop.id}-undated`}
            className="pt-1 text-xs font-semibold text-ink"
          >
            No day yet
          </h3>
          <p className="mt-0.5 text-xs text-muted">
            {itinerary.undated.length > 0
              ? "Drag these onto a day."
              : "Drop a plan here to take it off its day."}
          </p>
          <PlanList plans={itinerary.undated} {...rowProps(UNDATED)} />
        </section>
      )}

      {dd.ghost}
    </div>
  );
}

function PlanList({
  plans,
  currency,
  onOpenItem,
  days,
  from,
  dd,
}: {
  plans: Plan[];
  currency: string;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  days: string[];
  from: Target;
  dd: ReturnType<typeof useDayDrag>;
}) {
  return (
    <ul className="-mx-1.5">
      {plans.map((plan) => {
        const { item, key, trip } = plan;
        return (
          <li
            key={item.id}
            data-drag-row
            className={
              "list-row flex items-start pr-1 transition-opacity duration-150 " +
              (dd.dragging === item.id ? "opacity-40" : "")
            }
          >
            <button
              type="button"
              onClick={() => onOpenItem(trip, key, item.id)}
              className="row-main flex min-w-0 flex-1 items-start rounded-lg py-1.5 pl-1.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-pretty text-sm leading-5 text-ink-soft">
                  {item.t}
                </span>
                {(item.time ||
                  key === "transport" ||
                  item.costAmount !== null ||
                  item.attachments.length > 0 ||
                  item.going.length > 0) && (
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  {item.time && (
                    <span className="font-medium tabular-nums text-ink-soft">
                      {item.time}
                    </span>
                  )}
                  {key === "transport" && (
                    <Plane className="size-3 shrink-0" role="img" aria-label="Transport" />
                  )}
                  {item.costAmount !== null && (
                    <span className="tabular-nums">
                      {formatCost(item.costAmount, currency)}
                    </span>
                  )}
                  {item.going.length > 0 && (
                    <Avatars people={item.going} size="sm" />
                  )}
                  {item.attachments.length > 0 && (
                    <Paperclip
                      className="size-3 shrink-0"
                      role="img"
                      aria-label={`${item.attachments.length} ${item.attachments.length === 1 ? "PDF" : "PDFs"}`}
                    />
                  )}
                </span>
                )}
              </span>
            </button>
            <MoveHandle item={item} from={from} days={days} dd={dd} className="mt-0.5" />
          </li>
        );
      })}
    </ul>
  );
}

function joinParts(parts: string[]): string {
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
