"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ItemData, TripData } from "@/lib/types";
import { fmtDay } from "@/lib/itinerary";

/** A drop target: a day of the stop ("YYYY-MM-DD"), or no day at all. */
export const UNDATED = "undated";
export type Target = string;

type Drag = {
  id: string;
  title: string;
  from: Target;
  over: Target | null;
  x: number;
  y: number;
  width: number;
};

/**
 * Moving a stop's plans between its days by dragging, shared by the stop's
 * days in the left panel and the activities in its drawer.
 *
 * Drop targets are elements with data-drop (a day, or UNDATED), the row being
 * dragged is the nearest data-drag-row, and the list that scrolls at its edges
 * is the nearest data-drag-scroll. It uses pointer events rather than HTML drag
 * and drop, which phones don't support well.
 *
 * A move shows at once (`trip` has it applied) and saves in the background
 * through onMoveItem. It is dropped once the server's data agrees, or undone
 * if the save fails.
 */
export function useDayDrag(
  stop: TripData,
  onMoveItem: (itemId: string, date: string | null) => Promise<void>,
) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  async function move(item: Pick<ItemData, "id" | "t">, to: Target) {
    const date = to === UNDATED ? null : to;
    setError(null);
    setMoves((m) => ({ ...m, [item.id]: date }));
    setStatus(`Moved ${item.t} to ${date ? fmtDay(date) : "No day yet"}`);
    try {
      await onMoveItem(item.id, date);
    } catch {
      setMoves((m) => {
        const next = { ...m };
        delete next[item.id];
        return next;
      });
      setStatus("");
      setError(`Couldn't move ${item.t}. Try again.`);
    }
  }

  /**
   * Starts a drag from a pointer press. From a grip handle, a press that
   * doesn't move opens its "Move to" menu instead. From a whole card
   * (`card`), only a mouse drags, and only from a spot that isn't a control,
   * so the card's buttons and links keep working and a finger still scrolls.
   */
  function start(
    e: React.PointerEvent<HTMLElement>,
    item: Pick<ItemData, "id" | "t">,
    from: Target,
    card = false,
  ) {
    if (e.button !== 0) return;
    if (card) {
      if (e.pointerType !== "mouse") return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, select, textarea, [role=menuitem]"))
        return;
    }
    // Radix opens a menu on press; from a handle it opens on release instead,
    // if the pointer didn't move. On a card this also stops text selecting.
    e.preventDefault();
    const scroller = e.currentTarget.closest<HTMLElement>("[data-drag-scroll]");
    const row = e.currentTarget
      .closest<HTMLElement>("[data-drag-row]")
      ?.getBoundingClientRect();
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
        ?.closest<HTMLElement>("[data-drop]")?.dataset.drop as
        | Target
        | undefined) ?? null;
    const show = () =>
      setDrag({
        id: item.id,
        title: item.t,
        from,
        over,
        x: x - offsetX,
        y: y - offsetY,
        width: row.width,
      });

    // Near the top or bottom edge of the list, scroll it, faster the closer
    // the pointer gets, so a plan can reach a day that is off screen.
    function scroll() {
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        const edge = 48;
        const dy =
          y < r.top + edge
            ? -Math.ceil((r.top + edge - y) / 4)
            : y > r.bottom - edge
              ? Math.ceil((y - (r.bottom - edge)) / 4)
              : 0;
        if (dy) {
          scroller.scrollTop += dy;
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
      window.removeEventListener("keydown", onKey, true);
      cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      setDrag(null);
      if (drop && over && over !== from) move(item, over);
    }
    function onUp() {
      if (!moved) {
        end(false);
        if (!card) setMenuFor(item.id);
        return;
      }
      end(true);
    }
    const onCancel = () => end(false);
    // Captured on the window, so Escape cancels the drag before a dialog
    // around it sees the key and closes.
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      end(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  }

  /** Whether a drop target is the one under the pointer. */
  const isOver = (target: Target) =>
    !!drag && drag.over === target && drag.from !== target;

  // In a portal, so a transformed ancestor (an animated drawer) can't shift
  // where the fixed ghost lands.
  const ghost: ReactNode =
    drag && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-popover rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink-soft shadow-overlay"
            style={{
              width: drag.width,
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
            }}
          >
            <span className="line-clamp-2 text-pretty">{drag.title}</span>
          </div>,
          document.body,
        )
      : null;

  return {
    trip,
    dragging: drag?.id ?? null,
    dragActive: !!drag,
    isOver,
    start,
    move,
    menuFor,
    setMenuFor,
    status,
    error,
    ghost,
  };
}

function withMoves(
  trip: TripData,
  moves: Record<string, string | null>,
): TripData {
  const fix = (items: ItemData[]) =>
    items.map((item) =>
      item.id in moves
        ? {
            ...item,
            date: moves[item.id],
            time: moves[item.id] ? item.time : null,
          }
        : item,
    );
  return {
    ...trip,
    transport: fix(trip.transport),
    activities: fix(trip.activities),
  };
}

/**
 * The grip on a plan: drag it onto a day, or press it (or Enter on it) for a
 * "Move to" menu listing the stop's days, which is the way in from a keyboard.
 */
export function MoveHandle({
  item,
  from,
  days,
  dd,
  className = "",
}: {
  item: Pick<ItemData, "id" | "t">;
  from: Target;
  days: string[];
  dd: ReturnType<typeof useDayDrag>;
  className?: string;
}) {
  return (
    <DropdownMenu
      open={dd.menuFor === item.id}
      onOpenChange={(open) => dd.setMenuFor(open ? item.id : null)}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Move ${item.t} to another day`}
          title="Drag to a day, or click to pick one"
          className={
            "shrink-0 cursor-grab touch-none text-muted-2 active:cursor-grabbing " +
            className
          }
          onPointerDown={(e) => dd.start(e, item, from)}
        >
          <GripVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">Move to</p>
        {[...days, UNDATED].map((to) => (
          <DropdownMenuItem
            key={to}
            disabled={to === from}
            onSelect={() => dd.move(item, to)}
          >
            <span className="flex-1 tabular-nums">
              {to === UNDATED ? "No day yet" : fmtDay(to)}
            </span>
            {to === from && <Check aria-label="Current day" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
