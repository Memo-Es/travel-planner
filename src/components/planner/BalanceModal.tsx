"use client";

import { useMemo, useState } from "react";
import { X, Check } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type Row = {
  item: ItemData;
  trip: TripData;
  section: ItemSectionKey;
  /** What the selected person pays, or the full cost when viewing everyone. */
  amount: number;
};

/** What `personId` pays for an item; with no person, the item's full cost.
 * Bookings nobody was assigned to only count toward the group total. */
function amountFor(item: ItemData, personId: string | null): number {
  if (personId === null) return item.costAmount ?? 0;
  if (!item.shareIds.includes(personId)) return 0;
  return perPersonCost(item) ?? 0;
}

export default function BalanceModal({
  trips,
  members,
  currentUserId,
  currency,
  onClose,
}: {
  trips: TripData[];
  members: MemberOption[];
  currentUserId: string;
  currency: string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<ItemSectionKey | "all">("all");
  const [personId, setPersonId] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string>("all");

  const scopedTrips = useMemo(
    () => (tripId === "all" ? trips : trips.filter((t) => t.id === tripId)),
    [trips, tripId],
  );

  const rows: Row[] = useMemo(
    () =>
      scopedTrips
        .flatMap((trip) =>
          SECTION_DEFS.filter(
            (sec) => category === "all" || sec.key === category,
          ).flatMap((sec) =>
            trip[sec.key].map((item) => ({
              item,
              trip,
              section: sec.key,
              amount: amountFor(item, personId),
            })),
          ),
        )
        .filter((row) => row.amount > 0),
    [scopedTrips, category, personId],
  );

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const personName = (id: string) =>
    id === currentUserId
      ? "You"
      : (members.find((m) => m.id === id)?.name ?? "Former teammate");
  const categoryName =
    category === "all"
      ? "everything"
      : SECTION_DEFS.find((s) => s.key === category)!.name.toLowerCase();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("close-balance")?.focus();
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-5">
          <div>
            <DialogTitle>Balance</DialogTitle>
            <DialogDescription className="mt-1">
              See what was spent by category, person and stop.
            </DialogDescription>
          </div>
          <Button
            id="close-balance"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close balance"
          >
            <X />
          </Button>
        </header>

        <div className="-mx-1 max-h-[calc(90dvh-8rem)] min-h-0 space-y-6 overflow-y-auto px-1 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="flex flex-wrap gap-2">
              {(["all", ...SECTION_DEFS.map((s) => s.key)] as const).map(
                (key) => {
                  const on = category === key;
                  const Icon = key === "all" ? null : SECTION_ICONS[key];
                  const label =
                    key === "all"
                      ? "All"
                      : SECTION_DEFS.find((s) => s.key === key)!.name;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={on ? "default" : "outline"}
                      aria-pressed={on}
                      onClick={() => setCategory(key)}
                    >
                      {on ? <Check /> : Icon && <Icon />}
                      {label}
                    </Button>
                  );
                },
              )}
            </div>
          </fieldset>

          <div className="rounded-xl border border-line bg-secondary/50 p-4">
            <p className="text-xs text-muted">
              {personId === null
                ? "Group total"
                : `${personName(personId)} ${personId === currentUserId ? "pay" : "pays"}`}{" "}
              · {categoryName}
              {tripId !== "all" &&
                ` · ${trips.find((t) => t.id === tripId)?.label}`}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber
                value={total}
                format={(value) => formatTotal(value, currency)}
              />
            </p>
          </div>

          <section className="space-y-3" aria-labelledby="balance-table">
            <h3 id="balance-table" className="text-sm font-semibold">
              By category and person
            </h3>
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line-soft text-xs text-muted">
                    <th scope="col" className="px-3 py-2 text-left font-medium">
                      Category
                    </th>
                    {members.map((m) => (
                      <th
                        key={m.id}
                        scope="col"
                        className="px-3 py-2 text-right font-medium"
                      >
                        {m.id === currentUserId ? "You" : m.name}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Group
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SECTION_DEFS.map((sec) => {
                    const items = scopedTrips.flatMap((t) => t[sec.key]);
                    const selectedRow = category === sec.key;
                    return (
                      <tr
                        key={sec.key}
                        className={
                          "border-b border-line-soft last:border-0 " +
                          (selectedRow ? "bg-accent-soft/60" : "")
                        }
                      >
                        <th
                          scope="row"
                          className="px-3 py-2 text-left font-medium"
                        >
                          {sec.name}
                        </th>
                        {members.map((m) => (
                          <td
                            key={m.id}
                            className={
                              "px-3 py-2 text-right " +
                              (personId === m.id ? "font-semibold" : "")
                            }
                          >
                            {formatTotal(
                              items.reduce(
                                (sum, item) => sum + amountFor(item, m.id),
                                0,
                              ),
                              currency,
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right text-muted">
                          {formatTotal(
                            items.reduce(
                              (sum, item) => sum + amountFor(item, null),
                              0,
                            ),
                            currency,
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 pb-1" aria-labelledby="balance-items">
            <h3 id="balance-items" className="text-sm font-semibold">
              Bookings
              <span className="ml-2 font-normal text-muted">{rows.length}</span>
            </h3>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-muted">
                Nothing spent here yet.
              </p>
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
                          <span className="block truncate text-sm font-medium">
                            {item.t}
                          </span>
                          <span className="block text-xs text-muted">
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
      </DialogContent>
    </Dialog>
  );
}
