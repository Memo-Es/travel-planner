"use client";

import { useMemo, useState } from "react";
import { Check, Wallet } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import type {
  ItemData,
  ItemSectionKey,
  MemberOption,
  TripData,
} from "@/lib/types";
import { SECTION_DEFS, perPersonCost } from "@/lib/tripSections";
import { fmtDateTime } from "@/lib/dates";
import { formatTotal } from "@/lib/currency";
import { SECTION_ICONS } from "@/components/planner/sectionIcons";

type Category = ItemSectionKey | "all";

/** What `personId` pays for an item; with no person, the item's full cost.
 * Bookings nobody was assigned to only count toward the group total. */
function amountFor(item: ItemData, personId: string | null): number {
  if (personId === null) return item.costAmount ?? 0;
  if (!item.shareIds.includes(personId)) return 0;
  return perPersonCost(item) ?? 0;
}

function sum(items: ItemData[], personId: string | null): number {
  return items.reduce((total, item) => total + amountFor(item, personId), 0);
}

/** Spending filtered by category, person and stop. Sized to fit the
 * planner's right column as well as the full-width mobile tab. */
export default function BalanceView({
  trips,
  members,
  currentUserId,
  currency,
}: {
  trips: TripData[];
  members: MemberOption[];
  currentUserId: string;
  currency: string;
}) {
  const [category, setCategory] = useState<Category>("all");
  const [personId, setPersonId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string>("all");

  const scopedTrips = useMemo(
    () => (tripId === "all" ? trips : trips.filter((t) => t.id === tripId)),
    [trips, tripId],
  );
  const sections = SECTION_DEFS.filter(
    (sec) => category === "all" || sec.key === category,
  );
  const itemsIn = (keys: { key: ItemSectionKey }[]) =>
    scopedTrips.flatMap((t) => keys.flatMap((sec) => t[sec.key]));
  const filteredItems = itemsIn(sections);

  const rows = scopedTrips
    .flatMap((trip) =>
      sections.flatMap((sec) =>
        trip[sec.key].map((item) => ({
          item,
          trip,
          section: sec.key,
          amount: amountFor(item, personId),
        })),
      ),
    )
    .filter((row) => row.amount > 0);

  const total = sum(filteredItems, personId);
  const personName = (id: string) =>
    id === currentUserId
      ? "You"
      : (members.find((m) => m.id === id)?.name ?? "Former teammate");
  const categoryName =
    category === "all"
      ? "everything"
      : SECTION_DEFS.find((s) => s.key === category)!.name.toLowerCase();

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="field-label">Person</span>
          <NativeSelect
            value={personId ?? "all"}
            onChange={(e) =>
              setPersonId(e.target.value === "all" ? null : e.target.value)
            }
          >
            <option value="all">Everyone</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.name} (you)` : m.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="block space-y-2">
          <span className="field-label">Stop</span>
          <NativeSelect
            value={tripId}
            onChange={(e) => setTripId(e.target.value)}
          >
            <option value="all">All stops</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      <fieldset className="min-w-0">
        <legend className="field-label mb-2">Category</legend>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...SECTION_DEFS.map((s) => s.key)] as const).map((key) => {
            const on = category === key;
            const Icon = key === "all" ? null : SECTION_ICONS[key];
            return (
              <Button
                key={key}
                size="sm"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                onClick={() => setCategory(key)}
                className="px-2.5"
              >
                {on ? <Check /> : Icon && <Icon />}
                {key === "all"
                  ? "All"
                  : SECTION_DEFS.find((s) => s.key === key)!.name}
              </Button>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-xl border border-line bg-secondary/50 p-4">
        <p className="text-xs text-muted">
          {personId === null
            ? "Group total"
            : `${personName(personId)} ${personId === currentUserId ? "pay" : "pays"}`}{" "}
          · {categoryName}
          {tripId !== "all" && ` · ${trips.find((t) => t.id === tripId)?.label}`}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          <AnimatedNumber
            value={total}
            format={(value) => formatTotal(value, currency)}
          />
        </p>
      </div>

      <section className="space-y-2" aria-labelledby="balance-people">
        <h3 id="balance-people" className="text-sm font-semibold">
          By person
        </h3>
        <ul className="divide-y divide-line-soft rounded-xl border border-line bg-white px-3">
          {members.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setPersonId(personId === m.id ? null : m.id)}
                aria-pressed={personId === m.id}
                className={
                  "flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm " +
                  (personId === m.id ? "font-semibold text-accent-ink" : "")
                }
              >
                <span className="min-w-0 truncate">
                  {m.name}
                  {m.id === currentUserId && (
                    <span className="font-normal text-muted"> (you)</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatTotal(sum(filteredItems, m.id), currency)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2" aria-labelledby="balance-categories">
        <h3 id="balance-categories" className="text-sm font-semibold">
          By category
          {personId !== null && (
            <span className="font-normal text-muted">
              {" "}
              · {personName(personId)}
            </span>
          )}
        </h3>
        <ul className="divide-y divide-line-soft rounded-xl border border-line bg-white px-3">
          {SECTION_DEFS.map((sec) => {
            const Icon = SECTION_ICONS[sec.key];
            return (
              <li key={sec.key}>
                <button
                  onClick={() =>
                    setCategory(category === sec.key ? "all" : sec.key)
                  }
                  aria-pressed={category === sec.key}
                  className={
                    "flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm " +
                    (category === sec.key ? "font-semibold text-accent-ink" : "")
                  }
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-muted" />
                    {sec.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatTotal(sum(itemsIn([sec]), personId), currency)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-2" aria-labelledby="balance-items">
        <h3 id="balance-items" className="text-sm font-semibold">
          Bookings
          <span className="ml-2 font-normal text-muted">{rows.length}</span>
        </h3>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center">
            <Wallet className="mx-auto mb-2 size-5 text-muted" />
            <p className="text-xs leading-relaxed text-muted">
              Nothing spent here yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-white px-3">
            {rows.map(({ item, trip, section, amount }) => {
              const Icon = SECTION_ICONS[section];
              return (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <span className="flex min-w-0 items-start gap-2">
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-snug">
                        {item.t}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {trip.label}
                        {item.startsAt && ` · ${fmtDateTime(item.startsAt)}`}
                        {item.shareIds.length > 0 &&
                          ` · ${item.shareIds.map(personName).join(", ")}`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-medium tabular-nums">
                      {formatTotal(amount, currency)}
                    </span>
                    {personId !== null && item.shareIds.length > 1 && (
                      <span className="block text-xs tabular-nums text-muted">
                        of {formatTotal(item.costAmount ?? 0, currency)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
