"use client";

import { useId, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import {
  AnimatedBackground,
  AnimatedNumber,
  AccordionBody,
  TransitionText,
  accordionSpring,
} from "@/components/motion/primitives";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { SettleUpList } from "@/components/planner/SettleUpList";
import type {
  ExpenseData,
  ItemData,
  ItemSectionKey,
  MemberOption,
  TripData,
} from "@/lib/types";
import { SECTION_DEFS } from "@/lib/tripSections";
import { formatTotal } from "@/lib/currency";
import { hasPaidExpenses, relationshipsFor } from "@/lib/balances";
import { cn } from "@/lib/utils";

type Filter = "all" | ItemSectionKey;
type Section = "stops" | "balance";

/** One expense, with enough of where it lives to show and to edit it. */
type ExpenseRow = {
  trip: TripData;
  item: ItemData | null;
  expense: ExpenseData;
};

const EPS = 0.005;

export default function FinancePanel({
  card,
  isMobile,
  trips: allTrips,
  stop,
  currency,
  onEditExpense,
  onAddExpense,
  canAddExpense,
  onClose,
  showClose,
  members,
  currentUserId,
}: {
  card: string;
  isMobile: boolean;
  trips: TripData[];
  /** The open stop, which narrows Finances to its bookings. */
  stop: TripData | null;
  currency: string;
  onEditExpense: (
    trip: TripData,
    item: ItemData | null,
    expense: ExpenseData,
  ) => void;
  onAddExpense: () => void;
  canAddExpense: boolean;
  onClose: () => void;
  showClose: boolean;
  members: MemberOption[];
  currentUserId: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Section>("stops");
  // With no stop open, "by stop" only totals each one - a cost filed under
  // a stop nobody has opened is otherwise invisible from here. This lists
  // every expense across the whole trip instead, each one still opening
  // for editing.
  const [flat, setFlat] = useState(false);
  // A stop's row expands in place to show its own expenses rather than
  // jumping the whole app over to that stop - Finances stays put.
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const reduce = !!useReducedMotion();
  const spring = reduce ? { duration: 0 } : accordionSpring;
  // Stop rows enter and leave like accordion bodies when the filter changes.
  const rowMotion = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: reduce
      ? { duration: 0 }
      : {
          height: accordionSpring,
          opacity: { duration: 0.2, ease: "easeOut" as const },
        },
  };
  const ids = useId();
  const positionClass = isMobile ? "flex-1 min-h-0" : "";
  const money = (value: number) => formatTotal(value, currency);

  const trips = stop ? [stop] : allTrips;

  const active = filter === "all" ? null : filter;
  const keys: ItemSectionKey[] = active
    ? [active]
    : ["stay", "transport", "activities"];

  // Every expense in scope for a trip: its plans' own, across the given
  // sections, plus whatever isn't on a plan at all - and a loose cost has no
  // section to belong to, so it only ever shows up under "All".
  function rowsFor(trip: TripData, sections: ItemSectionKey[]): ExpenseRow[] {
    const fromItems = sections.flatMap((k) =>
      trip[k].flatMap((item) =>
        item.expenses.map((expense) => ({ trip, item, expense })),
      ),
    );
    const misc = active
      ? []
      : trip.miscExpenses.map((expense) => ({ trip, item: null, expense }));
    return [...fromItems, ...misc];
  }
  const sum = (rows: ExpenseRow[]) =>
    rows.reduce((n, r) => n + r.expense.amount, 0);

  const total = sum(trips.flatMap((t) => rowsFor(t, keys)));
  const categories = SECTION_DEFS.map((sec) => {
    const rows = trips.flatMap((t) => rowsFor(t, [sec.key]));
    const value = sum(rows);
    return {
      ...sec,
      count: rows.length,
      total: value,
      share: total > 0 ? Math.round((value / total) * 100) : 0,
    };
  });
  const stops = trips
    .map((trip) => ({ trip, subtotal: sum(rowsFor(trip, keys)) }))
    .filter((s) => s.subtotal > 0);
  // With a stop open, its own expenses take the place of the stop list.
  // With none open and the flat view on, every trip's does - same shape,
  // one more field for which stop and plan a row belongs to.
  const expenseRows = stop ? rowsFor(stop, keys) : [];
  const allExpenseRows = !stop
    ? trips.flatMap((trip) => rowsFor(trip, keys))
    : [];
  const showFlatToggle = !stop && stops.length > 1;
  const isFlatList = !!stop || flat;
  const detailFor = (r: ExpenseRow, withStop: boolean) => {
    const plan = r.item ? r.item.t : "Not on a plan";
    return withStop ? `${r.trip.label} · ${plan}` : plan;
  };
  const rows = stop
    ? expenseRows.map((r) => ({
        id: r.expense.id,
        label: r.expense.title,
        detail: detailFor(r, false),
        value: r.expense.amount,
        onClick: () => onEditExpense(r.trip, r.item, r.expense),
      }))
    : flat
      ? allExpenseRows.map((r) => ({
          id: r.expense.id,
          label: r.expense.title,
          detail: detailFor(r, true),
          value: r.expense.amount,
          onClick: () => onEditExpense(r.trip, r.item, r.expense),
        }))
      : [];
  // "By stop", unfolded: each stop carries its own expenses, shown inline
  // when that stop's row is toggled open rather than by navigating there.
  const stopGroups =
    !stop && !flat
      ? stops.map(({ trip, subtotal }) => ({
          trip,
          subtotal,
          expenseRows: rowsFor(trip, keys),
        }))
      : [];
  const stopRowCount = isFlatList ? rows.length : stopGroups.length;

  // Who owes who is settled across the whole trip, not per stop.
  const showBalances = hasPaidExpenses(allTrips);
  const relationships = showBalances
    ? relationshipsFor(allTrips, members, currentUserId)
    : [];
  const mine = relationships.reduce((n, r) => n + r.net, 0);
  const [balanceLabel, balanceTone] =
    mine > EPS
      ? ["You're owed", "text-task-green-ink"]
      : mine < -EPS
        ? ["You owe", "text-destructive"]
        : ["You're settled up", "text-ink"];
  // With nothing to settle there's no second card, so stops stay open.
  const section: Section = showBalances ? open : "stops";
  const activeCat = active ? categories.find((c) => c.key === active)! : null;

  return (
    <aside aria-label="Finances" className={card + " p-5 " + positionClass}>
      <div className="scroll-stable scroll-quiet -mx-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-2">
        <div className="flex min-h-10 items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Filter by category"
            className="no-scrollbar -m-1 flex min-w-0 gap-0.5 overflow-x-auto p-1"
          >
            {(["all", ...SECTION_DEFS.map((s) => s.key)] as Filter[]).map(
              (f) => {
                const selected = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "relative isolate h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 text-sm font-medium focus-inset tap-target transition-colors duration-150",
                      selected ? "text-ink" : "text-muted-2 hover:text-ink",
                    )}
                  >
                    {selected && (
                      <AnimatedBackground
                        layoutId={`${ids}-filter`}
                        className="bg-secondary"
                      />
                    )}
                    {f === "all"
                      ? "All"
                      : SECTION_DEFS.find((s) => s.key === f)!.name}
                  </button>
                );
              },
            )}
          </div>
          {showClose && (
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2"
              onClick={onClose}
              aria-label="Close finances"
            >
              <X />
            </Button>
          )}
        </div>

        {/* The amount is the headline, level with the trip name and the
            month beside it; what it's a total of sits underneath. */}
        <header className="mt-3">
          <p
            className={cn(
              "font-semibold leading-none tabular-nums text-ink",
              // Sized by the overall total, the biggest figure, so switching
              // categories doesn't resize it.
              money(total).length > 11 ? "text-3xl" : "text-4xl",
            )}
          >
            <AnimatedNumber
              value={activeCat ? activeCat.total : total}
              format={money}
            />
          </p>
          <h2 className="mt-2.5 text-sm font-medium text-ink">
            <TransitionText value={`${filter}-${stop?.id ?? ""}`}>
              {activeCat
                ? `${activeCat.name} spend${stop ? ` in ${stop.label}` : ""}`
                : stop
                  ? `Spent in ${stop.label}`
                  : "Total spent"}
            </TransitionText>
          </h2>
          <p className="mt-1 text-pretty text-xs leading-relaxed tabular-nums text-muted-2">
            <TransitionText value={`${filter}-${stop?.id ?? ""}`}>
              {activeCat
                ? `${activeCat.count} ${activeCat.count === 1 ? "expense" : "expenses"} · ${activeCat.share}% of ${money(total)}`
                : total > 0
                  ? categories
                      .filter((c) => c.total > 0)
                      .map((c) => `${c.name} ${c.share}%`)
                      .join(" · ")
                  : "No expenses yet"}
            </TransitionText>
          </p>
        </header>

        <div className="mt-6 space-y-3">
          {/* Expenses by stop */}
          <motion.section
            initial={false}
            animate={{ borderRadius: section === "stops" ? 16 : 28 }}
            transition={spring}
            className={cardClass(section === "stops")}
          >
            <h3 className="rounded-[inherit]">
              <button
                type="button"
                id={`${ids}-stops-head`}
                aria-expanded={section === "stops"}
                aria-controls={`${ids}-stops`}
                onClick={() => setOpen("stops")}
                className={cn(
                  "focus-inset flex min-h-14 w-full items-center justify-between gap-3 rounded-[inherit] px-4 text-left text-sm font-medium transition-colors duration-150",
                  section === "stops" ? "text-ink" : "text-muted",
                )}
              >
                {isFlatList ? "Expenses" : "Expenses by stop"}
                {showBalances && (
                  <span className="flex items-center gap-2.5">
                    {section !== "stops" && (
                      <span className="text-xs font-normal tabular-nums text-muted-2">
                        {stopRowCount}{" "}
                        {isFlatList
                          ? stopRowCount === 1
                            ? "expense"
                            : "expenses"
                          : stopRowCount === 1
                            ? "stop"
                            : "stops"}
                      </span>
                    )}
                    <SwapChip open={section === "stops"} />
                  </span>
                )}
              </button>
            </h3>
            <AccordionBody
              open={section === "stops"}
              id={`${ids}-stops`}
              labelledBy={`${ids}-stops-head`}
              className="px-4 pb-2"
            >
              {showFlatToggle && (
                <div
                  role="group"
                  aria-label="Group expenses by"
                  className="-mt-1 mb-2 flex gap-0.5"
                >
                  {([false, true] as const).map((v) => {
                    const selected = flat === v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFlat(v)}
                        className={cn(
                          "relative isolate h-7 shrink-0 rounded-full px-2.5 text-xs font-medium focus-inset tap-target transition-colors duration-150",
                          selected ? "text-ink" : "text-muted-2 hover:text-ink",
                        )}
                      >
                        {selected && (
                          <AnimatedBackground
                            layoutId={`${ids}-group`}
                            className="bg-secondary"
                          />
                        )}
                        {v ? "All expenses" : "By stop"}
                      </button>
                    );
                  })}
                </div>
              )}
              <ul>
                <AnimatePresence initial={false}>
                  {isFlatList &&
                    rows.map((row) => (
                      <motion.li
                        key={row.id}
                        {...rowMotion}
                        className="-mx-2 overflow-hidden"
                      >
                        <div className="mx-2">
                          <button
                            type="button"
                            onClick={row.onClick}
                            className="focus-inset -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors duration-150 hover:bg-hover-2/60"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 break-words text-sm font-semibold text-ink">
                                {row.label}
                              </span>
                              {row.detail && (
                                <span className="block truncate text-xs text-muted-2">
                                  {row.detail}
                                </span>
                              )}
                            </span>
                            <AnimatedNumber
                              value={row.value}
                              format={money}
                              className="shrink-0 text-sm text-muted-2"
                            />
                          </button>
                        </div>
                      </motion.li>
                    ))}
                  {!isFlatList &&
                    stopGroups.map((group) => {
                      const expanded = expandedStopId === group.trip.id;
                      return (
                        <motion.li
                          key={group.trip.id}
                          {...rowMotion}
                          className="-mx-2 overflow-hidden"
                        >
                          <div className="mx-2">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedStopId(expanded ? null : group.trip.id)
                              }
                              className="focus-inset -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors duration-150 hover:bg-hover-2/60"
                            >
                              <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold text-ink">
                                {group.trip.label}
                              </span>
                              <AnimatedNumber
                                value={group.subtotal}
                                format={money}
                                className="shrink-0 text-sm text-muted-2"
                              />
                              <ChevronDown
                                aria-hidden="true"
                                className={cn(
                                  "size-4 shrink-0 text-muted-2 transition-transform duration-150",
                                  expanded && "rotate-180",
                                )}
                              />
                            </button>
                            <AccordionBody open={expanded} className="pb-1.5">
                              <ul>
                                {group.expenseRows.map((r) => (
                                  <li key={r.expense.id}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onEditExpense(r.trip, r.item, r.expense)
                                      }
                                      className="focus-inset flex w-full items-center gap-3 rounded-xl py-3 pl-3 pr-1 text-left transition-colors duration-150 hover:bg-hover-2/60"
                                    >
                                      <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 break-words text-sm font-medium text-ink">
                                          {r.expense.title}
                                        </span>
                                        <span className="block truncate text-xs text-muted-2">
                                          {detailFor(r, false)}
                                        </span>
                                      </span>
                                      <AnimatedNumber
                                        value={r.expense.amount}
                                        format={money}
                                        className="shrink-0 text-sm text-muted-2"
                                      />
                                    </button>
                                  </li>
                                ))}
                                {group.expenseRows.length === 0 && (
                                  <li className="py-3 pl-3 text-xs text-muted">
                                    No expenses yet.
                                  </li>
                                )}
                              </ul>
                            </AccordionBody>
                          </div>
                        </motion.li>
                      );
                    })}
                  {stopRowCount === 0 && (
                    <motion.li
                      key="empty"
                      {...rowMotion}
                      className="overflow-hidden"
                    >
                      <p className="py-4 text-pretty text-xs leading-relaxed text-muted">
                        {activeCat
                          ? `No ${activeCat.name.toLowerCase()} costs yet.`
                          : stop
                            ? `Costs on ${stop.label}'s bookings add up here.`
                            : "Costs on stays, transport and activities add up here."}
                      </p>
                    </motion.li>
                  )}
                </AnimatePresence>
              </ul>
            </AccordionBody>
          </motion.section>

          {/* Who owes who, from the signed-in person's side */}
          {showBalances && (
            <section
              className={cn("rounded-2xl", cardClass(section === "balance"))}
            >
              <h3 className="rounded-[inherit]">
                <button
                  type="button"
                  id={`${ids}-balance-head`}
                  aria-expanded={section === "balance"}
                  aria-controls={`${ids}-balance`}
                  onClick={() => setOpen("balance")}
                  className="focus-inset flex w-full items-center justify-between gap-3 rounded-[inherit] px-4 py-4 text-left"
                >
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-sm font-medium transition-colors duration-150",
                        section === "balance" ? "text-ink" : "text-muted",
                      )}
                    >
                      {balanceLabel}
                    </span>
                    {Math.abs(mine) > EPS && (
                      <span
                        className={cn(
                          "mt-1 block text-2xl font-semibold tabular-nums",
                          balanceTone,
                        )}
                      >
                        {money(Math.abs(mine))}
                      </span>
                    )}
                  </span>
                  <SwapChip open={section === "balance"} />
                </button>
              </h3>
              <AccordionBody
                open={section === "balance"}
                id={`${ids}-balance`}
                labelledBy={`${ids}-balance-head`}
                className="px-4 pb-1"
              >
                <SettleUpList
                  relationships={relationships}
                  currency={currency}
                  currentUserId={currentUserId}
                />
              </AccordionBody>
            </section>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-4">
        <Button
          size="lg"
          className="w-full"
          onClick={() => onAddExpense()}
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

/** The open card reads as selected; the closed one tints on hover. */
function cardClass(open: boolean) {
  return cn(
    "transition-colors duration-150",
    open ? "bg-secondary" : "bg-secondary hover:bg-hover-2/70",
  );
}

/** Shown on the closed card, so it's clear it can be opened instead. */
function SwapChip({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-muted shadow-sm transition-[opacity,transform] duration-200 ease-out",
        open ? "scale-75 opacity-0" : "scale-100 opacity-100",
      )}
    >
      <ChevronDown className="size-4" />
    </span>
  );
}
