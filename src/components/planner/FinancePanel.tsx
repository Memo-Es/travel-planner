"use client";

import { useId, useState } from "react";
import {
  BedDouble,
  Paperclip,
  Plus,
  Ticket,
  TrainFront,
  Wallet,
  X,
} from "lucide-react";
import {
  AnimatedBackground,
  AnimatedNumber,
} from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import BalanceCard from "@/components/planner/BalanceCard";
import type {
  ItemData,
  ItemSectionKey,
  MemberOption,
  TripData,
} from "@/lib/types";
import { SECTION_DEFS } from "@/lib/tripSections";
import { formatTotal } from "@/lib/currency";
import { firstName } from "@/lib/people";
import {
  computeBalances,
  hasPaidExpenses,
  settlements as settleUp,
} from "@/lib/balances";
import { cn } from "@/lib/utils";

const ICON = { stay: BedDouble, transport: TrainFront, activities: Ticket };

type Filter = "all" | ItemSectionKey;
type Line = { key: ItemSectionKey; item: ItemData };

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
  members,
  currentUserId,
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
  members: MemberOption[];
  currentUserId: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const segmentId = useId();
  const overlayBox =
    "absolute bottom-3 right-[74px] top-3 z-panel w-[320px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";
  const money = (value: number) => formatTotal(value, currency);

  const costed = (item: ItemData) => item.costAmount !== null;
  const categories = SECTION_DEFS.map((sec) => {
    const items = trips.flatMap((t) => t[sec.key]).filter(costed);
    const sum = items.reduce((n, i) => n + (i.costAmount ?? 0), 0);
    return {
      ...sec,
      count: items.length,
      total: sum,
      share: total > 0 ? Math.round((sum / total) * 100) : 0,
    };
  });
  const expenseCount = categories.reduce((n, c) => n + c.count, 0);
  const active =
    filter === "all" ? null : categories.find((c) => c.key === filter)!;

  // Expenses grouped by stop, in itinerary order.
  const keys: ItemSectionKey[] = active
    ? [active.key]
    : ["stay", "transport", "activities"];
  const groups = trips
    .map((trip) => {
      const lines: Line[] = keys.flatMap((key) =>
        trip[key].filter(costed).map((item) => ({ key, item })),
      );
      const subtotal = lines.reduce((n, l) => n + (l.item.costAmount ?? 0), 0);
      return { trip, lines, subtotal };
    })
    .filter((g) => g.lines.length > 0);

  const showBalances = hasPaidExpenses(trips);
  const balances = showBalances ? computeBalances(trips, members) : [];
  const owed = showBalances ? settleUp(balances) : [];
  const meta = (key: ItemSectionKey, item: ItemData) => {
    // The icon already names the category; the payer is the useful detail.
    if (!item.paidBy) return SECTION_DEFS.find((s) => s.key === key)!.name;
    const by =
      item.paidBy.id === currentUserId ? "you" : firstName(item.paidBy.name);
    return `Paid by ${by}`;
  };

  return (
    <aside aria-label="Finances" className={card + " p-5 " + positionClass}>
      <div className="scroll-stable -mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-ink">
              {active ? `${active.name} spend` : "Total spent"}
            </h2>
            <p
              className={cn(
                "mt-1 font-semibold tabular-nums text-ink",
                // Long currency strings step down so the figure never wraps.
                money(active ? active.total : total).length > 11
                  ? "text-3xl"
                  : "text-4xl",
              )}
            >
              <AnimatedNumber
                value={active ? active.total : total}
                format={money}
              />
            </p>
            <p className="mt-2 text-pretty text-xs leading-relaxed tabular-nums text-muted">
              {active
                ? `${active.count} ${active.count === 1 ? "expense" : "expenses"} · ${active.share}% of ${money(total)}`
                : total > 0
                  ? categories
                      .filter((c) => c.total > 0)
                      .map((c) => `${c.name} ${c.share}%`)
                      .join(" · ")
                  : `${expenseCount} expenses`}
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

        {showBalances && (
          <div className="mt-6">
            <BalanceCard
              balances={balances}
              settlements={owed}
              currency={currency}
              currentUserId={currentUserId}
            />
          </div>
        )}

        <div
          role="group"
          aria-label="Filter expenses by category"
          className="no-scrollbar -mx-1 mt-6 flex gap-0.5 overflow-x-auto px-1"
        >
          {(["all", ...SECTION_DEFS.map((s) => s.key)] as Filter[]).map((f) => {
            const selected = filter === f;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(f)}
                className={cn(
                  "relative isolate h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 text-sm font-medium transition-colors duration-150",
                  selected ? "text-ink" : "text-muted-2 hover:text-ink",
                )}
              >
                {selected && (
                  <AnimatedBackground
                    layoutId={segmentId}
                    className="bg-secondary"
                  />
                )}
                {f === "all"
                  ? "All"
                  : SECTION_DEFS.find((s) => s.key === f)!.name}
              </button>
            );
          })}
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-muted">
              <Wallet className="size-5" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">
              {active
                ? `No ${active.name.toLowerCase()} costs yet`
                : "No expenses yet"}
            </p>
            <p className="mt-1 text-pretty text-xs leading-relaxed text-muted">
              Costs on stays, transport and activities add up here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6 pb-2">
            {groups.map(({ trip, lines, subtotal }) => (
              <section key={trip.id} aria-labelledby={`spend-${trip.id}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3
                    id={`spend-${trip.id}`}
                    className="min-w-0 truncate text-sm font-semibold text-ink"
                  >
                    {trip.label}
                  </h3>
                  <span className="shrink-0 text-sm tabular-nums text-muted-2">
                    {money(subtotal)}
                  </span>
                </div>
                <ul className="mt-1 divide-y divide-dotted divide-stone-300">
                  {lines.map(({ key, item }) => {
                    const Icon = ICON[key];
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => onOpenItem(trip, key, item.id)}
                          className="list-row -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 px-2 py-3 text-left"
                        >
                          <Icon className="size-4 shrink-0 text-muted-2" />
                          <span className="min-w-0 flex-1">
                            <span
                              className="block truncate text-sm font-medium text-ink"
                              title={item.t}
                            >
                              {item.t}
                            </span>
                            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-2">
                              <span className="truncate">{meta(key, item)}</span>
                              {item.attachments.length > 0 && (
                                <Paperclip
                                  className="size-3 shrink-0"
                                  role="img"
                                  aria-label={`${item.attachments.length} ${item.attachments.length === 1 ? "PDF" : "PDFs"}`}
                                />
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-medium tabular-nums text-ink">
                            {money(item.costAmount!)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 pt-4">
        <Button
          size="lg"
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
