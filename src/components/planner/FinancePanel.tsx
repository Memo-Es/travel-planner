"use client";

import { Hotel, MapPin, Paperclip, Plane, Plus, Wallet, X } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import type { ItemData, ItemSectionKey, TripData } from "@/lib/types";
import { SECTION_DEFS, sectionTotal } from "@/lib/tripSections";
import { formatTotal } from "@/lib/currency";

const SECTION_ICON = { stay: Hotel, transport: Plane, activities: MapPin };
// One hue, three strengths: the breakdown bar stays a single accent.
const SECTION_SWATCH = {
  stay: "bg-accent-ink",
  transport: "bg-accent",
  activities: "bg-accent-muted",
};
const EMPTY_LABEL = {
  stay: "No stays yet",
  transport: "No transport yet",
  activities: "No activities yet",
};

type Row = { trip: TripData; item: ItemData };

export default function FinancePanel({
  card,
  overlay,
  isMobile,
  trips,
  currency,
  total,
  onOpenItem,
  onAddExpense,
  canAddExpense,
  onClose,
  showClose,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  trips: TripData[];
  currency: string;
  total: number;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  onAddExpense: () => void;
  canAddExpense: boolean;
  onClose: () => void;
  showClose: boolean;
}) {
  const overlayBox =
    "absolute bottom-3 right-[74px] top-3 z-panel w-[272px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";
  const money = (value: number) => formatTotal(value, currency);

  const groups = SECTION_DEFS.map((sec) => {
    const rows: Row[] = trips.flatMap((trip) =>
      trip[sec.key].map((item) => ({ trip, item })),
    );
    return {
      ...sec,
      rows,
      total: sectionTotal(rows.map((r) => r.item)),
    };
  });
  const bookings = groups.reduce((n, g) => n + g.rows.length, 0);
  const uncosted = groups.reduce(
    (n, g) => n + g.rows.filter((r) => r.item.costAmount === null).length,
    0,
  );

  return (
    <aside aria-label="Finances" className={card + " p-5 " + positionClass}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Wallet className="size-4 text-task-green-ink" />
          <h2 className="panel-heading">Finances</h2>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close finances"
          >
            <X />
          </Button>
        )}
      </div>

      <div className="shrink-0 border-b border-line-soft pb-5">
        <p className="field-label">Total planned</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">
          <AnimatedNumber value={total} format={money} />
        </p>
        <p className="mt-1 text-xs tabular-nums text-muted">
          {bookings} {bookings === 1 ? "booking" : "bookings"}
          {uncosted > 0 && ` · ${uncosted} without a cost`}
        </p>
        {total > 0 && (
          <div
            aria-hidden="true"
            className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-secondary"
          >
            {groups.map(
              (g) =>
                g.total > 0 && (
                  <span
                    key={g.key}
                    className={SECTION_SWATCH[g.key]}
                    style={{ width: `${(g.total / total) * 100}%` }}
                  />
                ),
            )}
          </div>
        )}
      </div>

      <div className="-mx-2 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 py-5">
        {groups.map((g) => {
          const Icon = SECTION_ICON[g.key];
          const share = total > 0 ? Math.round((g.total / total) * 100) : 0;
          return (
            <section key={g.key} aria-labelledby={`finance-${g.key}`}>
              <div className="mb-1 flex items-center justify-between gap-2 px-1">
                <h3
                  id={`finance-${g.key}`}
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink"
                >
                  <span
                    aria-hidden="true"
                    className={"size-2 shrink-0 rounded-full " + SECTION_SWATCH[g.key]}
                  />
                  <Icon className="size-4 shrink-0 text-muted" />
                  {g.name}
                  <span className="font-normal tabular-nums text-muted">
                    {g.rows.length}
                  </span>
                </h3>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  {money(g.total)}
                  {share > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-muted">
                      {share}%
                    </span>
                  )}
                </span>
              </div>
              {g.rows.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted">{EMPTY_LABEL[g.key]}</p>
              ) : (
                <ul className="space-y-0.5">
                  {g.rows.map(({ trip, item }) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onOpenItem(trip, g.key, item.id)}
                        className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors duration-150 hover:bg-hover"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink-soft">
                            {item.t}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <span className="truncate">{trip.label}</span>
                            {item.attachments.length > 0 && (
                              <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
                                <Paperclip
                                  className="size-3"
                                  role="img"
                                  aria-label={`${item.attachments.length} ${item.attachments.length === 1 ? "PDF" : "PDFs"}`}
                                />
                                <span aria-hidden="true">{item.attachments.length}</span>
                              </span>
                            )}
                          </span>
                        </span>
                        <span
                          className={
                            "shrink-0 text-sm tabular-nums " +
                            (item.costAmount === null ? "text-muted" : "font-medium text-ink-soft")
                          }
                        >
                          {item.costAmount === null ? "No cost" : money(item.costAmount)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-line-soft pt-4">
        <Button
          className="w-full"
          onClick={onAddExpense}
          disabled={!canAddExpense}
          aria-describedby={!canAddExpense ? "expense-needs-stop" : undefined}
        >
          <Plus />
          Add expense
        </Button>
        {!canAddExpense && (
          <p id="expense-needs-stop" className="mt-2 text-center text-xs text-muted">
            Add a stop first, then log its costs here.
          </p>
        )}
      </div>
    </aside>
  );
}
