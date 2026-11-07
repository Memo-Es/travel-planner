"use client";

import { AnimatedBackground, Disclosure } from "@/components/motion/primitives";
import { useEffect, useId, useRef, useState } from "react";
import {
  Trash2,
  X,
  Pencil,
  MoreHorizontal,
  CalendarDays,
  ChevronLeft,
  Check,
  FileText,
  Clock,
  GripVertical,
  Copy,
  ArrowUpRight,
} from "lucide-react";
import type { TripData, ItemSectionKey, ItemData, Person } from "@/lib/types";
import { fmtRange, nightsBetween } from "@/lib/dates";
import { statusFor } from "@/lib/tripStatus";
import { AddRow } from "@/components/planner/AddRow";
import { SECTION_DEFS, hostFromUrl } from "@/lib/tripSections";
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
import { UNDATED, useDayDrag } from "@/components/planner/useDayDrag";
import { GoingControl } from "@/components/planner/Going";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Editing, FormState } from "@/components/Planner";
import { cn } from "@/lib/utils";
import { StopIcon } from "@/components/planner/StopIcon";
import { CITY_ICONS, iconFor, type CityIconKey } from "@/lib/cityIcons";

const DRAG_TIP_KEY = "travel-planner:dragTipDismissed";

export function editState(item: ItemData): FormState {
  return {
    t: item.t,
    url: item.url,
    date: item.date ?? "",
    time: item.time ?? "",
    notes: item.notes ?? "",
    files: [],
    removeIds: [],
  };
}

type ScheduleProps = {
  trip: TripData;
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
  /** A city icon key, "pin", or null to pick from the name again. */
  onChangeIcon: (tripId: string, icon: string | null) => void;
  onDeleteTrip: (tripId: string, label: string) => void;
  /** Puts an activity on another day of the stop, or on no day (null). */
  onMoveItem: (itemId: string, date: string | null) => Promise<void>;
  /** The signed in person, who can sign up for activities. */
  me: Person;
  onSetGoing: (itemId: string, going: boolean) => Promise<void>;
  /** A plan picked on the calendar: its day opens and it's highlighted.
   * The counter re-runs it when the same plan is picked again. */
  focusPlan?: { id: string; n: number } | null;
};

/** A stop's schedule: dates, color and its stays, transport and activities
 * day by day. What things cost lives in Finances on the right. Inline, it
 * sits beside the stops list; otherwise it has a back button to the list. */
