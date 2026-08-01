"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TripData, TaskData, TeamOption, ItemSectionKey } from "@/lib/types";
import { buildWeeks, layoutMode, mainWidth, type CalendarEvent } from "@/lib/calendar";
import { MONTHS_LONG } from "@/lib/dates";
import { HOLIDAY_NOTES } from "@/lib/demoData";
import { LEFT_W, RIGHT_W, RAIL_W, MIN_MAIN } from "@/lib/theme";
import { createTrip, addItem, updateItem, deleteItem, updateTripCurrency } from "@/actions/trips";
import { createTask, toggleTask } from "@/actions/tasks";
import { logout, switchTeam } from "@/actions/team";

import LeftPanel from "@/components/planner/LeftPanel";
import LeftRail from "@/components/planner/LeftRail";
import RightPanel from "@/components/planner/RightPanel";
import RightRail from "@/components/planner/RightRail";
import CalendarView from "@/components/planner/CalendarView";
import TripDrawer from "@/components/planner/TripDrawer";
import MobileTabs from "@/components/planner/MobileTabs";

export type Editing = { key: ItemSectionKey; itemId: string | null } | null;
export type FormState = { t: string; url: string; cost: string };

function parseCost(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
export type Overlay = "links" | "tasks" | null;
export type MobileTab = "links" | "calendar" | "tasks";

const CARD = "bg-white rounded-card border border-line box-border overflow-hidden flex flex-col";

function startOfTodayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export default function Planner({
  teamId,
  teams,
  initialTrips,
  initialTasks,
}: {
  teamId: string;
  teams: TeamOption[];
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
  const [mobileTab, setMobileTab] = useState<MobileTab>("calendar");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
    const tripEvents: CalendarEvent[] = trips.map((t) => ({
      id: t.id,
      label: t.label,
      start: t.start,
      end: t.end,
      isNote: false,
    }));
    return noteEvents.concat(tripEvents);
  }, [trips]);

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
    const id = await createTrip(teamId);
    setPendingOpenTripId(id);
    setOverlay(null);
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
  }

  function startAdd(key: ItemSectionKey) {
    setEditing({ key, itemId: null });
    setForm({ t: "", url: "", cost: "" });
  }

  function startEdit(key: ItemSectionKey, itemId: string, current: FormState) {
    setEditing({ key, itemId });
    setForm(current);
  }

  async function saveForm() {
    if (!editing || !trip || !form.t.trim()) return;
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

  async function onChangeCurrency(currency: string) {
    if (!trip) return;
    await updateTripCurrency(trip.id, currency);
    refresh();
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

  const showBackdrop = !!activeOverlay || !!trip;
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
          onSwitchTeam={onSwitchTeam}
          onSelectTrip={(t) => jumpToTrip(t)}
          onAddTrip={handleAddTrip}
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

          <CalendarView weeks={weeks} width={width} onOpenTrip={(id) => setOpenTripId(id)} />
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
          isMobile={isMobile}
          editing={editing}
          form={form}
          onFormChange={setForm}
          onClose={closeDrawer}
          onStartAdd={startAdd}
          onStartEdit={startEdit}
          onCancelForm={() => setEditing(null)}
          onSaveForm={saveForm}
          onDeleteItem={removeItem}
          onChangeCurrency={onChangeCurrency}
        />
      )}

      {isMobile && (
        <MobileTabs
          active={mobileTab}
          openCount={openCount}
          onChange={setMobileTab}
        />
      )}

      <form action={logout} className="fixed top-3 right-3 z-50">
        <button
          type="submit"
          className="h-7 px-2.5 rounded-lg border border-line bg-white/90 backdrop-blur-sm text-[12px] text-muted-3 cursor-pointer hover:text-muted hover:bg-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
