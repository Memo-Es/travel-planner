"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TripData, TaskData, TeamOption, InviteData, ItemSectionKey } from "@/lib/types";
import { buildWeeks, layoutMode, mainWidth, type CalendarEvent } from "@/lib/calendar";
import { MONTHS_LONG, DAY, ms, toDateInput } from "@/lib/dates";
import { HOLIDAY_NOTES } from "@/lib/demoData";
import { LEFT_W, RIGHT_W, RAIL_W, MIN_MAIN } from "@/lib/theme";
import { createTrip, addItem, updateItem, deleteItem, deleteTrip, updateStopDates } from "@/actions/trips";
import { createTask, toggleTask } from "@/actions/tasks";
import { switchTeam, updateTeamName, updateTeamCurrency, createInvite } from "@/actions/team";

import LeftPanel from "@/components/planner/LeftPanel";
import LeftRail from "@/components/planner/LeftRail";
import RightPanel from "@/components/planner/RightPanel";
import RightRail from "@/components/planner/RightRail";
import CalendarView from "@/components/planner/CalendarView";
import TripDrawer from "@/components/planner/TripDrawer";
import TripSettingsModal from "@/components/planner/TripSettingsModal";
import MobileTabs from "@/components/planner/MobileTabs";

export type Editing = { key: ItemSectionKey; itemId: string | null } | null;
export type FormState = { t: string; url: string; cost: string };
export type Overlay = "links" | "tasks" | null;
export type MobileTab = "links" | "calendar" | "tasks";

