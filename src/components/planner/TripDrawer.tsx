"use client";

import { AnimatedNumber, Disclosure } from "@/components/motion/primitives";
import { useState, type KeyboardEvent } from "react";
import {
  Plus,
  Trash2,
  X,
  Pencil,
  MoreHorizontal,
  ArrowUpRight,
  CalendarDays,
  Hotel,
  Plane,
  MapPin,
  Check,
} from "lucide-react";
import type { TripData, ItemSectionKey, ItemData } from "@/lib/types";
import { fmtRange, nightsBetween } from "@/lib/dates";
import {
  SECTION_DEFS,
  isScheduled,
  sectionTotal,
  hostFromUrl,
} from "@/lib/tripSections";
import { currencySymbol, formatCost, formatTotal } from "@/lib/currency";
import { STOP_COLORS } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Editing, FormState } from "@/components/Planner";

export default function TripDrawer({
  trip,
  currency,
  isMobile,
  editing,
  form,
  formError,
  saving,
  onFormChange,
  onClose,
  onStartAdd,
  onStartEdit,
  onCancelForm,
  onSaveForm,
  onDeleteItem,
  onUpdateDates,
  onRename,
  onChangeColor,
  onDeleteTrip,
}: {
  trip: TripData;
  currency: string;
  isMobile: boolean;
  editing: Editing;
  form: FormState;
  formError: string | null;
  saving: boolean;
  onFormChange: (f: FormState) => void;
  onClose: () => void;
  onStartAdd: (key: ItemSectionKey) => void;
  onStartEdit: (
    key: ItemSectionKey,
    itemId: string,
    current: FormState,
  ) => void;
  onCancelForm: () => void;
  onSaveForm: () => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateDates: (tripId: string, start: string, end: string) => void;
  onRename: (tripId: string, label: string) => void;
  onChangeColor: (tripId: string, color: string) => void;
  onDeleteTrip: (tripId: string, label: string) => void;
}) {
  const tripTotal =
    sectionTotal(trip.stay) +
    sectionTotal(trip.transport) +
    sectionTotal(trip.activities);
  const [editingDates, setEditingDates] = useState(false);
  const [startDraft, setStartDraft] = useState(trip.start);
  const [endDraft, setEndDraft] = useState(trip.end);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(trip.label);
  const datesValid = !!startDraft && !!endDraft && endDraft >= startDraft;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !saving) {
      e.preventDefault();
      onSaveForm();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancelForm();
    }
  }

  function saveLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== trip.label) onRename(trip.id, trimmed);
    setEditingLabel(false);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        placement={isMobile ? "bottom" : "right"}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("close-trip")?.focus();
        }}
      >
        <header className="trip-header flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-5">
          <div className="min-w-0 flex-1">
            <p className="section-label mb-2">Trip details</p>
            <DialogTitle className={editingLabel ? "sr-only" : "text-2xl"}>
              {trip.label}
            </DialogTitle>
            {editingLabel ? (
              <Input
                aria-label="Stop name"
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                autoFocus
                onBlur={saveLabel}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setEditingLabel(false);
                  }
                }}
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 mt-1 h-8 text-xs"
                onClick={() => {
                  setStartDraft(trip.start);
                  setEndDraft(trip.end);
                  setEditingDates(true);
                }}
              >
                <CalendarDays />
                {fmtRange(trip.start, trip.end)} ·{" "}
                {nightsBetween(trip.start, trip.end)} nights
              </Button>
            )}
            <DialogDescription className="sr-only">
              Manage dates and bookings for {trip.label}.
            </DialogDescription>
          </div>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Stop options">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    setLabelDraft(trip.label);
                    setEditingLabel(true);
                  }}
                >
                  <Pencil />
                  Rename stop
                </DropdownMenuItem>
                <DropdownMenuItem
                  destructive
                  onSelect={() => onDeleteTrip(trip.id, trip.label)}
                >
                  <Trash2 />
                  Delete stop
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              id="close-trip"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close trip details"
            >
              <X />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-1 py-5 -mx-1">
          {trip.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.photoUrl}
              alt=""
              className="h-32 w-full rounded-xl object-cover"
            />
          )}
          <Disclosure open={editingDates}>
            <div className="space-y-3 rounded-xl border border-line bg-secondary/50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="field-label">Arrival</span>
                  <Input
                    type="date"
                    value={startDraft}
                    onChange={(e) => setStartDraft(e.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="field-label">Departure</span>
                  <Input
                    type="date"
                    min={startDraft}
                    value={endDraft}
                    onChange={(e) => setEndDraft(e.target.value)}
                    aria-invalid={!datesValid}
                    aria-describedby={!datesValid ? "date-error" : undefined}
                  />
                </label>
              </div>
              {!datesValid && (
                <p id="date-error" className="field-error" role="alert">
                  Choose a departure on or after arrival.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDates(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!datesValid}
                  onClick={() => {
                    onUpdateDates(trip.id, startDraft, endDraft);
                    setEditingDates(false);
                  }}
                >
                  Save dates
                </Button>
              </div>
            </div>
          </Disclosure>
          <fieldset className="min-w-0">
            <legend className="field-label mb-2">Calendar color</legend>
            <div className="flex flex-wrap gap-1">
              {STOP_COLORS.map((c) => {
                const active = (trip.color ?? "violet") === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => onChangeColor(trip.id, c.id)}
                    aria-label={c.label}
                    aria-pressed={active}
                    title={c.label}
                    className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-hover"
                  >
                    <span
                      className="flex size-5 items-center justify-center rounded-full"
                      style={{
                        background: c.soft,
                        color: c.ink,
                        boxShadow: active
                          ? `0 0 0 2px white, 0 0 0 3px ${c.ink}`
                          : undefined,
                      }}
                    >
                      {active ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <span
                          className="size-2 rounded-full"
                          style={{ background: c.base }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {SECTION_DEFS.map((sec) => {
            const items: ItemData[] = trip[sec.key];
            const total = sectionTotal(items);
            const showForm = editing?.key === sec.key;
            const Icon =
              sec.key === "stay"
                ? Hotel
                : sec.key === "transport"
                  ? Plane
                  : MapPin;
            return (
              <section
                key={sec.key}
                className="space-y-3"
                aria-labelledby={`section-${sec.key}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id={`section-${sec.key}`}
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <Icon className="size-4 text-muted" />
                    {sec.name}
                    <span className="font-normal text-muted">
                      {items.length}
                    </span>
                  </h3>
                  {total > 0 && (
                    <span className="text-xs font-medium tabular-nums text-muted">
                      {formatTotal(total, currency)}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="booking-card rounded-xl border border-line bg-white p-3 shadow-panel hover:border-input"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          className="min-w-0 flex-1 rounded text-left text-sm font-medium leading-6 text-ink"
                          onClick={() =>
                            onStartEdit(sec.key, item.id, {
                              t: item.t,
                              url: item.url,
                              cost:
                                item.costAmount === null
                                  ? ""
                                  : String(item.costAmount),
                            })
                          }
                        >
                          {item.t}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="-mr-1 -mt-1"
                              aria-label={`Options for ${item.t}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() =>
                                onStartEdit(sec.key, item.id, {
                                  t: item.t,
                                  url: item.url,
                                  cost:
                                    item.costAmount === null
                                      ? ""
                                      : String(item.costAmount),
                                })
                              }
                            >
                              <Pencil />
                              Edit booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              destructive
                              onSelect={() => onDeleteItem(item.id)}
                            >
                              <Trash2 />
                              Remove booking
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-w-0 items-center gap-1 rounded text-xs hover:underline"
                          >
                            <span className="truncate">
                              {hostFromUrl(item.url)}
                            </span>
                            <ArrowUpRight className="size-3 shrink-0" />
                            <span className="sr-only">
                              {" "}
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted">
                            Booking link pending
                          </span>
                        )}
                        <span className="shrink-0 text-sm font-medium tabular-nums text-ink-soft">
                          {formatCost(item.costAmount, currency)}
                        </span>
                      </div>
                      <div className="mt-3">
                        <Badge
                          variant={isScheduled(item) ? "success" : "secondary"}
                        >
                          {isScheduled(item) && <Check className="size-3" />}
                          {isScheduled(item) ? "Scheduled" : "Incomplete"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && !showForm && (
                    <p className="rounded-xl border border-dashed border-line px-3 py-4 text-xs leading-relaxed text-muted">
                      No {sec.name.toLowerCase()} added yet.
                    </p>
                  )}
                </div>
                <Disclosure open={showForm}>
                  <div className="space-y-3 rounded-xl border border-line bg-secondary/50 p-4">
                    <label className="block space-y-2">
                      <span className="field-label">Name</span>
                      <Input
                        value={form.t}
                        onChange={(e) =>
                          onFormChange({ ...form, t: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder={sec.placeholder}
                        autoFocus
                        aria-invalid={!!formError?.startsWith("Name")}
                        aria-describedby={
                          formError ? "booking-error" : undefined
                        }
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="field-label">Booking link</span>
                      <Input
                        value={form.url}
                        onChange={(e) =>
                          onFormChange({ ...form, url: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="https://…"
                        inputMode="url"
                        aria-invalid={!!formError?.startsWith("Link")}
                        aria-describedby={
                          formError ? "booking-error" : undefined
                        }
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="field-label">
                        Cost ({currencySymbol(currency)})
                      </span>
                      <Input
                        value={form.cost}
                        onChange={(e) =>
                          onFormChange({ ...form, cost: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="0.00"
                        inputMode="decimal"
                        aria-describedby={
                          formError ? "booking-error" : "booking-hint"
                        }
                      />
                    </label>
                    {formError ? (
                      <p
                        id="booking-error"
                        role="alert"
                        className="field-error"
                      >
                        {formError}
                      </p>
                    ) : (
                      <p
                        id="booking-hint"
                        className="text-xs leading-relaxed text-muted"
                      >
                        Add a name, link and cost to mark this booking as
                        scheduled.
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={onCancelForm}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" disabled={saving} onClick={onSaveForm}>
                        {saving
                          ? "Saving…"
                          : editing?.itemId
                            ? "Save changes"
                            : "Add booking"}
                      </Button>
                    </div>
                  </div>
                </Disclosure>
                {!showForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-accent-ink"
                    onClick={() => onStartAdd(sec.key)}
                  >
                    <Plus />
                    Add {sec.name.toLowerCase()}
                  </Button>
                )}
              </section>
            );
          })}
        </div>
        <footer className="flex shrink-0 items-center justify-between border-t border-line-soft pt-4">
          <span className="text-sm text-muted">Total planned</span>
          <span className="text-lg font-semibold tracking-tight tabular-nums">
            <AnimatedNumber
              value={tripTotal}
              format={(value) => formatTotal(value, currency)}
            />
          </span>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
