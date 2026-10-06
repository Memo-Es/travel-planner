"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence } from "motion/react";
import { TransitionText } from "@/components/motion/primitives";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type {
  TripData,
  TeamOption,
  InviteData,
  MemberOption,
  ItemSectionKey,
} from "@/lib/types";
import {
  buildWeeks,
  layoutMode,
  mainWidth,
  type CalendarEvent,
} from "@/lib/calendar";
import { MONTHS_LONG, DAY, ms, toDateInput } from "@/lib/dates";
import { HOLIDAY_NOTES } from "@/lib/demoData";
import { isScheduled, sectionTotal } from "@/lib/tripSections";
import { defaultTripId, plansByDate } from "@/lib/itinerary";
import { LEFT_W, RIGHT_W, RAIL_W, MIN_MAIN } from "@/lib/theme";
import {
  createTrip,
  addItem,
  updateItem,
  deleteItem,
  deleteTrip,
  updateStopDates,
  updateTripLabel,
  updateTripColor,
  deleteAttachment,
} from "@/actions/trips";
import { uploadPdf } from "@/lib/uploads";
import {
  switchTeam,
  updateTeamName,
  updateTeamCurrency,
  createInvite,
  dismissSignedInToast,
} from "@/actions/team";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import LeftPanel from "@/components/planner/LeftPanel";
import LeftRail from "@/components/planner/LeftRail";
import FinancePanel from "@/components/planner/FinancePanel";
import ItineraryPanel from "@/components/planner/ItineraryPanel";
import RightTabs, { type RightView } from "@/components/planner/RightTabs";
import ExpenseDialog, {
  type ExpenseFormState,
} from "@/components/planner/ExpenseDialog";
import {
  bookingFormFrom,
  emptyBookingForm,
  type BookingFormState,
} from "@/components/planner/BookingForm";
import RightRail from "@/components/planner/RightRail";
import CalendarView from "@/components/planner/CalendarView";
import TripDrawer from "@/components/planner/TripDrawer";
import TripSettingsModal from "@/components/planner/TripSettingsModal";
import MobileTabs from "@/components/planner/MobileTabs";
import Toast from "@/components/planner/Toast";

export type Editing = { key: ItemSectionKey; itemId: string | null } | null;
export type FormState = BookingFormState;
export type Overlay = "links" | "finances" | null;
export type MobileTab = "links" | "calendar" | "itinerary" | "finances";

const SECTION_ENUM = {
  stay: "STAY",
  transport: "TRANSPORT",
  activities: "ACTIVITIES",
} as const;

function validateBooking(f: BookingFormState): string | null {
  if (!f.t.trim()) return "Name is required.";
  if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim()))
    return "Link must start with http:// or https://";
  const cost = parseCost(f.cost);
  if (f.cost.trim() && cost === null)
    return "Cost must be a number, like 120 or 89.50.";
  if (cost !== null && cost < 0) return "Cost can't be negative.";
  if (cost !== null && f.shareIds.length === 0)
    return "Choose at least one person to split the cost with.";
  return null;
}

