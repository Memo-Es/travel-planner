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
  ItemData,
  ItemSectionKey,
  MemberOption,
  TripData,
} from "@/lib/types";
import { SECTION_DEFS } from "@/lib/tripSections";
import { formatTotal } from "@/lib/currency";
import {
  computeBalances,
  hasPaidExpenses,
  settlements as settleUp,
} from "@/lib/balances";
import { cn } from "@/lib/utils";

type Filter = "all" | ItemSectionKey;
type Section = "stops" | "balance";

const EPS = 0.005;

export default function FinancePanel({
  card,
  overlay,
  isMobile,
  trips: allTrips,
  stop,
  currency,
  onOpenStop,
  onEditItem,
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
  /** The open stop, which narrows Finances to its bookings. */
  stop: TripData | null;
  currency: string;
  onOpenStop: (trip: TripData) => void;
  onEditItem: (key: ItemSectionKey, item: ItemData) => void;
  onAddExpense: () => void;
  canAddExpense: boolean;
  onClose: () => void;
  showClose: boolean;
  members: MemberOption[];
  currentUserId: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Section>("stops");
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
  const overlayBox =
    "absolute bottom-3 right-[74px] top-3 z-panel w-[320px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";
  const money = (value: number) => formatTotal(value, currency);

  const costed = (item: ItemData) => item.costAmount !== null;
  const sum = (items: ItemData[]) =>
    items.reduce((n, i) => n + (i.costAmount ?? 0), 0);
  const trips = stop ? [stop] : allTrips;
  const total = sum(
    trips.flatMap((t) => [...t.stay, ...t.transport, ...t.activities]),
  );
  const categories = SECTION_DEFS.map((sec) => {
    const items = trips.flatMap((t) => t[sec.key]).filter(costed);
    const value = sum(items);
    return {
      ...sec,
      count: items.length,
      total: value,
      share: total > 0 ? Math.round((value / total) * 100) : 0,
    };
  });
  const active =
    filter === "all" ? null : categories.find((c) => c.key === filter)!;
  const keys: ItemSectionKey[] = active
    ? [active.key]
    : ["stay", "transport", "activities"];
  const stops = trips
    .map((trip) => ({
      trip,
      subtotal: sum(keys.flatMap((k) => trip[k]).filter(costed)),
    }))
    .filter((s) => s.subtotal > 0);
  // With a stop open, its bookings take the place of the stop list.
  const expenses = stop
    ? keys.flatMap((key) =>
        stop[key].filter(costed).map((item) => ({ key, item })),
      )
    : [];
  const rows = stop
    ? expenses.map(({ key, item }) => ({
        id: item.id,
        label: item.t,
        detail: SECTION_DEFS.find((d) => d.key === key)!.name,
        value: item.costAmount ?? 0,
        onClick: () => onEditItem(key, item),
      }))
    : stops.map(({ trip, subtotal }) => ({
        id: trip.id,
        label: trip.label,
        detail: null,
        value: subtotal,
        onClick: () => onOpenStop(trip),
      }));

  // Who owes who is settled across the whole trip, not per stop.
  const showBalances = hasPaidExpenses(allTrips);
  const balances = showBalances ? computeBalances(allTrips, members) : [];
  const owed = showBalances ? settleUp(balances) : [];
  const mine = balances.find((b) => b.person.id === currentUserId)?.net ?? 0;
  const [balanceLabel, balanceTone] =
    mine > EPS
      ? ["You're owed", "text-task-green-ink"]
      : mine < -EPS
        ? ["You owe", "text-destructive"]
        : ["You're settled up", "text-ink"];
  // With nothing to settle there's no second card, so stops stay open.
  const section: Section = showBalances ? open : "stops";

  return (
    <aside aria-label="Finances" className={card + " p-5 " + positionClass}>
      <div className="scroll-stable scroll-quiet -mx-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div
            role="group"
            aria-label="Filter by category"
            className="no-scrollbar -mx-1 flex min-w-0 gap-0.5 overflow-x-auto px-1"
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
                      "relative isolate h-8 shrink-0 whitespace-nowrap rounded-full px-2.5 text-sm font-medium transition-colors duration-150",
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

        <header className="mt-6">
          <h2 className="text-sm font-medium text-ink">
            <TransitionText value={`${filter}-${stop?.id ?? ""}`}>
              {active
                ? `${active.name} spend${stop ? ` in ${stop.label}` : ""}`
                : stop
                  ? `Spent in ${stop.label}`
                  : "Total spent"}
            </TransitionText>
          </h2>
          <p
            className={cn(
              "mt-1 font-semibold tabular-nums text-ink",
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
          <p className="mt-2 text-pretty text-xs leading-relaxed tabular-nums text-muted-2">
            <TransitionText value={`${filter}-${stop?.id ?? ""}`}>
              {active
                ? `${active.count} ${active.count === 1 ? "expense" : "expenses"} · ${active.share}% of ${money(total)}`
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
            <h3>
              <button
                type="button"
                id={`${ids}-stops-head`}
                aria-expanded={section === "stops"}
                aria-controls={`${ids}-stops`}
                onClick={() => setOpen("stops")}
                className={cn(
                  "flex min-h-14 w-full items-center justify-between gap-3 rounded-[inherit] px-4 text-left text-sm font-medium transition-colors duration-150",
                  section === "stops" ? "text-ink" : "text-muted",
                )}
              >
                {stop ? "Expenses" : "Expenses by stop"}
                {showBalances && (
                  <span className="flex items-center gap-2.5">
                    {section !== "stops" && (
                      <span className="text-xs font-normal tabular-nums text-muted-2">
                        {rows.length}{" "}
                        {stop
                          ? rows.length === 1
                            ? "expense"
                            : "expenses"
                          : rows.length === 1
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
              <ul className="border-t border-dotted border-stone-300">
                <AnimatePresence initial={false}>
                  {rows.map((row) => (
                    <motion.li
                      key={row.id}
                      {...rowMotion}
                      className="-mx-2 overflow-hidden [&:last-child>div]:border-b-0"
                    >
                      <div className="mx-2 border-b border-dotted border-stone-300">
                        <button
                          type="button"
                          onClick={row.onClick}
                          className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3.5 text-left transition-colors duration-150 hover:bg-hover-2/60"
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
                  {rows.length === 0 && (
                    <motion.li
                      key="empty"
                      {...rowMotion}
                      className="overflow-hidden"
                    >
                      <p className="py-4 text-pretty text-xs leading-relaxed text-muted">
                        {active
                          ? `No ${active.name.toLowerCase()} costs yet.`
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
              <h3>
                <button
                  type="button"
                  id={`${ids}-balance-head`}
                  aria-expanded={section === "balance"}
                  aria-controls={`${ids}-balance`}
                  onClick={() => setOpen("balance")}
                  className="flex w-full items-center justify-between gap-3 rounded-[inherit] px-4 py-4 text-left"
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
                  settlements={owed}
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
