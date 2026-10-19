"use client";

import { AnimatedNumber, AnimatedUnderline, Disclosure } from "@/components/motion/primitives";
import { useEffect, useId, useRef, useState } from "react";
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
  FileText,
  Clock,
  GripVertical,
  Copy,
} from "lucide-react";
import type { TripData, ItemSectionKey, ItemData, Person } from "@/lib/types";
import { fmtRange, nightsBetween } from "@/lib/dates";
import {
  SECTION_DEFS,
  isScheduled,
  sectionTotal,
  hostFromUrl,
} from "@/lib/tripSections";
import { formatCost, formatTotal } from "@/lib/currency";
import {
  PLANNED_SECTIONS,
  dayShareText,
  fmtDay,
  freeParts,
  itineraryFor,
  tripDays,
  type Plan,
} from "@/lib/itinerary";
import { attachmentHref } from "@/lib/uploads";
import BookingForm from "@/components/planner/BookingForm";
import { STOP_COLORS, stopColor } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { MoveHandle, UNDATED, useDayDrag } from "@/components/planner/useDayDrag";
import { GoingControl } from "@/components/planner/Going";
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

const SECTION_ICONS = { stay: Hotel, transport: Plane, activities: MapPin } as const;
const DRAG_TIP_KEY = "travel-planner:dragTipDismissed";

function editState(item: ItemData): FormState {
  return {
    t: item.t,
    url: item.url,
    cost: item.costAmount === null ? "" : String(item.costAmount),
    date: item.date ?? "",
    time: item.time ?? "",
    notes: item.notes ?? "",
    files: [],
    removeIds: [],
  };
}

