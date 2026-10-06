"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, GripVertical, Paperclip, Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemData, ItemSectionKey, TripData } from "@/lib/types";
import {
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
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Moves show at once and save in the background. Each one is dropped once
  // the server's data agrees with it, or undone if the save fails.
  const [moves, setMoves] = useState<Record<string, string | null>>({});
  useEffect(() => {
    setMoves((current) => {
      const next = { ...current };
      let changed = false;
      for (const item of [...stop.transport, ...stop.activities]) {
        if (item.id in next && next[item.id] === item.date) {
          delete next[item.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [stop]);

  const trip = useMemo(() => withMoves(stop, moves), [stop, moves]);
  const itinerary = itineraryFor(trip);
  const days = tripDays(trip);

  async function move(plan: Plan, to: Target) {
    const date = to === UNDATED ? null : to;
    const { id, t: title } = plan.item;
    setError(null);
    setMoves((m) => ({ ...m, [id]: date }));
    setStatus(`Moved ${title} to ${date ? fmtDay(date) : "No day yet"}`);
    try {
      await onMoveItem(id, date);
    } catch {
      setMoves((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      setStatus("");
      setError(`Couldn't move ${title}. Try again.`);
    }
  }

  /*
   * Dragging is done with pointer events on the handle rather than HTML drag
   * and drop, which phones don't support well. The handle has touch-action
   * none, so a drag on it never scrolls the list, and the rest of the row
   * still scrolls normally. A press that doesn't move opens the menu instead.
   */
  function startDrag(e: React.PointerEvent<HTMLButtonElement>, plan: Plan, from: Target) {
    if (e.button !== 0) return;
    // Radix opens the menu on press; it opens on release instead, if the
    // pointer didn't move.
    e.preventDefault();
    const scroller = e.currentTarget.closest<HTMLElement>("[data-drag-scroll]");
    const row = e.currentTarget.closest("li")?.getBoundingClientRect();
    if (!row) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const offsetX = startX - row.left;
    const offsetY = startY - row.top;
    let x = startX;
    let y = startY;
    let moved = false;
    let over: Target | null = null;
    let frame = 0;

    const hit = () =>
      (document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-drop]")?.dataset.drop as Target | undefined) ??
      null;
    const show = () =>
      setDrag({ plan, from, over, x: x - offsetX, y: y - offsetY, width: row.width });

    // Near the top or bottom edge of the list, scroll it, faster the closer
    // the pointer gets, so a plan can reach a day that is off screen.
    function scroll() {
      const box = scroller;
      if (box) {
        const r = box.getBoundingClientRect();
        const edge = 48;
        const dy =
          y < r.top + edge
            ? -Math.ceil((r.top + edge - y) / 4)
            : y > r.bottom - edge
              ? Math.ceil((y - (r.bottom - edge)) / 4)
              : 0;
        if (dy) {
          box.scrollTop += dy;
          over = hit();
          show();
        }
      }
      frame = requestAnimationFrame(scroll);
    }

    function onMove(ev: PointerEvent) {
      x = ev.clientX;
      y = ev.clientY;
      if (!moved) {
        if (Math.hypot(x - startX, y - startY) < 4) return;
        moved = true;
        document.body.style.userSelect = "none";
        frame = requestAnimationFrame(scroll);
      }
      over = hit();
      show();
    }

    function end(drop: boolean) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      setDrag(null);
      if (drop && over && over !== from) move(plan, over);
    }
    function onUp() {
      if (!moved) {
        end(false);
        setMenuFor(plan.item.id);
        return;
      }
      end(true);
    }
    const onCancel = () => end(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") end(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  }

  const rowProps = (from: Target) => ({
    currency,
    onOpenItem,
    days,
    from,
    dragging: drag?.plan.item.id ?? null,
    menuFor,
    setMenuFor,
    onGrab: startDrag,
    onMoveTo: move,
  });
  const dropClass = (target: Target) =>
    "-mx-1.5 rounded-lg px-1.5 py-1 transition-colors duration-150 " +
    (drag && drag.over === target && drag.from !== target ? "bg-accent-soft" : "");

  return (
    <div className="mb-2 ml-2 mt-1 space-y-1 border-l border-line pl-2">
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}

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

      {(itinerary.undated.length > 0 || drag) && (
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

      {drag && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-popover rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-soft shadow-overlay"
          style={{
            width: drag.width,
            transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
          }}
        >
          <span className="line-clamp-2 text-pretty">{drag.plan.item.t}</span>
        </div>
      )}
    </div>
  );
}

/** A drop target: a day of the stop, or no day at all. */
const UNDATED = "undated";
type Target = string;

type Drag = {
  plan: Plan;
  from: Target;
  over: Target | null;
  x: number;
  y: number;
  width: number;
};

function withMoves(trip: TripData, moves: Record<string, string | null>): TripData {
  const fix = (items: ItemData[]) =>
    items.map((item) =>
      item.id in moves
        ? { ...item, date: moves[item.id], time: moves[item.id] ? item.time : null }
        : item,
    );
  return { ...trip, transport: fix(trip.transport), activities: fix(trip.activities) };
}

function PlanList({
  plans,
  currency,
  onOpenItem,
  days,
  from,
  dragging,
  menuFor,
  setMenuFor,
  onGrab,
  onMoveTo,
}: {
  plans: Plan[];
  currency: string;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  days: string[];
  from: Target;
  dragging: string | null;
  menuFor: string | null;
  setMenuFor: (id: string | null) => void;
  onGrab: (e: React.PointerEvent<HTMLButtonElement>, plan: Plan, from: Target) => void;
  onMoveTo: (plan: Plan, to: Target) => void;
}) {
  return (
    <ul className="-mx-1.5">
      {plans.map((plan) => {
        const { item, key, trip } = plan;
        return (
          <li
            key={item.id}
            className={
              "list-row flex items-start pr-1 transition-opacity duration-150 " +
              (dragging === item.id ? "opacity-40" : "")
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
                  item.attachments.length > 0) && (
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
            <DropdownMenu
              open={menuFor === item.id}
              onOpenChange={(open) => setMenuFor(open ? item.id : null)}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${item.t} to another day`}
                  title="Drag to a day, or click to pick one"
                  className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-2 active:cursor-grabbing"
                  onPointerDown={(e) => onGrab(e, plan, from)}
                >
                  <GripVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">
                  Move to
                </p>
                {[...days, UNDATED].map((to) => (
                  <DropdownMenuItem
                    key={to}
                    disabled={to === from}
                    onSelect={() => onMoveTo(plan, to)}
                  >
                    <span className="flex-1 tabular-nums">
                      {to === UNDATED ? "No day yet" : fmtDay(to)}
                    </span>
                    {to === from && <Check aria-label="Current day" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