function parseCost(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const CARD = "bg-white rounded-card border border-line box-border overflow-hidden flex flex-col";

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
  initialTrips,
  initialTasks,
}: {
  teamId: string;
  teamName: string;
  teamCurrency: string;
  teams: TeamOption[];
  invites: InviteData[];
  initialTrips: TripData[];
  initialTasks: TaskData[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const trips = initialTrips;
  const tasks = initialTasks;

  const todayMs = useMemo(() => startOfTodayUTC(), []);
  const [vw, setVw] = useState(1440);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [openTripId, setOpenTripId] = useState<string | null>(null);
  const [pendingOpenTripId, setPendingOpenTripId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState<FormState>({ t: "", url: "", cost: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("calendar");
  const [draft, setDraft] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragging, setDragging] = useState<DragState>(null);
  const [addingTrip, setAddingTrip] = useState(false);
  // React state updates aren't synchronous, so a state-only guard can miss
  // clicks that land before the first re-render (e.g. a fast double-click).
  // A ref is mutated immediately, so it closes that race.
  const addingTripRef = useRef(false);

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

  const events: CalendarEvent[] = useMemo(() => {
    const noteEvents: CalendarEvent[] = HOLIDAY_NOTES.map((n) => ({
      id: n.id,
      label: n.label,
      start: n.start,
      end: n.end,
      isNote: true,
    }));
    const tripEvents: CalendarEvent[] = trips.map((t) => {
      const override = dragging && dragging.tripId === t.id;
      return {
        id: t.id,
        label: t.label,
        start: override ? dragging!.curStart : t.start,
        end: override ? dragging!.curEnd : t.end,
        isNote: false,
      };
    });
    return noteEvents.concat(tripEvents);
  }, [trips, dragging]);

  const weeks = useMemo(
    () => buildWeeks(cursor, events, { startWeekOn: "Sunday", mainWidth: width, todayMs }),
    [cursor, events, width, todayMs],
  );

  function jumpToTrip(t: TripData, openDrawer = true) {
    const [y, m] = t.start.split("-").map(Number);
    setCursor({ y, m: m - 1 });
    setOverlay(null);
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
    } finally {
      addingTripRef.current = false;
      setAddingTrip(false);
    }
  }

  async function handleDeleteTrip(tripId: string, label: string) {
    if (!window.confirm(`Delete "${label}"? This removes its stay, transport and activity entries too.`)) return;
    if (openTripId === tripId) closeDrawer();
    await deleteTrip(tripId);
    refresh();
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
    setForm({ t: "", url: "", cost: "" });
    setFormError(null);
  }

  function startEdit(key: ItemSectionKey, itemId: string, current: FormState) {
    setEditing({ key, itemId });
    setForm(current);
    setFormError(null);
  }

  function onFormChange(f: FormState) {
    setForm(f);
    setFormError(null);
  }

  async function saveForm() {
    if (!editing || !trip) return;
    if (!form.t.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) {
      setFormError("Link must start with http:// or https://");
      return;
    }
    setFormError(null);
    const payload = { title: form.t.trim(), url: form.url.trim(), costAmount: parseCost(form.cost) };
    const section = editing.key.toUpperCase() as "STAY" | "TRANSPORT" | "ACTIVITIES";
    if (editing.itemId === null) {
      await addItem(trip.id, section, payload);
    } else {
      await updateItem(editing.itemId, payload);
    }
    setEditing(null);
    setForm({ t: "", url: "", cost: "" });
    refresh();
  }

  async function removeItem(itemId: string) {
    await deleteItem(itemId);
    refresh();
  }

  async function onToggleTask(id: string) {
    await toggleTask(id);
    refresh();
  }

  async function submitDraftTask() {
    const value = draft.trim();
    if (!value) return;
    setDraft("");
    await createTask(teamId, value);
    refresh();
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

  function onResizeStart(tripId: string, edge: "left" | "right", startClientX: number) {
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
        setOpenTripId(tripId);
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

  const openCount = tasks.filter((t) => !t.done).length;

  const shellClass = isMobile
    ? "flex flex-col gap-2.5 p-2.5 h-screen box-border relative bg-canvas text-ink"
    : "grid gap-3 p-3 h-screen box-border relative bg-canvas text-ink";
  const shellStyle = isMobile
    ? undefined
    : {
        gridTemplateColumns: isCompact
          ? `${RAIL_W}px minmax(0,1fr) ${RAIL_W}px`
          : `${LEFT_W}px minmax(${MIN_MAIN}px,1fr) ${RIGHT_W}px`,
      };

  const showBackdrop = !!activeOverlay || !!trip || settingsOpen;
  const showLeftRail = isCompact;
  const showRightRail = isCompact;
  const showLeftPanel = isMobile ? mobileTab === "links" : mode === "full" || activeOverlay === "links";
  const showRightPanel = isMobile ? mobileTab === "tasks" : mode === "full" || activeOverlay === "tasks";
  const showCalendar = isMobile ? mobileTab === "calendar" : true;

  const now = new Date();
  const todayLabel =
    ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()] +
    " " +
    now.getDate() +
    " " +
    MONTHS_LONG[now.getMonth()].slice(0, 3);

  return (
    <div className={shellClass} style={shellStyle}>
      {showBackdrop && (
        <div
          onClick={closeOverlay}
          className="absolute inset-0 z-[15]"
          style={{ background: "rgba(28,27,25,0.16)" }}
        />
      )}

      {isMobile && (
        <MobileTabs
          active={mobileTab}
          openCount={openCount}
          onChange={setMobileTab}
        />
      )}

      {showLeftRail && (
        <LeftRail trips={trips} onOpenLinks={() => setOverlay("links")} onOpenTrip={(t) => jumpToTrip(t)} />
      )}

      {showLeftPanel && (
        <LeftPanel
          card={CARD}
          overlay={activeOverlay === "links"}
          isMobile={isMobile}
          trips={trips}
          teams={teams}
          teamId={teamId}
          teamName={teamName}
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
        <main className={CARD + (isMobile ? " p-4 pt-4 pb-1.5 flex-1 min-h-0" : " p-5 pt-5 pb-1.5 min-w-0")}>
          <header className="flex items-center justify-between gap-3 mb-4">
            <h1 className="m-0 text-[24px] font-normal tracking-[-0.02em] text-muted whitespace-nowrap">
              <strong className="font-bold text-ink">{MONTHS_LONG[cursor.m]}</strong> {cursor.y}
            </h1>
            <div className="flex items-center gap-1.5 flex-none">
              <button
                onClick={() => setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
                className="w-[34px] h-8 rounded-[9px] border border-line bg-white cursor-pointer text-ink-soft text-[13px] hover:bg-hover"
              >
                ‹
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  setCursor({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
                }}
                className="h-8 px-3.5 rounded-[9px] border border-line bg-hover cursor-pointer text-[13.5px] text-ink-soft hover:bg-hover-2"
              >
                Today
              </button>
              <button
                onClick={() => setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
                className="w-[34px] h-8 rounded-[9px] border border-line bg-white cursor-pointer text-ink-soft text-[13px] hover:bg-hover"
              >
                ›
              </button>
            </div>
          </header>

          <CalendarView
            weeks={weeks}
            width={width}
            onBarPointerDown={onBarPointerDown}
            onResizeStart={onResizeStart}
          />
        </main>
      )}

      {showRightPanel && (
        <RightPanel
          card={CARD}
          overlay={activeOverlay === "tasks"}
          isMobile={isMobile}
          tasks={tasks}
          openCount={openCount}
          draft={draft}
          onDraftChange={setDraft}
          onDraftSubmit={submitDraftTask}
          onToggleTask={onToggleTask}
          onClose={closeOverlay}
          showClose={!!activeOverlay}
        />
      )}

      {showRightRail && <RightRail openCount={openCount} onOpenTasks={() => setOverlay("tasks")} />}

      {trip && (
        <TripDrawer
          trip={trip}
          currency={teamCurrency}
          isMobile={isMobile}
          editing={editing}
          form={form}
          formError={formError}
          onFormChange={onFormChange}
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
        />
      )}

      {settingsOpen && (
        <TripSettingsModal
          teamName={teamName}
          currency={teamCurrency}
          invites={invites}
          onClose={() => setSettingsOpen(false)}
          onRename={onRenameTeam}
          onChangeCurrency={onChangeTeamCurrency}
          onCreateInvite={handleCreateInvite}
        />
      )}
    </div>
  );
}
