"use client";

import type { ReactNode } from "react";
import { ArrowRight, Paperclip, Plus, X } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import type {
  ItemData,
  ItemSectionKey,
  MemberOption,
  TripData,
} from "@/lib/types";
import { computeBalance } from "@/lib/balance";
import { SECTION_DEFS, sectionTotal } from "@/lib/tripSections";
import { formatTotal } from "@/lib/currency";

// One hue, three strengths: the breakdown bar stays a single accent.
const SECTION_SWATCH = {
  stay: "bg-accent-ink",
  transport: "bg-accent",
  activities: "bg-accent-muted",
};
const EMPTY_LABEL = {
  stay: "No stay costs yet",
  transport: "No transport costs yet",
  activities: "No activity costs yet",
};

type Row = { trip: TripData; item: ItemData };

export default function FinancePanel({
  card,
  overlay,
  isMobile,
  tabs,
  trips,
  members,
  currentUserId,
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
  /** Tabs switching between the right column's views. */
  tabs?: ReactNode;
  trips: TripData[];
  members: MemberOption[];
  currentUserId: string;
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
    const sum = sectionTotal(rows.map((r) => r.item));
    return {
      ...sec,
      rows,
      // Plans without a cost live in the itinerary; money stays here.
      costed: rows.filter((r) => r.item.costAmount !== null),
      total: sum,
      share: total > 0 ? Math.round((sum / total) * 100) : 0,
    };
  });
  const balance = computeBalance(trips, members);
  const nameOf = (id: string) =>
    members.find((m) => m.id === id)?.name ?? "A former teammate";
  // Each person only sees the settle-ups that involve them.
  const myTransfers = balance.transfers.filter(
    (t) => t.from === currentUserId || t.to === currentUserId,
  );
  const bookings = groups.reduce((n, g) => n + g.rows.length, 0);
  const uncosted = groups.reduce(
    (n, g) => n + g.rows.filter((r) => r.item.costAmount === null).length,
    0,
  );

  return (
    <aside aria-label="Finances" className={card + " p-5 " + positionClass}>
      {tabs && <div className="mb-5 shrink-0">{tabs}</div>}
      <header className="flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="section-label">Finances</p>
          <h2 className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">
            <AnimatedNumber value={total} format={money} />
          </h2>
          <p className="mt-1 text-xs tabular-nums text-muted">
            {bookings} {bookings === 1 ? "booking" : "bookings"}
            {uncosted > 0 && ` · ${uncosted} without a cost`}
          </p>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2"
            onClick={onClose}
            aria-label="Close finances"
          >
            <X />
          </Button>
        )}
      </header>

      {balance.total > 0 && (
        <section
          aria-labelledby="my-balance"
          className="mt-5 shrink-0 rounded-xl border border-line bg-secondary/60 p-3"
        >
          <h3 id="my-balance" className="section-label">
            Your balance
          </h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
            <div>
              <dt>Your share</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                {money(balance.spent.get(currentUserId) ?? 0)}
              </dd>
            </div>
            <div>
              <dt>You paid</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                {money(balance.paid.get(currentUserId) ?? 0)}
              </dd>
            </div>
          </dl>
          <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3 text-sm">
            {myTransfers.length === 0 ? (
              <li className="text-ink-soft">You&apos;re all settled up.</li>
            ) : (
              myTransfers.map((t) => (
                <li
                  key={`${t.from}-${t.to}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-ink-soft">
                    {t.from === currentUserId ? (
                      <>
                        You
                        <ArrowRight className="size-3.5 shrink-0 text-muted" aria-label="owe" />
                        <span className="truncate">{nameOf(t.to)}</span>
                      </>
                    ) : (
                      <>
                        <span className="truncate">{nameOf(t.from)}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted" aria-label="owes" />
                        you
                      </>
                    )}
                  </span>
                  <span
                    className={
                      "shrink-0 font-semibold tabular-nums " +
                      (t.from === currentUserId ? "text-ink" : "text-task-green-ink")
                    }
                  >
                    {money(t.amount)}
                  </span>
                </li>
              ))
            )}
          </ul>
          {balance.unpaidCount > 0 && (
            <p className="mt-2 text-pretty text-xs text-muted">
              {balance.unpaidCount}{" "}
              {balance.unpaidCount === 1 ? "cost has" : "costs have"} no payer
              yet, so {balance.unpaidCount === 1 ? "it isn't" : "they aren't"}{" "}
              in the settle-up.
            </p>
          )}
        </section>
      )}

      {total > 0 && (
        <div className="mt-5 shrink-0">
          <div
            aria-hidden="true"
            className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-secondary"
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
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {groups.map((g) => (
              <li key={g.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={"size-2 rounded-full " + SECTION_SWATCH[g.key]}
                />
                {g.name}
                <span className="tabular-nums text-ink-soft">{g.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="-mx-2 mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain border-t border-line-soft px-2 pb-2 pt-5">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`finance-${g.key}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3
                id={`finance-${g.key}`}
                className="flex min-w-0 items-baseline gap-1.5 text-sm font-semibold text-ink"
              >
                {g.name}
                <span className="text-xs font-normal tabular-nums text-muted">
                  {g.costed.length}
                </span>
              </h3>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                {money(g.total)}
              </span>
            </div>
            {g.costed.length === 0 ? (
              <p className="mt-2 text-xs text-muted">{EMPTY_LABEL[g.key]}</p>
            ) : (
              <ul className="-mx-2 mt-1.5">
                {g.costed.map(({ trip, item }) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onOpenItem(trip, g.key, item.id)}
                      className="list-row flex w-full items-center gap-3 px-2 py-2 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-soft">
                          {item.t}
                        </span>
                        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
                          <span className="truncate">{trip.label}</span>
                          {item.attachments.length > 0 && (
                            <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
                              <Paperclip
                                className="size-3"
                                role="img"
                                aria-label={`${item.attachments.length} ${item.attachments.length === 1 ? "PDF" : "PDFs"}`}
                              />
                              <span aria-hidden="true">
                                {item.attachments.length}
                              </span>
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-ink">
                        {money(item.costAmount!)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
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
          <p
            id="expense-needs-stop"
            className="mt-2 text-pretty text-center text-xs text-muted"
          >
            Add a stop first, then log its costs here.
          </p>
        )}
      </div>
    </aside>
  );
}
