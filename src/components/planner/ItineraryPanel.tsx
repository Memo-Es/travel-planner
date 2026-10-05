"use client";

import type { ReactNode } from "react";
import { CalendarPlus, Paperclip, Plane, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import type { ItemSectionKey, TripData } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import { fmtDay, freeParts, itineraryFor, type Plan } from "@/lib/itinerary";
import { formatCost } from "@/lib/currency";

export default function ItineraryPanel({
  card,
  overlay,
  isMobile,
  tabs,
  trips,
  tripId,
  currency,
  todayDate,
  onSelectTrip,
  onOpenItem,
  onAddPlan,
  onClose,
  showClose,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  /** Tabs switching between the right column's views. */
  tabs: ReactNode;
  trips: TripData[];
  tripId: string | null;
  currency: string;
  todayDate: string;
  onSelectTrip: (tripId: string) => void;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
  onAddPlan: (tripId: string, date: string | null) => void;
  onClose: () => void;
  showClose: boolean;
}) {
  const overlayBox =
    "absolute bottom-3 right-[74px] top-3 z-panel w-[272px] shadow-overlay";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";
  const trip = trips.find((t) => t.id === tripId) ?? null;
  const itinerary = trip ? itineraryFor(trip) : null;

  return (
    <aside aria-label="Itinerary" className={card + " p-5 " + positionClass}>
      <div className="flex shrink-0 items-center gap-2">
        <div className="min-w-0 flex-1">{tabs}</div>
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2"
            onClick={onClose}
            aria-label="Close itinerary"
          >
            <X />
          </Button>
        )}
      </div>

      {trips.length === 0 || !trip || !itinerary ? (
        <p className="mt-6 text-pretty text-sm leading-relaxed text-muted">
          Add a stop to start planning its days.
        </p>
      ) : (
        <>
          <label className="mt-5 block shrink-0 space-y-1.5">
            <span className="field-label">Stop</span>
            <NativeSelect
              value={trip.id}
              onChange={(e) => onSelectTrip(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} · {fmtRange(t.start, t.end)}
                </option>
              ))}
            </NativeSelect>
          </label>

          <div className="-mx-2 mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain border-t border-line-soft px-2 pb-2 pt-4">
            {itinerary.days.map(({ date, plans }) => {
              const free = freeParts(plans);
              const isToday = date === todayDate;
              return (
                <section key={date} aria-labelledby={`day-${date}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      id={`day-${date}`}
                      className="flex items-baseline gap-2 text-sm font-semibold text-ink"
                    >
                      {fmtDay(date)}
                      {isToday && (
                        <span className="text-xs font-medium text-accent-ink">
                          Today
                        </span>
                      )}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-2 size-8"
                      onClick={() => onAddPlan(trip.id, date)}
                      aria-label={`Add a plan on ${fmtDay(date)}`}
                      title="Add a plan"
                    >
                      <Plus />
                    </Button>
                  </div>
                  {plans.length === 0 ? (
                    <p className="mt-1 text-xs text-muted">
                      Nothing planned — a free day.
                    </p>
                  ) : (
                    <>
                      <PlanList
                        plans={plans}
                        currency={currency}
                        onOpenItem={onOpenItem}
                      />
                      {free && free.length > 0 && (
                        <p className="mt-1.5 text-xs text-muted">
                          Free {joinParts(free)}
                        </p>
                      )}
                    </>
                  )}
                </section>
              );
            })}

            {itinerary.undated.length > 0 && (
              <section aria-labelledby="day-undated">
                <h3
                  id="day-undated"
                  className="text-sm font-semibold text-ink"
                >
                  No day yet
                </h3>
                <p className="mt-0.5 text-xs text-muted">
                  Give these a day to see them on the calendar.
                </p>
                <PlanList
                  plans={itinerary.undated}
                  currency={currency}
                  onOpenItem={onOpenItem}
                />
              </section>
            )}
          </div>

          <div className="shrink-0 border-t border-line-soft pt-4">
            <Button className="w-full" onClick={() => onAddPlan(trip.id, null)}>
              <CalendarPlus />
              Add plan
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}

function PlanList({
  plans,
  currency,
  onOpenItem,
}: {
  plans: Plan[];
  currency: string;
  onOpenItem: (trip: TripData, key: ItemSectionKey, itemId: string) => void;
}) {
  return (
    <ul className="-mx-2 mt-1">
      {plans.map(({ item, key, trip }) => {
        const Icon = key === "transport" ? Plane : MapPin;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpenItem(trip, key, item.id)}
              className="list-row flex w-full items-start gap-3 px-2 py-2 text-left"
            >
              <span className="w-11 shrink-0 pt-px text-xs font-medium tabular-nums text-ink-soft">
                {item.time ?? "—"}
                <span className="sr-only">{item.time ? "" : "No time"}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-pretty text-sm leading-5 text-ink-soft">
                  {item.t}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                  <Icon className="size-3 shrink-0" aria-hidden="true" />
                  {key === "transport" ? "Transport" : "Activity"}
                  {item.costAmount !== null &&
                    ` · ${formatCost(item.costAmount, currency)}`}
                  {item.attachments.length > 0 && (
                    <Paperclip
                      className="size-3 shrink-0"
                      role="img"
                      aria-label={`${item.attachments.length} ${item.attachments.length === 1 ? "PDF" : "PDFs"}`}
                    />
                  )}
                </span>
              </span>
            </button>
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