export function StopSchedule({
  inline = false,
  trip,
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
  onChangeIcon,
  onDeleteTrip,
  onMoveItem,
  me,
  onSetGoing,
  focusPlan,
}: ScheduleProps & { inline?: boolean }) {
  const dd = useDayDrag(trip, onMoveItem);
  const stopDays = tripDays(trip);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!inline) backRef.current?.focus({ preventScroll: true });
  }, [inline]);
  // The stop's own details (name and dates) are edited together in one
  // form under the header.
  const [editingStop, setEditingStop] = useState(false);
  const [startDraft, setStartDraft] = useState(trip.start);
  const [endDraft, setEndDraft] = useState(trip.end);
  const [labelDraft, setLabelDraft] = useState(trip.label);
  const datesValid = !!startDraft && !!endDraft && endDraft >= startDraft;
  const labelValid = labelDraft.trim().length > 0;
  const nameRef = useRef<HTMLInputElement>(null);
  // One section at a time. Editing a plan from elsewhere (the left panel,
  // Finances) opens its section.
  const [tab, setTab] = useState<ItemSectionKey>(editing?.key ?? "activities");
  useEffect(() => {
    if (editing?.key) setTab(editing.key);
  }, [editing?.key]);
  const tabsId = useId();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [pickingIcon, setPickingIcon] = useState(false);
  const autoIcon = iconFor({ label: trip.label, icon: null });

  // Activities show one day at a time: the first day with plans, else the
  // first day of the stop.
  const dayOf = (item: ItemData) =>
    item.date && stopDays.includes(item.date) ? item.date : UNDATED;
  const [day, setDay] = useState<string>(
    () =>
      stopDays.find((d) => trip.activities.some((a) => a.date === d)) ??
      stopDays[0] ??
      UNDATED,
  );
  // A plan picked on the calendar, or opened for editing from elsewhere,
  // opens its section and day; a picked one is highlighted for a moment.
  const [flash, setFlash] = useState<string | null>(null);
  function reveal(id: string, highlight: boolean) {
    for (const sec of SECTION_DEFS) {
      const item = trip[sec.key].find((i) => i.id === id);
      if (!item) continue;
      setTab(sec.key);
      if (sec.key === "activities") setDay(dayOf(item));
      if (highlight) setFlash(id);
      // After the section and day have rendered.
      setTimeout(
        () =>
          document
            .getElementById(`${tabsId}-plan-${id}`)
            ?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
        60,
      );
      return;
    }
  }
  useEffect(() => {
    if (focusPlan) reveal(focusPlan.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlan?.id, focusPlan?.n]);
  useEffect(() => {
    if (editing?.itemId) reveal(editing.itemId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.itemId]);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2400);
    return () => clearTimeout(t);
  }, [flash]);

  // A plan can be dragged onto another day, which has no other hint it's
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

  function openEditStop() {
    if (editingStop) return setEditingStop(false);
    setLabelDraft(trip.label);
    setStartDraft(trip.start);
    setEndDraft(trip.end);
    setEditingStop(true);
    // After the form has opened.
    setTimeout(() => nameRef.current?.focus(), 60);
  }
  function saveStop() {
    if (!datesValid || !labelValid) return;
    const label = labelDraft.trim();
    if (label !== trip.label) onRename(trip.id, label);
    if (startDraft !== trip.start || endDraft !== trip.end)
      onUpdateDates(trip.id, startDraft, endDraft);
    setEditingStop(false);
  }

  const dateButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5 h-7 min-w-0 max-w-full px-2.5 font-medium tabular-nums text-muted-2"
      aria-expanded={editingStop}
      aria-label={`Edit stop, ${fmtRange(trip.start, trip.end)}`}
      onClick={openEditStop}
    >
      <CalendarDays />
      <span className="truncate">
        {fmtRange(trip.start, trip.end)} · {nightsBetween(trip.start, trip.end)}{" "}
        {nightsBetween(trip.start, trip.end) === 1 ? "night" : "nights"}
      </span>
    </Button>
  );

  return (
    <>
      <header className="shrink-0">
        <div className="flex min-h-10 items-center justify-between gap-2">
          {inline ? (
            dateButton
          ) : (
            <Button
              ref={backRef}
              variant="secondary"
              size="icon"
              className="-ml-1"
              onClick={onClose}
              aria-label="Back to all stops"
            >
              <ChevronLeft />
            </Button>
          )}
          <div className="-mr-1 flex shrink-0 gap-1.5">
            <Button
              variant={editingStop ? "accent" : "secondary"}
              size="sm"
              aria-expanded={editingStop}
              onClick={openEditStop}
            >
              <Pencil />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Stop options"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openEditStop}>
                  <Pencil />
                  Edit name and dates
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
            {inline && (
              <Button
                variant="secondary"
                size="icon"
                onClick={onClose}
                aria-label={`Close ${trip.label}`}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
        {!inline && <div className="mt-4">{dateButton}</div>}
        <h2
          id={`${tabsId}-title`}
          className={cn(
            "text-balance break-words text-2xl font-semibold text-ink",
            // Inline, level with the trip name beside it.
            inline && "mt-3",
          )}
        >
          {trip.label}
        </h2>
        <p className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-medium tabular-nums text-ink">
          {statusFor(trip.start, trip.end)}
        </p>
      </header>

      <div
        data-drag-scroll
        className="scroll-quiet -mx-2 mt-5 min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-2"
      >
        <Disclosure open={editingStop}>
          <form
            aria-label="Edit stop"
            className="space-y-4 rounded-2xl border border-line bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              saveStop();
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setEditingStop(false);
              }
            }}
          >
            <label className="block min-w-0 space-y-1.5">
              <span className="field-label">Name</span>
              <Input
                ref={nameRef}
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                aria-invalid={!labelValid}
              />
            </label>
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
                  aria-describedby={
                    !datesValid ? `${tabsId}-date-error` : undefined
                  }
                />
              </label>
            </div>
            {datesValid ? (
              <p
                className="text-sm tabular-nums text-muted-2"
                aria-live="polite"
              >
                {fmtRange(startDraft, endDraft)} ·{" "}
                {nightsBetween(startDraft, endDraft)}{" "}
                {nightsBetween(startDraft, endDraft) === 1 ? "night" : "nights"}
              </p>
            ) : (
              <p
                id={`${tabsId}-date-error`}
                className="field-error"
                role="alert"
              >
                Choose a departure on or after arrival.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingStop(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!datesValid || !labelValid}
              >
                Save
              </Button>
            </div>
          </form>
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
                  className="tap-target flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-hover"
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
        <fieldset className="min-w-0 !mt-4">
          <legend className="sr-only">Icon</legend>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary"
                style={{ color: stopColor(trip.color).base }}
              >
                <StopIcon stop={trip} className="size-6" />
              </span>
              <span className="min-w-0">
                <span className="field-label block">Icon</span>
                <span className="block truncate text-xs text-muted-2">
                  {trip.icon === null
                    ? `Auto${autoIcon ? ` · ${CITY_ICONS[autoIcon].label}` : " · Pin"}`
                    : trip.icon === "pin"
                      ? "Pin"
                      : (CITY_ICONS[trip.icon as CityIconKey]?.label ?? "Pin")}
                </span>
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={pickingIcon}
              onClick={() => setPickingIcon((v) => !v)}
            >
              {pickingIcon ? "Done" : "Change"}
            </Button>
          </div>
          <Disclosure open={pickingIcon}>
            <div className="-ml-1.5 mt-2 flex flex-wrap gap-0.5">
              {(
                [
                  null,
                  "pin",
                  ...(Object.keys(CITY_ICONS) as CityIconKey[]),
                ] as (CityIconKey | "pin" | null)[]
              ).map((key) => {
                const active = trip.icon === key;
                const label =
                  key === null
                    ? "Auto, from the city name"
                    : key === "pin"
                      ? "Pin"
                      : CITY_ICONS[key].label;
                return (
                  <button
                    key={key ?? "auto"}
                    type="button"
                    onClick={() => onChangeIcon(trip.id, key)}
                    aria-label={label}
                    aria-pressed={active}
                    title={label}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl transition-colors duration-150",
                      active
                        ? "bg-secondary text-ink"
                        : "text-muted hover:bg-hover hover:text-ink",
                    )}
                  >
                    {key === null ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide">
                        Auto
                      </span>
                    ) : (
                      <StopIcon
                        icon={key === "pin" ? null : key}
                        className="size-6"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </Disclosure>
        </fieldset>

        <div
          ref={tabsRef}
          role="tablist"
          aria-label="Plans"
          onKeyDown={onTabKey}
          className="flex gap-0.5 rounded-full bg-secondary p-1"
        >
          {SECTION_DEFS.map((sec) => {
            const active = tab === sec.key;
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
                  "focus-inset tap-target relative isolate flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-sm font-medium transition-colors duration-150 " +
                  (active ? "text-ink" : "text-muted-2 hover:text-ink")
                }
              >
                {active && (
                  <AnimatedBackground
                    layoutId={`${tabsId}-tab`}
                    className="bg-white shadow-sm"
                  />
                )}
                <span className="truncate">{sec.name}</span>
                <span className="text-xs tabular-nums text-muted-2">
                  {trip[sec.key].length}
                </span>
              </button>
            );
          })}
        </div>
        {SECTION_DEFS.filter((sec) => sec.key === tab).map((sec) => {
          const items: ItemData[] = trip[sec.key];
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
              placeholder={sec.placeholder}
              submitLabel={label}
              existing={existing}
              days={
                PLANNED_SECTIONS.includes(sec.key) ? tripDays(trip) : undefined
              }
            />
          );
          const draggable = sec.key === "activities";
          const when = (item: ItemData) =>
            // Activities are already grouped under their day.
            sec.key === "activities"
              ? item.time
              : item.date
                ? `${fmtDay(item.date)}${item.time ? ` · ${item.time}` : ""}`
                : null;
          const renderRow = (item: ItemData) => (
            <article
              key={item.id}
              id={`${tabsId}-plan-${item.id}`}
              data-drag-row={draggable || undefined}
              onPointerDown={
                draggable
                  ? (e) => dd.start(e, item, dayOf(item), true)
                  : undefined
              }
              className={cn(
                "group -mx-2 rounded-2xl px-2 py-3 transition-[background-color,opacity] duration-300",
                flash === item.id ? "bg-accent-soft" : "hover:bg-hover",
                draggable && "cursor-grab active:cursor-grabbing",
                dd.dragging === item.id && "opacity-40",
              )}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <button
                    className="tap-target text-pretty rounded text-left text-base font-medium leading-6 text-ink"
                    onClick={() =>
                      onStartEdit(sec.key, item.id, editState(item))
                    }
                  >
                    {item.t}
                  </button>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-muted-2">
                    <Clock className="size-3.5 shrink-0" />
                    <span className="truncate">{when(item) ?? "Any time"}</span>
                  </p>
                </div>
                <DropdownMenu
                  open={dd.menuFor === item.id}
                  onOpenChange={(open) => dd.setMenuFor(open ? item.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mr-1.5 -mt-1 size-9 shrink-0 text-muted-2"
                      aria-label={`Options for ${item.t}`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="scroll-quiet max-h-80 overflow-y-auto"
                  >
                    <DropdownMenuItem
                      onSelect={() =>
                        onStartEdit(sec.key, item.id, editState(item))
                      }
                    >
                      <Pencil />
                      Edit booking
                    </DropdownMenuItem>
                    {draggable && (
                      <>
                        <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">
                          Move to
                        </p>
                        {[...stopDays, UNDATED].map((to) => (
                          <DropdownMenuItem
                            key={to}
                            disabled={to === dayOf(item)}
                            onSelect={() => dd.move(item, to)}
                          >
                            <CalendarDays />
                            <span className="flex-1 tabular-nums">
                              {to === UNDATED ? "No day yet" : fmtDay(to)}
                            </span>
                            {to === dayOf(item) && (
                              <Check aria-label="Current day" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
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
              {item.notes && (
                <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
                  {item.notes}
                </p>
              )}
              {(item.url || item.attachments.length > 0) && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {item.url && (
                    <li className="min-w-0 max-w-full">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors duration-150 hover:bg-hover-2 hover:text-ink"
                      >
                        <span className="truncate">
                          {hostFromUrl(item.url)}
                        </span>
                        <ArrowUpRight className="size-3 shrink-0" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  )}
                  {item.attachments.map((a) => (
                    <li key={a.id} className="min-w-0 max-w-full">
                      <a
                        href={attachmentHref(a.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors duration-150 hover:bg-hover-2 hover:text-ink"
                      >
                        <FileText className="size-3.5 shrink-0 text-muted-2" />
                        <span className="truncate">{a.name}</span>
                        <span className="sr-only">
                          {" "}
                          (PDF, opens in a new tab)
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {sec.key === "activities" && (
                <div className="mt-2">
                  <GoingControl
                    itemId={item.id}
                    title={item.t}
                    going={item.going}
                    me={me}
                    onSetGoing={onSetGoing}
                  />
                </div>
              )}
            </article>
          );
          const row$ = (item: ItemData) =>
            editing?.itemId === item.id ? (
              <div key={item.id} className="py-1">
                {form$(item.attachments, "Save changes")}
              </div>
            ) : (
              renderRow(item)
            );
          // Activities read as a day-by-day plan; other sections stay a list.
          const byDay = sec.key === "activities" ? itineraryFor(dd.trip) : null;
          return (
            <section
              key={sec.key}
              role="tabpanel"
              id={`${tabsId}-panel-${sec.key}`}
              aria-labelledby={`${tabsId}-tab-${sec.key}`}
              className="!mt-3"
            >
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
                    <div className="mb-2 flex items-center gap-2.5 rounded-2xl bg-secondary py-1.5 pl-3.5 pr-1.5 text-xs text-ink-soft">
                      <GripVertical className="size-3.5 shrink-0 text-muted-2" />
                      <p className="flex-1 text-pretty leading-relaxed">
                        <span className="[@media(pointer:coarse)]:hidden">
                          Drag a plan onto a day above to move it there.
                        </span>
                        <span className="hidden [@media(pointer:coarse)]:inline">
                          Use ⋯ on a plan to move it to another day.
                        </span>
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={dismissDragTip}
                        aria-label="Dismiss this tip"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
              {byDay
                ? (() => {
                    const hasUndated = byDay.undated.some(
                      (p) => p.key === "activities",
                    );
                    const tabs = [
                      ...stopDays,
                      ...(hasUndated || dd.dragActive || day === UNDATED
                        ? [UNDATED]
                        : []),
                    ];
                    const plansOn = (d: string) =>
                      d === UNDATED
                        ? byDay.undated
                        : (byDay.days.find((x) => x.date === d)?.plans ?? []);
                    const shown = plansOn(day);
                    const acts = shown.filter((p) => p.key === "activities");
                    const free = day === UNDATED ? null : freeParts(shown);
                    return (
                      <>
                        <div
                          role="tablist"
                          aria-label="Days"
                          className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
                        >
                          {tabs.map((d) => {
                            const selected = d === day;
                            const count = plansOn(d).filter(
                              (p) => p.key === "activities",
                            ).length;
                            const [weekday, num] =
                              d === UNDATED
                                ? ["No", "day"]
                                : fmtDay(d).split(" ");
                            return (
                              <button
                                key={d}
                                type="button"
                                role="tab"
                                data-drop={d}
                                aria-selected={selected}
                                aria-label={`${d === UNDATED ? "No day yet" : fmtDay(d)}, ${count} ${count === 1 ? "activity" : "activities"}`}
                                onClick={() => setDay(d)}
                                className={cn(
                                  "focus-inset relative isolate flex w-12 shrink-0 flex-col items-center rounded-2xl py-1.5 transition-colors duration-150",
                                  selected
                                    ? "text-ink"
                                    : "text-muted-2 hover:text-ink",
                                  dd.isOver(d) && "bg-accent-soft",
                                )}
                              >
                                {selected && (
                                  <AnimatedBackground
                                    layoutId={`${tabsId}-day`}
                                    className="bg-secondary"
                                  />
                                )}
                                <span className="text-[11px] font-medium uppercase tracking-wide">
                                  {weekday}
                                </span>
                                <span className="text-base font-semibold leading-6 tabular-nums">
                                  {num}
                                </span>
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "size-1 rounded-full bg-current",
                                    count === 0 && "opacity-0",
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <div
                          role="tabpanel"
                          data-drop={day}
                          className={cn(
                            "-mx-2 mt-2 rounded-2xl px-2 pt-1 transition-colors duration-150",
                            dd.isOver(day) && "bg-accent-soft",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="flex min-w-0 items-baseline gap-1.5 text-xs font-medium text-muted">
                              <span className="shrink-0 uppercase tracking-wide">
                                {day === UNDATED ? "No day yet" : fmtDay(day)}
                              </span>
                              {day !== UNDATED &&
                                (acts.length === 0 ? (
                                  <span className="truncate font-normal text-muted-2">
                                    Free day
                                  </span>
                                ) : (
                                  free &&
                                  free.length > 0 && (
                                    <span className="truncate font-normal text-muted-2">
                                      Free {free.join(", ")}
                                    </span>
                                  )
                                ))}
                            </h3>
                            {day !== UNDATED && shown.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="-mr-1 size-7 shrink-0 text-muted-2"
                                onClick={() => copyDay(day, shown)}
                                aria-label={
                                  copiedDate === day
                                    ? `${fmtDay(day)} copied`
                                    : `Copy ${fmtDay(day)} as text`
                                }
                                title="Copy as text"
                              >
                                {copiedDate === day ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                          {acts.map((p) => row$(p.item))}
                        </div>
                      </>
                    );
                  })()
                : items.map(row$)}
              <Disclosure open={adding}>
                <div className="py-1">{form$([], "Add booking")}</div>
              </Disclosure>
              {!adding && (
                <AddRow
                  className="mt-1"
                  onClick={() =>
                    sec.key === "activities" && day !== UNDATED
                      ? onStartAdd(sec.key, day)
                      : onStartAdd(sec.key)
                  }
                  label={
                    sec.key === "activities"
                      ? day === UNDATED
                        ? "Add activity"
                        : `Add activity on ${fmtDay(day)}`
                      : items.length === 0
                        ? `Add your first ${sec.name.toLowerCase()}`
                        : `Add ${sec.name.toLowerCase()}`
                  }
                />
              )}
            </section>
          );
        })}
      </div>
      {dd.ghost}
    </>
  );
}