function parseCost(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const CARD =
  "bg-white rounded-card border border-line shadow-panel box-border overflow-hidden flex flex-col min-h-0";

function startOfTodayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

type DragState = { tripId: string; curStart: string; curEnd: string } | null;

export default function Planner({
  teamId,
  teamName,
  teamCurrency,
  teams,
  invites,
  members,
  currentUserId,
  userName,
  justSignedIn,
  initialTrips,
}: {
  teamId: string;
  teamName: string;
  teamCurrency: string;
  teams: TeamOption[];
  invites: InviteData[];
  members: MemberOption[];
  currentUserId: string;
  userName: string;
  justSignedIn: boolean;
  initialTrips: TripData[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const trips = initialTrips;

  const todayMs = useMemo(() => startOfTodayUTC(), []);
  const [vw, setVw] = useState(1440);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const [pendingOpenTripId, setPendingOpenTripId] = useState<string | null>(
    null,
  );
  const [editing, setEditing] = useState<Editing>(null);
  const blankForm = () => emptyBookingForm(members, currentUserId);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("calendar");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDefaults, setExpenseDefaults] = useState<{
    tripId: string | null;
    key: ItemSectionKey;
    date: string;
  }>({ tripId: null, key: "stay", date: "" });
  const [rightView, setRightView] = useState<RightView>("itinerary");
  const [itineraryTripId, setItineraryTripId] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [dragging, setDragging] = useState<DragState>(null);
  const [addingTrip, setAddingTrip] = useState(false);
  // React state updates aren't synchronous, so a state-only guard can miss
  // clicks that land before the first re-render (e.g. a fast double-click).
  // A ref is mutated immediately, so it closes that race.
  const addingTripRef = useRef(false);
  const [showSignedInToast, setShowSignedInToast] = useState(justSignedIn);

  useEffect(() => {
    if (!justSignedIn) return;
    // Consume the one-shot flash immediately so a page refresh a moment
    // later doesn't show the toast again.
    dismissSignedInToast();
    const t = setTimeout(() => setShowSignedInToast(false), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // A plain `resize` listener can miss the real viewport width on first
    // mount on mobile browsers (the layout viewport can still be settling
    // — toolbar collapse, zoom negotiation — with no further resize event
    // to correct it). ResizeObserver measures the actual rendered box
    // directly, including on its first callback, so it can't get stuck.
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setVw(width);
    });
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (pendingOpenTripId && trips.some((t) => t.id === pendingOpenTripId)) {
      setOpenTripId(pendingOpenTripId);
      setItineraryTripId(pendingOpenTripId);
      setPendingOpenTripId(null);
    }
  }, [trips, pendingOpenTripId]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  const mode = layoutMode(vw, LEFT_W, RIGHT_W, MIN_MAIN);
  const isMobile = mode === "mobile";
  const isCompact = mode === "compact";
  const activeOverlay = isCompact ? overlay : null;

  const width = mainWidth(vw, mode, LEFT_W, RIGHT_W, RAIL_W);

  const trip = trips.find((t) => t.id === openTripId) ?? null;
  // The itinerary follows the last stop you opened, falling back to the stop
  // happening now (or next).
  const itineraryTrip = trips.some((t) => t.id === itineraryTripId)
    ? itineraryTripId
    : defaultTripId(trips, todayMs);
  const plans = useMemo(() => plansByDate(trips), [trips]);

  function openTrip(tripId: string) {
    setOpenTripId(tripId);
    setItineraryTripId(tripId);
  }

  const events: CalendarEvent[] = useMemo(() => {
    const noteEvents: CalendarEvent[] = HOLIDAY_NOTES.map((n) => ({
      id: n.id,
      label: n.label,
      start: n.start,
      end: n.end,
      isNote: true,
      hasStay: false,
      hasTransport: false,
      color: null,
    }));
    const tripEvents: CalendarEvent[] = trips.map((t) => {
      const override = dragging && dragging.tripId === t.id;
      return {
        id: t.id,
        label: t.label,
        start: override ? dragging!.curStart : t.start,
        end: override ? dragging!.curEnd : t.end,
        isNote: false,
        hasStay: t.stay.some((i) => isScheduled(i, "stay")),
        hasTransport: t.transport.some((i) => isScheduled(i, "transport")),
        color: t.color,
      };
    });
    return noteEvents.concat(tripEvents);
  }, [trips, dragging]);

  const weeks = useMemo(
    () =>
      buildWeeks(cursor, events, {
        startWeekOn: "Sunday",
        mainWidth: width,
        todayMs,
        plannedDates: new Set(plans.keys()),
      }),
    [cursor, events, width, todayMs, plans],
  );

  function jumpToTrip(t: TripData, openDrawer = true) {
    const [y, m] = t.start.split("-").map(Number);
    setCursor({ y, m: m - 1 });
    setOverlay(null);
    setItineraryTripId(t.id);
    if (openDrawer) setOpenTripId(t.id);
    if (isMobile) setMobileTab("calendar");
  }

  async function handleAddTrip() {
    if (addingTripRef.current) return;
    addingTripRef.current = true;
    setAddingTrip(true);
    try {
      const id = await createTrip(teamId);
      setPendingOpenTripId(id);
      setOverlay(null);
      refresh();
    } catch {
      setNotification("The stop could not be added. Please try again.");
    } finally {
      addingTripRef.current = false;
      setAddingTrip(false);
    }
  }

  function handleDeleteTrip(tripId: string, label: string) {
    setDeleteError(null);
    setDeleteTarget({ id: tripId, label });
  }

  async function confirmDeleteTrip() {
    if (!deleteTarget || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await deleteTrip(deleteTarget.id);
      if (openTripId === deleteTarget.id) closeDrawer();
      setDeleteTarget(null);
      refresh();
    } catch {
      setDeleteError("This stop could not be deleted. Please try again.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  function closeDrawer() {
    setOpenTripId(null);
    setEditing(null);
  }

  function closeOverlay() {
    setOverlay(null);
    setOpenTripId(null);
    setEditing(null);
    setSettingsOpen(false);
  }

  function openSettings() {
    setOpenTripId(null);
    setEditing(null);
    setSettingsOpen(true);
  }

  function startAdd(key: ItemSectionKey) {
    setEditing({ key, itemId: null });
    setForm(blankForm());
    setFormError(null);
  }

  function startEdit(key: ItemSectionKey, itemId: string, current: FormState) {
    setEditing({ key, itemId });
    setForm(current);
    setFormError(null);
  }

  /** Saves a booking, applies staged attachment removals, then uploads new
   * PDFs. Throws on validation or save failure; upload failures are returned
   * so the caller can keep the failed files in the form for a retry. */
  async function persistBooking(
    target: { tripId: string; key: ItemSectionKey; itemId: string | null },
    f: BookingFormState,
  ): Promise<{ itemId: string; failed: File[]; uploadError: string | null }> {
    const payload = {
      title: f.t.trim(),
      url: f.url.trim(),
      location: f.location.trim(),
      costAmount: parseCost(f.cost),
      // Nobody paid or split anything when there's no cost.
      paidById: parseCost(f.cost) !== null && f.paidById ? f.paidById : null,
      shareIds: parseCost(f.cost) !== null ? f.shareIds : [],
      date: f.date || null,
      time: f.date && f.time ? f.time : null,
    };
    let itemId = target.itemId;
    if (itemId === null)
      itemId = await addItem(target.tripId, SECTION_ENUM[target.key], payload);
    else await updateItem(itemId, payload);
    await Promise.all(f.removeIds.map((id) => deleteAttachment(id)));
    const failed: File[] = [];
    let uploadError: string | null = null;
    for (const file of f.files) {
      try {
        await uploadPdf(itemId, file);
      } catch (e) {
        failed.push(file);
        uploadError ??= e instanceof Error ? e.message : String(e);
      }
    }
    refresh();
    return { itemId, failed, uploadError };
  }

  function keepFailedUploads(
    key: ItemSectionKey,
    itemId: string,
    f: BookingFormState,
    failed: File[],
    message: string | null,
  ) {
    setEditing({ key, itemId });
    setForm({ ...f, files: failed, removeIds: [] });
    setFormError(
      `Booking saved, but ${failed.length === 1 ? "a PDF" : `${failed.length} PDFs`} could not be uploaded. ${message ?? ""}`.trim(),
    );
  }

  async function saveExpense(f: ExpenseFormState) {
    if (savingRef.current) return;
    const problem = validateBooking(f);
    if (problem) {
      setExpenseError(problem);
      return;
    }
    if (!trips.some((t) => t.id === f.tripId)) {
      setExpenseError("Choose a stop for this expense.");
      return;
    }
    savingRef.current = true;
    setExpenseSaving(true);
    setExpenseError(null);
    try {
      const { itemId, failed, uploadError } = await persistBooking(
        { tripId: f.tripId, key: f.key, itemId: null },
        f,
      );
      setExpenseOpen(false);
      if (failed.length) {
        const t = trips.find((x) => x.id === f.tripId);
        if (t) jumpToTrip(t);
        keepFailedUploads(f.key, itemId, f, failed, uploadError);
      }
    } catch {
      setExpenseError("The expense could not be saved. Please try again.");
    } finally {
      savingRef.current = false;
      setExpenseSaving(false);
    }
  }

  function openExpenseFromPanel(t: TripData, key: ItemSectionKey, itemId: string) {
    const item = t[key].find((i) => i.id === itemId);
    if (!item) return;
    jumpToTrip(t);
    startEdit(key, itemId, bookingFormFrom(item, members));
  }

  function openExpense(defaults: {
    tripId?: string | null;
    key?: ItemSectionKey;
    date?: string;
  } = {}) {
    setExpenseDefaults({
      tripId: defaults.tripId ?? null,
      key: defaults.key ?? "stay",
      date: defaults.date ?? "",
    });
    setExpenseError(null);
    setExpenseOpen(true);
  }

  /** Opens whichever surface holds the right column at this width. */
  function openRightView(view: RightView) {
    setRightView(view);
    if (isMobile) setMobileTab(view);
    else if (isCompact) setOverlay("finances");
  }

  function onFormChange(f: FormState) {
    setForm(f);
    setFormError(null);
  }

  async function saveForm() {
    if (!editing || !trip || savingRef.current) return;
    const problem = validateBooking(form);
    if (problem) {
      setFormError(problem);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError(null);
    try {
      const { itemId, failed, uploadError } = await persistBooking(
        { tripId: trip.id, key: editing.key, itemId: editing.itemId },
        form,
      );
      if (failed.length)
        keepFailedUploads(editing.key, itemId, form, failed, uploadError);
      else {
        setEditing(null);
        setForm(blankForm());
      }
    } catch {
      setFormError("The booking could not be saved. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function removeItem(itemId: string) {
    try {
      await deleteItem(itemId);
      refresh();
    } catch {
      setNotification("The booking could not be removed. Please try again.");
    }
  }

  async function onSwitchTeam(id: string) {
    await switchTeam(id);
    refresh();
  }

  async function onRenameTeam(name: string) {
    await updateTeamName(teamId, name);
    refresh();
  }

  async function onChangeTeamCurrency(currency: string) {
    await updateTeamCurrency(teamId, currency);
    refresh();
  }

  async function handleCreateInvite() {
    const token = await createInvite(teamId);
    refresh();
    return token;
  }

  async function onUpdateStopDates(tripId: string, start: string, end: string) {
    await updateStopDates(tripId, start, end);
    refresh();
  }

  async function onRenameTrip(tripId: string, label: string) {
    await updateTripLabel(tripId, label);
    refresh();
  }

  async function onChangeTripColor(tripId: string, color: string) {
    await updateTripColor(tripId, color);
    refresh();
  }

  function onResizeStart(
    tripId: string,
    edge: "left" | "right",
    startClientX: number,
  ) {
    const t = trips.find((x) => x.id === tripId);
    if (!t) return;
    const origStart = t.start;
    const origEnd = t.end;
    const cellW = Math.max(28, width / 7);
    let cur = { start: origStart, end: origEnd };
    setDragging({ tripId, curStart: origStart, curEnd: origEnd });
    document.body.style.userSelect = "none";

    function onMove(e: PointerEvent) {
      const deltaDays = Math.round((e.clientX - startClientX) / cellW);
      if (edge === "left") {
        const startMs = Math.min(ms(origStart) + deltaDays * DAY, ms(origEnd));
        cur = { start: toDateInput(startMs), end: origEnd };
      } else {
        const endMs = Math.max(ms(origEnd) + deltaDays * DAY, ms(origStart));
        cur = { start: origStart, end: toDateInput(endMs) };
      }
      setDragging({ tripId, curStart: cur.start, curEnd: cur.end });
    }

    async function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      setDragging(null);
      if (cur.start !== origStart || cur.end !== origEnd) {
        await updateStopDates(tripId, cur.start, cur.end);
        refresh();
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Dragging the body of a bar shifts both dates together (moves the stop
  // without changing its length); a plain click (no meaningful movement)
  // opens the drawer instead. CLICK_THRESHOLD_PX tells them apart.
  const CLICK_THRESHOLD_PX = 4;

  function onBarPointerDown(tripId: string, startClientX: number) {
    const t = trips.find((x) => x.id === tripId);
    if (!t) return;
    const origStart = t.start;
    const origEnd = t.end;
    const cellW = Math.max(28, width / 7);
    let cur = { start: origStart, end: origEnd };
    let hasMoved = false;

    function onMove(e: PointerEvent) {
      const deltaPx = e.clientX - startClientX;
      if (!hasMoved) {
        if (Math.abs(deltaPx) < CLICK_THRESHOLD_PX) return;
        hasMoved = true;
        document.body.style.userSelect = "none";
      }
      const deltaDays = Math.round(deltaPx / cellW);
      cur = {
        start: toDateInput(ms(origStart) + deltaDays * DAY),
        end: toDateInput(ms(origEnd) + deltaDays * DAY),
      };
      setDragging({ tripId, curStart: cur.start, curEnd: cur.end });
    }

    async function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (!hasMoved) {
        openTrip(tripId);
        return;
      }
      document.body.style.userSelect = "";
      setDragging(null);
      if (cur.start !== origStart || cur.end !== origEnd) {
        await updateStopDates(tripId, cur.start, cur.end);
        refresh();
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const tripTotal = trips.reduce(
    (sum, t) =>
      sum +
      sectionTotal(t.stay) +
      sectionTotal(t.transport) +
      sectionTotal(t.activities),
    0,
  );

  const shellClass = isMobile
    ? "flex flex-col gap-2.5 p-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-[max(0.625rem,env(safe-area-inset-bottom))] h-dvh box-border relative bg-canvas text-ink"
    : "grid gap-3 p-3 h-dvh box-border relative bg-canvas text-ink";
  const shellStyle = isMobile
    ? undefined
    : {
        gridTemplateColumns: isCompact
          ? `${RAIL_W}px minmax(0,1fr) ${RAIL_W}px`
          : `${LEFT_W}px minmax(${MIN_MAIN}px,1fr) ${RIGHT_W}px`,
      };

  const showBackdrop = !!activeOverlay;
  const showLeftRail = isCompact;
  const showRightRail = isCompact;
  const showLeftPanel = isMobile
    ? mobileTab === "links"
    : mode === "full" || activeOverlay === "links";
  const showRightPanel = isMobile
    ? mobileTab === "finances" || mobileTab === "itinerary"
    : mode === "full" || activeOverlay === "finances";
  const shownRightView: RightView = isMobile
    ? mobileTab === "itinerary"
      ? "itinerary"
      : "finances"
    : rightView;
  // On mobile the bottom tab bar already switches between the two views.
  const rightTabs = isMobile ? undefined : (
    <RightTabs view={rightView} onChange={setRightView} />
  );
  const showCalendar = isMobile ? mobileTab === "calendar" : true;

  const now = new Date();
  const todayLabel = `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()]} ${now.getDate()} ${MONTHS_LONG[now.getMonth()].slice(0, 3)}`;

  return (
    <div className={shellClass} style={shellStyle}>
      {showSignedInToast && !notification && (
        <Toast message={`Signed in as ${userName}`} />
      )}
      {notification && (
        <Toast message={notification} onDismiss={() => setNotification(null)} />
      )}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle className="text-balance text-lg font-semibold">
            Delete {deleteTarget?.label}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-pretty text-sm leading-relaxed text-muted">
            This removes the stop and all its stay, transport and activity
            bookings. This cannot be undone.
          </AlertDialogDescription>
          {deleteError && (
            <p role="alert" className="field-error">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-3">
            <AlertDialogCancel disabled={deleting}>Keep stop</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={confirmDeleteTrip}
            >
              {deleting && <Loader2 className="animate-spin" />}
              {deleting ? "Deleting…" : "Delete stop"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {showBackdrop && (
        <div
          aria-hidden="true"
          onClick={closeOverlay}
          className="absolute inset-0 z-backdrop bg-ink/15"
        />
      )}

      {isMobile && (
        <MobileTabs
          active={mobileTab}
          onChange={setMobileTab}
        />
      )}

      {showLeftRail && (
        <LeftRail
          trips={trips}
          onOpenLinks={() => setOverlay("links")}
          onOpenTrip={(t) => jumpToTrip(t)}
        />
      )}

      {showLeftPanel && (
        <LeftPanel
          card={CARD}
          overlay={activeOverlay === "links"}
          isMobile={isMobile}
          trips={trips}
          selectedTripId={openTripId}
          teams={teams}
          teamId={teamId}
          teamName={teamName}
          userName={userName}
          onSwitchTeam={onSwitchTeam}
          onOpenSettings={openSettings}
          onSelectTrip={(t) => jumpToTrip(t)}
          onAddTrip={handleAddTrip}
          addingTrip={addingTrip}
          onDeleteTrip={handleDeleteTrip}
          onClose={closeOverlay}
          showClose={!!activeOverlay}
          todayLabel={todayLabel}
        />
      )}

      {showCalendar && (
        <main
          className={
            CARD +
            (isMobile
              ? " p-4 pt-4 pb-1.5 flex-1 min-h-0"
              : " p-5 pt-5 pb-1.5 min-w-0")
          }
        >
          <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h1 className="m-0 whitespace-nowrap text-2xl font-normal tabular-nums text-muted">
              <TransitionText value={`${cursor.y}-${cursor.m}`}>
                <strong className="font-semibold text-ink">
                  {MONTHS_LONG[cursor.m]}
                </strong>{" "}
                {cursor.y}
              </TransitionText>
            </h1>
            <div className="flex items-center gap-1.5 flex-none">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() =>
                  setCursor((c) =>
                    c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 },
                  )
                }
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const d = new Date();
                  setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() =>
                  setCursor((c) =>
                    c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 },
                  )
                }
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </header>

          <CalendarView
            weeks={weeks}
            width={width}
            onBarPointerDown={onBarPointerDown}
            onOpenTrip={openTrip}
            onResizeStart={onResizeStart}
            plans={plans}
          />
        </main>
      )}

      {showRightPanel && shownRightView === "itinerary" && (
        <ItineraryPanel
          card={CARD}
          overlay={activeOverlay === "finances"}
          isMobile={isMobile}
          tabs={
            rightTabs ?? (
              <h2 className="panel-heading">Itinerary</h2>
            )
          }
          trips={trips}
          tripId={itineraryTrip}
          currency={teamCurrency}
          todayDate={toDateInput(todayMs)}
          onSelectTrip={setItineraryTripId}
          onOpenItem={openExpenseFromPanel}
          onAddPlan={(tripId, date) =>
            openExpense({ tripId, key: "activities", date: date ?? "" })
          }
          onClose={closeOverlay}
          showClose={!!activeOverlay}
        />
      )}

      {showRightPanel && shownRightView === "finances" && (
        <FinancePanel
          card={CARD}
          overlay={activeOverlay === "finances"}
          isMobile={isMobile}
          tabs={rightTabs}
          trips={trips}
          members={members}
          currentUserId={currentUserId}
          currency={teamCurrency}
          total={tripTotal}
          onOpenItem={openExpenseFromPanel}
          onAddExpense={() => openExpense()}
          canAddExpense={trips.length > 0}
          onClose={closeOverlay}
          showClose={!!activeOverlay}
        />
      )}

      {showRightRail && (
        <RightRail
          total={tripTotal}
          currency={teamCurrency}
          onOpenFinances={() => openRightView("finances")}
          onOpenItinerary={() => openRightView("itinerary")}
        />
      )}

      <AnimatePresence initial={false}>
        {trip && (
          <TripDrawer
            key={trip.id}
            trip={trip}
            currency={teamCurrency}
            members={members}
            currentUserId={currentUserId}
            isMobile={isMobile}
            editing={editing}
            form={form}
            formError={formError}
            saving={saving}
            onFormChange={onFormChange}
            onFormError={setFormError}
            onClose={closeDrawer}
            onStartAdd={startAdd}
            onStartEdit={startEdit}
            onCancelForm={() => {
              setEditing(null);
              setFormError(null);
            }}
            onSaveForm={saveForm}
            onDeleteItem={removeItem}
            onUpdateDates={onUpdateStopDates}
            onRename={onRenameTrip}
            onChangeColor={onChangeTripColor}
            onDeleteTrip={handleDeleteTrip}
          />
        )}

        {expenseOpen && (
          <ExpenseDialog
            key="expense"
            trips={trips}
            defaultTripId={
              expenseDefaults.tripId ?? openTripId ?? trips[0]?.id ?? ""
            }
            defaultKey={expenseDefaults.key}
            defaultDate={expenseDefaults.date}
            members={members}
            currentUserId={currentUserId}
            currency={teamCurrency}
            isMobile={isMobile}
            error={expenseError}
            onError={setExpenseError}
            saving={expenseSaving}
            onSave={saveExpense}
            onClose={() => {
              if (!expenseSaving) setExpenseOpen(false);
            }}
          />
        )}

        {settingsOpen && (
          <TripSettingsModal
            key="settings"
            teamName={teamName}
            currency={teamCurrency}
            members={members}
            currentUserId={currentUserId}
            invites={invites}
            onClose={() => setSettingsOpen(false)}
            onRename={onRenameTeam}
            onChangeCurrency={onChangeTeamCurrency}
            onCreateInvite={handleCreateInvite}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
