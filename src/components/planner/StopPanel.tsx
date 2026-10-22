"use client";

import {
  AnimatedBackground,
  Disclosure,
} from "@/components/motion/primitives";
import { useEffect, useId, useRef, useState } from "react";
import {
  Plus,
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
} from "lucide-react";
import type { TripData, ItemSectionKey, ItemData, MemberOption, Person } from "@/lib/types";
import { fmtRange, nightsBetween } from "@/lib/dates";
import { statusFor } from "@/lib/tripStatus";
import { AddRow } from "@/components/planner/AddRow";
import { SECTION_DEFS } from "@/lib/tripSections";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Editing, FormState } from "@/components/Planner";

const DRAG_TIP_KEY = "travel-planner:dragTipDismissed";

export function editState(item: ItemData): FormState {
  return {
    t: item.t,
    url: item.url,
    cost: item.costAmount === null ? "" : String(item.costAmount),
    date: item.date ?? "",
    time: item.time ?? "",
    notes: item.notes ?? "",
    paidBy: item.paidBy?.id ?? "",
    files: [],
    removeIds: [],
  };
}

type ScheduleProps = {
  trip: TripData;
  currency: string;
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
  members: MemberOption[];
};

/** A stop's schedule: dates, color and its stays, transport and activities
 * day by day. What things cost lives in Finances on the right. Inline, it
 * sits beside the stops list; otherwise it has a back button to the list. */
export function StopSchedule({
  inline = false,
  trip,
  currency,
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
  members,
}: ScheduleProps & { inline?: boolean }) {
  const dd = useDayDrag(trip, onMoveItem);
  const stopDays = tripDays(trip);
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!inline) backRef.current?.focus({ preventScroll: true });
  }, [inline]);
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

  function saveLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== trip.label) onRename(trip.id, trimmed);
    setEditingLabel(false);
  }

  const dateButton = (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5 h-7 min-w-0 max-w-full px-2.5 font-medium tabular-nums text-muted-2"
      aria-expanded={editingDates}
      aria-label={`Change dates, ${fmtRange(trip.start, trip.end)}`}
      onClick={() => {
        setStartDraft(trip.start);
        setEndDraft(trip.end);
        setEditingDates((v) => !v);
      }}
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
        <div className="flex items-center justify-between gap-2">
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
          className={
            editingLabel
              ? "sr-only"
              : "text-balance break-words text-2xl font-semibold text-ink"
          }
        >
          {trip.label}
        </h2>
        {editingLabel && (
          <Input
            className="mt-1"
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
        )}
        <p className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-center text-sm font-medium tabular-nums text-ink">
          {statusFor(trip.start, trip.end)}
        </p>
      </header>

      <div
        data-drag-scroll
        className="-mx-2 mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 pb-2"
      >
        <Disclosure open={editingDates}>
          <div className="space-y-4 rounded-2xl border border-line bg-white p-4">
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
                variant="secondary"
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
                  "relative isolate flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 text-sm font-medium transition-colors duration-150 " +
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
              currency={currency}
              placeholder={sec.placeholder}
              submitLabel={label}
              existing={existing}
              days={
                PLANNED_SECTIONS.includes(sec.key) ? tripDays(trip) : undefined
              }
              members={members}
            />
          );
          // An activity's day, as a drop target: its date, or no day yet.
          const dayOf = (item: ItemData) =>
            item.date && stopDays.includes(item.date) ? item.date : UNDATED;
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
              data-drag-row={draggable || undefined}
              onPointerDown={
                draggable ? (e) => dd.start(e, item, dayOf(item), true) : undefined
              }
              className={
                "group -mx-2 rounded-xl px-2 py-2.5 transition-[background-color,opacity] duration-150 hover:bg-hover " +
                (draggable ? "cursor-grab active:cursor-grabbing " : "") +
                (dd.dragging === item.id ? "opacity-40" : "")
              }
            >
              <div className="flex items-start gap-2">
                <button
                  className="min-w-0 flex-1 text-pretty rounded text-left text-base font-medium leading-6 text-ink"
                  onClick={() => onStartEdit(sec.key, item.id, editState(item))}
                >
                  {item.t}
                </button>
                {draggable && (
                  <MoveHandle
                    item={item}
                    from={dayOf(item)}
                    days={stopDays}
                    dd={dd}
                    className="-my-1.5 size-9 text-muted-2"
                  />
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-my-1.5 -mr-1 size-9 text-muted-2"
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
              {(when(item) || sec.key === "activities") && (
                <div className="mt-0.5 flex min-h-8 items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-1.5 text-sm tabular-nums text-muted-2">
                    {when(item) ? (
                      <>
                        <Clock className="size-3.5 shrink-0" />
                        <span className="truncate">{when(item)}</span>
                      </>
                    ) : (
                      <span>Any time</span>
                    )}
                  </p>
                  {sec.key === "activities" && (
                    <GoingControl
                      itemId={item.id}
                      title={item.t}
                      going={item.going}
                      me={me}
                      onSetGoing={onSetGoing}
                    />
                  )}
                </div>
              )}
              {item.notes && (
                <p className="mt-1 text-pretty text-sm leading-relaxed text-ink-soft">
                  {item.notes}
                </p>
              )}
              {item.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
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
                        <span className="sr-only"> (PDF, opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
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
                        Drag a plan onto another day to move it.
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
                ? items.length > 0 && (
                    <div className="space-y-3">
                      {byDay.days.map(({ date, plans }) => {
                        const acts = plans.filter((p) => p.key === "activities");
                        const free = freeParts(plans);
                        return (
                          <div
                            key={date}
                            data-drop={date}
                            className={
                              "-mx-2 rounded-2xl px-2 pt-1 transition-colors duration-150 " +
                              (dd.isOver(date) ? "bg-accent-soft" : "")
                            }
                          >
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="flex min-w-0 items-baseline gap-1.5 text-xs font-medium text-muted">
                                <span className="shrink-0 uppercase tracking-wide">
                                  {fmtDay(date)}
                                </span>
                                {acts.length === 0 ? (
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
                                )}
                              </h3>
                              <div className="flex shrink-0 items-center">
                                {plans.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-2"
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
                                  className="-mr-1 size-7 text-muted-2"
                                  onClick={() => onStartAdd("activities", date)}
                                  aria-label={`Add an activity on ${fmtDay(date)}`}
                                  title="Add an activity"
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                            {acts.map((p) => row$(p.item))}
                          </div>
                        );
                      })}
                      {(byDay.undated.some((p) => p.key === "activities") ||
                        dd.dragActive) && (
                        <div
                          data-drop={UNDATED}
                          className={
                            "-mx-2 rounded-2xl px-2 pt-1 transition-colors duration-150 " +
                            (dd.isOver(UNDATED) ? "bg-accent-soft" : "")
                          }
                        >
                          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                            No day yet
                          </h3>
                          {byDay.undated
                            .filter((p) => p.key === "activities")
                            .map((p) => row$(p.item))}
                        </div>
                      )}
                    </div>
                  )
                : items.map(row$)}
              <Disclosure open={adding}>
                <div className="py-1">{form$([], "Add booking")}</div>
              </Disclosure>
              {!adding && (
                <AddRow
                  className="mt-1"
                  onClick={() => onStartAdd(sec.key)}
                  label={
                    items.length === 0
                      ? `Add your first ${sec.key === "activities" ? "activity" : sec.name.toLowerCase()}`
                      : `Add ${sec.key === "activities" ? "activity" : sec.name.toLowerCase()}`
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
