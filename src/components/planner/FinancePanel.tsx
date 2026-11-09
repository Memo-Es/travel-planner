"use client";

import { useEffect, useId, useState } from "react";
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
  // How the stop list is grouped, with no stop open: by stop (each one
  // totaled), by person (who fronted it, across every stop), or flat (every
  // expense, each with which stop and plan it's under) - a cost filed under
  // a stop or person nobody's looking at is otherwise invisible from here.
  const [groupBy, setGroupBy] = useState<"stop" | "person" | "flat">("stop");
  // A group's row expands in place to show its own expenses rather than
  // jumping the whole app over to a stop - Finances stays put.
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  // Opening a stop narrows Finances to it, same as the itinerary - but
  // Finances has its own back door, so looking at everything again doesn't
  // mean closing the stop you're looking at on the calendar. Resets
  // whenever the open stop itself changes, so a newly opened stop always
  // starts narrowed and this is never a stale override from the last one.
  const [allStops, setAllStops] = useState(false);
  useEffect(() => {
    setAllStops(false);
  }, [stop?.id]);
  const scopeStop = allStops ? null : stop;
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
  const money = (value: number) => formatTotal(value, currency);

  const trips = scopeStop ? [scopeStop] : allTrips;

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
  // With a stop open, its own expenses take the place of the group list.
  // With none open and the flat view on, every trip's does - same shape,
  // one more field for which stop and plan a row belongs to.
  const expenseRows = scopeStop ? rowsFor(scopeStop, keys) : [];
  const allExpenseRows = !scopeStop
    ? trips.flatMap((trip) => rowsFor(trip, keys))
    : [];
  const showGroupToggle = !scopeStop && allExpenseRows.length > 0;
  // A stop open always shows its own flat list; otherwise whichever
  // grouping is picked - "by stop" and "by person" both unfold into groups,
  // "flat" lists every expense on its own.
  const effectiveGroup: "stop" | "person" | "flat" = scopeStop
    ? "flat"
    : groupBy;
  // An expense is so often named straight after its plan ("Casa Bonay,
  // Eixample" booked as "Casa Bonay, Eixample") that showing the plan's own
  // title underneath just repeats the row's own bold title - worse than
  // useless once that title is long enough to wrap onto two lines, twice.
  // Only the part that adds information survives: the stop, when this row
  // spans several; the plan, only when it says something the title hadn't.
  const detailFor = (r: ExpenseRow, withStop: boolean): string | null => {
    const plan = r.item ? r.item.t : "Not on a plan";
    const samePlan = !!r.item && plan.trim() === r.expense.title.trim();
    if (!withStop) return samePlan ? null : plan;
    return samePlan ? r.trip.label : `${r.trip.label} · ${plan}`;
  };
  const rows = scopeStop
    ? expenseRows.map((r) => ({
        id: r.expense.id,
        label: r.expense.title,
        detail: detailFor(r, false),
        value: r.expense.amount,
        onClick: () => onEditExpense(r.trip, r.item, r.expense),
      }))
    : effectiveGroup === "flat"
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
    effectiveGroup === "stop"
      ? stops.map(({ trip, subtotal }) => ({
          id: trip.id,
          label: trip.label,
          subtotal,
          expenseRows: rowsFor(trip, keys),
        }))
      : [];
  // "By person": who fronted the money, across every stop in scope. Members
  // keep their usual order (the same one the "Paid by" picker offers), with
  // "Nobody yet" last; anyone who paid for nothing in scope is left out,
  // same as an empty stop would be.
  const personGroups =
    effectiveGroup === "person"
      ? (() => {
          const byId = new Map<string, ExpenseRow[]>();
          for (const r of allExpenseRows) {
            const id = r.expense.paidBy?.id ?? "";
            byId.set(id, [...(byId.get(id) ?? []), r]);
          }
          return [
            ...members.map((m) => ({ id: m.id, label: m.name })),
            { id: "", label: "Nobody yet" },
          ]
            .map(({ id, label }) => {
              const expenseRows = byId.get(id) ?? [];
              return { id, label, subtotal: sum(expenseRows), expenseRows };
            })
            .filter((g) => g.expenseRows.length > 0);
        })()
      : [];
  const groups = effectiveGroup === "stop" ? stopGroups : personGroups;
  const groupRowCount =
    effectiveGroup === "flat" ? rows.length : groups.length;

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
    <>
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-ink">
              <TransitionText value={`${filter}-${scopeStop?.id ?? ""}`}>
                {activeCat
                  ? `${activeCat.name} spend${scopeStop ? ` in ${scopeStop.label}` : ""}`
                  : scopeStop
                    ? `Spent in ${scopeStop.label}`
                    : "Total spent"}
              </TransitionText>
            </h2>
            {/* The itinerary's open stop narrows Finances the same way - but
                closing that narrowing shouldn't mean closing the stop, so
                it's a toggle in here rather than a reason to leave. */}
            {stop && (
              <button
                type="button"
                onClick={() => setAllStops((v) => !v)}
                className="shrink-0 text-xs font-medium text-muted-2 underline decoration-dotted underline-offset-2 transition-colors duration-150 hover:text-ink"
              >
                {allStops ? `${stop.label} only` : "All stops"}
              </button>
            )}
          </div>
          <p className="mt-1 text-pretty text-xs leading-relaxed tabular-nums text-muted-2">
            <TransitionText value={`${filter}-${scopeStop?.id ?? ""}`}>
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
                {effectiveGroup === "flat"
                  ? "Expenses"
                  : effectiveGroup === "stop"
                    ? "Expenses by stop"
                    : "Expenses by person"}
                {showBalances && (
                  <span className="flex items-center gap-2.5">
                    {section !== "stops" && (
                      <span className="text-xs font-normal tabular-nums text-muted-2">
                        {groupRowCount}{" "}
                        {effectiveGroup === "flat"
                          ? groupRowCount === 1
                            ? "expense"
                            : "expenses"
                          : effectiveGroup === "stop"
                            ? groupRowCount === 1
                              ? "stop"
                              : "stops"
                            : groupRowCount === 1
                              ? "person"
                              : "people"}
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
              {showGroupToggle && (
                <div
                  role="group"
                  aria-label="Group expenses by"
                  className="-mt-1 mb-2 flex gap-0.5"
                >
                  {(
                    [
                      ["flat", "All"],
                      ["stop", "By stop"],
                      ["person", "By person"],
                    ] as const
                  ).map(([key, label]) => {
                    const selected = groupBy === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setGroupBy(key)}
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
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              <ul>
                <AnimatePresence initial={false}>
                  {effectiveGroup === "flat" &&
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
                  {effectiveGroup !== "flat" &&
                    groups.map((group) => {
                      const expanded = expandedGroupId === group.id;
                      // A stop's own row already says which stop; a
                      // person's needs it, since their costs span every
                      // stop they paid on.
                      const withStop = effectiveGroup === "person";
                      return (
                        <motion.li
                          key={group.id}
                          {...rowMotion}
                          className="-mx-2 overflow-hidden"
                        >
                          <div className="mx-2">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedGroupId(expanded ? null : group.id)
                              }
                              className="focus-inset -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3.5 text-left transition-colors duration-150 hover:bg-hover-2/60"
                            >
                              <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold text-ink">
                                {group.label}
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
                            {/* A flat white plate, not another grey row: the
                                parent is already the grey surface, so a
                                child drawn the same way as every top-level
                                row read as one more row rather than
                                something nested inside it. */}
                            <AccordionBody open={expanded} className="pb-1.5">
                              <ul className="space-y-0.5 rounded-xl bg-white p-1">
                                {group.expenseRows.map((r) => {
                                  const detail = detailFor(r, withStop);
                                  return (
                                  <li key={r.expense.id}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onEditExpense(r.trip, r.item, r.expense)
                                      }
                                      className="focus-inset flex w-full items-center gap-3 rounded-lg py-2.5 px-2 text-left transition-colors duration-150 hover:bg-hover"
                                    >
                                      <span className="min-w-0 flex-1">
                                        <span className="line-clamp-2 break-words text-sm font-medium text-ink">
                                          {r.expense.title}
                                        </span>
                                        {detail && (
                                          <span className="block truncate text-xs text-muted-2">
                                            {detail}
                                          </span>
                                        )}
                                      </span>
                                      <AnimatedNumber
                                        value={r.expense.amount}
                                        format={money}
                                        className="shrink-0 text-sm text-muted-2"
                                      />
                                    </button>
                                  </li>
                                  );
                                })}
                                {group.expenseRows.length === 0 && (
                                  <li className="px-2 py-2.5 text-xs text-muted">
                                    No expenses yet.
                                  </li>
                                )}
                              </ul>
                            </AccordionBody>
                          </div>
                        </motion.li>
                      );
                    })}
                  {groupRowCount === 0 && (
                    <motion.li
                      key="empty"
                      {...rowMotion}
                      className="overflow-hidden"
                    >
                      <p className="py-4 text-pretty text-xs leading-relaxed text-muted">
                        {activeCat
                          ? `No ${activeCat.name.toLowerCase()} costs yet.`
                          : scopeStop
                            ? `Costs on ${scopeStop.label}'s bookings add up here.`
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
    </>
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