export default function TripDrawer({
  trip,
  currency,
  isMobile,
  editing,
  form,
  formError,
  saving,
  onFormChange,
  onFormError,
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
  onMoveItem,
  me,
  onSetGoing,
}: {
  trip: TripData;
  currency: string;
  isMobile: boolean;
  editing: Editing;
  form: FormState;
  formError: string | null;
  saving: boolean;
  onFormChange: (f: FormState) => void;
  onFormError: (message: string | null) => void;
  onClose: () => void;
  onStartAdd: (key: ItemSectionKey, date?: string) => void;
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
  /** Puts an activity on another day of the stop, or on no day (null). */
  onMoveItem: (itemId: string, date: string | null) => Promise<void>;
  /** The signed in person, who can sign up for activities. */
  me: Person;
  onSetGoing: (itemId: string, going: boolean) => Promise<void>;
}) {
  const dd = useDayDrag(trip, onMoveItem);
  const stopDays = tripDays(trip);
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
  // One section at a time. Editing a plan from elsewhere (the left panel,
  // Finances) opens its section.
  const [tab, setTab] = useState<ItemSectionKey>(editing?.key ?? "activities");
  useEffect(() => {
    if (editing?.key) setTab(editing.key);
  }, [editing?.key]);
  const tabsId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);

  // A card can be dragged onto another day, which has no other hint it's
  // possible. Shown once per browser, on the Activities tab where it applies.
  const [dragTipDismissed, setDragTipDismissed] = useState(true);
  useEffect(() => {
    try {
      setDragTipDismissed(localStorage.getItem(DRAG_TIP_KEY) === "1");
    } catch {
      // Private browsing or storage disabled: show it every time rather
      // than never.
      setDragTipDismissed(false);
    }
  }, []);
  function dismissDragTip() {
    setDragTipDismissed(true);
    try {
      localStorage.setItem(DRAG_TIP_KEY, "1");
    } catch {
      // Nothing to persist to; it'll just show again next visit.
    }
  }

  // Copies a day's plans (across sections) as plain text, the same as the
  // left panel's copy button.
  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  async function copyDay(date: string, plans: Plan[]) {
    try {
      await navigator.clipboard.writeText(dayShareText(trip, date, plans));
      setCopiedDate(date);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedDate(null), 2000);
    } catch {
      // Nothing visible on failure; the icon simply won't switch to Check.
    }
  }

  function onTabKey(e: React.KeyboardEvent) {
    const keys = SECTION_DEFS.map((s) => s.key);
    const i = keys.indexOf(tab);
    const next =
      e.key === "ArrowRight"
        ? keys[(i + 1) % keys.length]
        : e.key === "ArrowLeft"
          ? keys[(i - 1 + keys.length) % keys.length]
          : e.key === "Home"
            ? keys[0]
            : e.key === "End"
              ? keys[keys.length - 1]
              : null;
    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabsRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)
      ?.focus();
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
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-4">
          <div className="min-w-0 flex-1">
            <p className="section-label">Stop</p>
            <DialogTitle
              className={editingLabel ? "sr-only" : "mt-1 text-2xl"}
            >
              {trip.label}
            </DialogTitle>
            {editingLabel ? (
              <Input
                className="mt-1.5"
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
                className="-ml-2.5 mt-1 h-8 px-2.5 font-normal tabular-nums text-muted"
                aria-expanded={editingDates}
                onClick={() => {
                  setStartDraft(trip.start);
                  setEndDraft(trip.end);
                  setEditingDates(true);
                }}
              >
                <CalendarDays />
                {fmtRange(trip.start, trip.end)} ·{" "}
                {nightsBetween(trip.start, trip.end)}{" "}
                {nightsBetween(trip.start, trip.end) === 1 ? "night" : "nights"}
              </Button>
            )}
            <DialogDescription className="sr-only">
              Manage dates and bookings for {trip.label}.
            </DialogDescription>
          </div>
          <div className="-mr-2 -mt-2 flex">
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

        <div
          data-drag-scroll
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-2 py-5 -mx-2"
        >
          {trip.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trip.photoUrl}
              alt=""
              className="h-32 w-full rounded-xl object-cover"
            />
          )}
          <Disclosure open={editingDates}>
            <div className="space-y-4 rounded-xl border border-line bg-secondary/60 p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block min-w-0 space-y-1.5">
                  <span className="field-label">Arrival</span>
                  <Input
                    type="date"
                    value={startDraft}
                    onChange={(e) => setStartDraft(e.target.value)}
                  />
                </label>
                <label className="block min-w-0 space-y-1.5">
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
            <div className="-ml-1.5 flex flex-wrap gap-0.5">
              {STOP_COLORS.map((c) => {
                const active = stopColor(trip.color).id === c.id;
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
                      className="flex size-6 items-center justify-center rounded-full"
                      style={{
                        background: c.soft,
                        color: c.ink,
                        boxShadow: active
                          ? `0 0 0 2px white, 0 0 0 3.5px ${c.ink}`
                          : `inset 0 0 0 1px rgb(28 25 23 / 0.06)`,
                      }}
                    >
                      {active ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: c.base }}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Plans"
            onKeyDown={onTabKey}
            className="flex border-b border-line"
          >
            {SECTION_DEFS.map((sec) => {
              const active = tab === sec.key;
              const TabIcon = SECTION_ICONS[sec.key];
              return (
                <button
                  key={sec.key}
                  type="button"
                  role="tab"
                  data-tab={sec.key}
                  id={`${tabsId}-tab-${sec.key}`}
                  aria-selected={active}
                  aria-controls={`${tabsId}-panel-${sec.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(sec.key)}
                  className={
                    "relative flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-t-lg px-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring " +
                    (active ? "text-ink" : "text-muted hover:text-ink")
                  }
                >
                  <TabIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{sec.name}</span>
                  <span className="text-xs font-normal tabular-nums text-muted">
                    {trip[sec.key].length}
                  </span>
                  {active && (
                    <AnimatedUnderline layoutId={`${tabsId}-underline`} />
                  )}
                </button>
              );
            })}
          </div>

          {SECTION_DEFS.filter((sec) => sec.key === tab).map((sec) => {
            const items: ItemData[] = trip[sec.key];
            const total = sectionTotal(items);
            const adding = editing?.key === sec.key && editing.itemId === null;
            const form$ = (existing: ItemData["attachments"], label: string) => (
              <BookingForm
                form={form}
                onChange={onFormChange}
                error={formError}
                onError={onFormError}
                saving={saving}
                onSave={onSaveForm}
                onCancel={onCancelForm}
                currency={currency}
                placeholder={sec.placeholder}
                submitLabel={label}
                existing={existing}
                days={
                  PLANNED_SECTIONS.includes(sec.key) ? tripDays(trip) : undefined
                }
              />
            );
            // An activity's day, as a drop target: its date, or no day yet.
            const dayOf = (item: ItemData) =>
              item.date && stopDays.includes(item.date) ? item.date : UNDATED;
            const draggable = sec.key === "activities";
            const renderCard = (item: ItemData) => (
              <article
                  key={item.id}
                  data-drag-row={draggable || undefined}
                  onPointerDown={
                    draggable ? (e) => dd.start(e, item, dayOf(item), true) : undefined
                  }
                  className={
                    "booking-card rounded-xl border border-line bg-white py-3 pl-4 pr-2 shadow-panel transition-opacity duration-150 hover:border-input " +
                    (draggable ? "cursor-grab active:cursor-grabbing " : "") +
                    (dd.dragging === item.id ? "opacity-40" : "")
                  }
                >
                  <div className="flex items-start gap-3">
                    <button
                      className="min-w-0 flex-1 text-pretty rounded text-left text-sm font-medium leading-5 text-ink"
                      onClick={() =>
                        onStartEdit(sec.key, item.id, editState(item))
                      }
                    >
                      {item.t}
                    </button>
                    {item.costAmount === null ? (
                      <span className="shrink-0 pt-px text-xs leading-5 text-muted">
                        No cost
                      </span>
                    ) : (
                      <span className="shrink-0 text-sm font-medium leading-5 tabular-nums text-ink">
                        {formatCost(item.costAmount, currency)}
                      </span>
                    )}
                    {draggable && (
                      <MoveHandle
                        item={item}
                        from={dayOf(item)}
                        days={stopDays}
                        dd={dd}
                        className="-my-2 -mr-2 size-9"
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-my-2 size-9"
                          aria-label={`Options for ${item.t}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() =>
                            onStartEdit(sec.key, item.id, editState(item))
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
                  {item.date && (sec.key !== "activities" || item.time) && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium tabular-nums text-ink-soft">
                      <Clock className="size-3.5 shrink-0 text-muted" />
                      {/* Activities are already grouped under their day. */}
                      {sec.key === "activities"
                        ? item.time
                        : `${fmtDay(item.date)}${item.time ? ` · ${item.time}` : ""}`}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1.5 text-pretty text-xs leading-relaxed text-ink-soft">
                      {item.notes}
                    </p>
                  )}
                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 pr-2">
                    <Badge
                      variant={isScheduled(item) ? "success" : "secondary"}
                    >
                      {isScheduled(item) && <Check className="size-3" />}
                      {isScheduled(item) ? "Scheduled" : "Incomplete"}
                    </Badge>
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
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="truncate text-xs text-muted">
                        No booking link
                      </span>
                    )}
                    {sec.key === "activities" && (
                      <div className="ml-auto">
                        <GoingControl
                          itemId={item.id}
                          title={item.t}
                          going={item.going}
                          me={me}
                          onSetGoing={onSetGoing}
                        />
                      </div>
                    )}
                  </div>
                  {item.attachments.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5 pr-2">
                      {item.attachments.map((a) => (
                        <li key={a.id} className="min-w-0 max-w-full">
                          <a
                            href={attachmentHref(a.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex min-w-0 items-center gap-1.5 rounded-md border border-line bg-secondary px-2 py-1 text-xs text-ink-soft hover:border-input hover:text-ink"
                          >
                            <FileText className="size-3.5 shrink-0 text-muted" />
                            <span className="truncate">{a.name}</span>
                            <span className="sr-only"> (PDF, opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
            );
            const card$ = (item: ItemData) =>
              editing?.itemId === item.id ? (
                <div key={item.id} className="-mx-1 p-1">
                  {form$(item.attachments, "Save changes")}
                </div>
              ) : (
                renderCard(item)
              );
            // Activities read as a day-by-day plan; other sections stay a list.
            const byDay = sec.key === "activities" ? itineraryFor(dd.trip) : null;
            return (
              <section
                key={sec.key}
                role="tabpanel"
                id={`${tabsId}-panel-${sec.key}`}
                aria-labelledby={`${tabsId}-tab-${sec.key}`}
                className="-mt-2"
              >
                {total > 0 && (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{sec.name} total</span>
                    <span className="font-medium tabular-nums text-ink-soft">
                      {formatTotal(total, currency)}
                    </span>
                  </div>
                )}
                {byDay && (
                  <>
                    <p className="sr-only" role="status" aria-live="polite">
                      {dd.status}
                    </p>
                    {dd.error && (
                      <p role="alert" className="field-error mt-2">
                        {dd.error}
                      </p>
                    )}
                    {items.length > 0 && !dragTipDismissed && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-secondary/60 px-3 py-2.5 text-xs text-ink-soft">
                        <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted" />
                        <p className="flex-1 text-pretty leading-relaxed">
                          Drag a card, or its grip, onto another day to move
                          it.
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-1.5 -mt-1 size-7 shrink-0"
                          onClick={dismissDragTip}
                          aria-label="Dismiss this tip"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
                <div className="mt-3 space-y-2">
                  {byDay
                    ? items.length > 0 && (
                        <div className="space-y-4">
                          {byDay.days.map(({ date, plans }) => {
                            const acts = plans.filter(
                              (p) => p.key === "activities",
                            );
                            const free = freeParts(plans);
                            return (
                              <div
                                key={date}
                                data-drop={date}
                                className={
                                  "-mx-2 space-y-2 rounded-xl px-2 py-1.5 transition-colors duration-150 " +
                                  (dd.isOver(date) ? "bg-accent-soft" : "")
                                }
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="flex items-baseline gap-1.5 text-xs font-medium text-ink-soft">
                                    {fmtDay(date)}
                                    {acts.length === 0 ? (
                                      <span className="font-normal text-muted">
                                        Free day
                                      </span>
                                    ) : (
                                      free &&
                                      free.length > 0 && (
                                        <span className="font-normal text-muted">
                                          Free {free.join(", ")}
                                        </span>
                                      )
                                    )}
                                  </h4>
                                  <div className="flex items-center gap-0.5">
                                    {plans.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        onClick={() => copyDay(date, plans)}
                                        aria-label={
                                          copiedDate === date
                                            ? `${fmtDay(date)} copied`
                                            : `Copy ${fmtDay(date)} as text`
                                        }
                                        title="Copy as text"
                                      >
                                        {copiedDate === date ? (
                                          <Check className="size-3.5" />
                                        ) : (
                                          <Copy className="size-3.5" />
                                        )}
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="-mr-1.5 size-7"
                                      onClick={() => onStartAdd("activities", date)}
                                      aria-label={`Add an activity on ${fmtDay(date)}`}
                                      title="Add an activity"
                                    >
                                      <Plus className="size-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                {acts.map((p) => card$(p.item))}
                              </div>
                            );
                          })}
                          {(byDay.undated.some((p) => p.key === "activities") ||
                            dd.dragActive) && (
                            <div
                              data-drop={UNDATED}
                              className={
                                "-mx-2 space-y-2 rounded-xl px-2 py-1.5 transition-colors duration-150 " +
                                (dd.isOver(UNDATED) ? "bg-accent-soft" : "")
                              }
                            >
                              <h4 className="text-xs font-medium text-ink-soft">
                                No day yet
                              </h4>
                              {byDay.undated
                                .filter((p) => p.key === "activities")
                                .map((p) => card$(p.item))}
                            </div>
                          )}
                        </div>
                      )
                    : items.map(card$)}
                  {items.length === 0 && !adding && (
                    <p className="text-pretty rounded-xl border border-dashed border-line px-4 py-3 text-xs leading-relaxed text-muted">
                      No {sec.name.toLowerCase()} added yet.
                    </p>
                  )}
                </div>
                <Disclosure open={adding}>
                  <div className="mt-2">{form$([], "Add booking")}</div>
                </Disclosure>
                {!adding && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2.5 mt-2 px-2.5 text-ink-soft"
                    onClick={() => onStartAdd(sec.key)}
                  >
                    <Plus />
                    Add {sec.key === "activities" ? "activity" : sec.name.toLowerCase()}
                  </Button>
                )}
              </section>
            );
          })}
        </div>
        {dd.ghost}
        <footer className="flex shrink-0 items-center justify-between border-t border-line-soft pt-4">
          <span className="text-sm text-muted">Total planned</span>
          <span className="text-lg font-semibold tabular-nums">
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
