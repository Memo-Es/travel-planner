"use client";

import { Hotel } from "lucide-react";
import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import { isScheduled } from "@/lib/tripSections";
import { logout } from "@/actions/team";

const ACCENT = "oklch(0.62 0.19 285)";
const ACCENT_SOFT = "oklch(0.93 0.045 288)";
const ACCENT_INK = "oklch(0.42 0.16 285)";

export default function LeftPanel({
  card,
  overlay,
  isMobile,
  trips,
  teams,
  teamId,
  teamName,
  userName,
  onSwitchTeam,
  onOpenSettings,
  onSelectTrip,
  onAddTrip,
  addingTrip,
  onDeleteTrip,
  onClose,
  showClose,
  todayLabel,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  trips: TripData[];
  teams: TeamOption[];
  teamId: string;
  teamName: string;
  userName: string;
  onSwitchTeam: (id: string) => void;
  onOpenSettings: () => void;
  onSelectTrip: (t: TripData) => void;
  onAddTrip: () => void;
  addingTrip: boolean;
  onDeleteTrip: (id: string, label: string) => void;
  onClose: () => void;
  showClose: boolean;
  todayLabel: string;
}) {
  const overlayBox =
    "absolute top-3 bottom-3 z-20 w-[272px] shadow-[0_18px_44px_rgba(28,27,25,0.18)] left-[74px]";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  return (
    <aside className={card + " p-[22px_20px] " + positionClass}>
      <div className="flex items-center justify-between gap-2.5 mb-1">
        <button
          onClick={onOpenSettings}
          title="Trip settings"
          className="flex items-center gap-2.5 bg-transparent border-0 p-0 -m-0.5 pr-1.5 rounded-lg cursor-pointer text-left min-w-0 hover:bg-hover"
        >
          <span className="w-[11px] h-[11px] rounded-full block flex-none" style={{ background: ACCENT }} />
          <h2 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink overflow-hidden text-ellipsis whitespace-nowrap">
            {teamName}
          </h2>
        </button>
        {showClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-line bg-white cursor-pointer text-ink-soft text-[13px] flex-none hover:bg-hover"
          >
            ✕
          </button>
        )}
      </div>

      {teams.length > 1 && (
        <select
          value={teamId}
          onChange={(e) => onSwitchTeam(e.target.value)}
          className="text-[12px] text-muted-2 bg-transparent border-0 cursor-pointer mb-4 -mt-0.5"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      <nav className={"flex flex-col gap-[3px]" + (teams.length > 1 ? "" : " mt-5")}>
        {trips.map((t, i) => (
          <div key={t.id} className="flex items-center gap-0.5 -mx-2">
            <button
              onClick={() => onSelectTrip(t)}
              className="flex-1 min-w-0 grid items-center gap-2 bg-transparent border-0 py-2.5 px-2 rounded-lg cursor-pointer text-left text-[14.5px] text-ink-soft hover:bg-hover"
              style={{ gridTemplateColumns: "22px 1fr auto auto" }}
            >
              <span
                className="w-3 h-3 rounded block"
                style={{ background: i % 2 ? ACCENT_SOFT : ACCENT }}
              />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">{t.label}</span>
              {t.stay.some(isScheduled) && (
                <Hotel size={13} strokeWidth={2} className="flex-none" style={{ color: ACCENT_INK }} />
              )}
              <span className="text-[12px] text-muted-3 whitespace-nowrap [font-variant-numeric:tabular-nums]">
                {fmtRange(t.start, t.end)}
              </span>
            </button>
            <button
              onClick={() => onDeleteTrip(t.id, t.label)}
              title="Delete stop"
              className="w-7 h-7 flex-none border-0 rounded-lg bg-transparent cursor-pointer text-muted-4 text-[12px] hover:bg-line-soft hover:text-ink-soft"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={onAddTrip}
          disabled={addingTrip}
          className="flex items-center gap-2.5 bg-transparent border-0 py-2.5 px-2 mt-1 -mx-2 rounded-lg cursor-pointer text-[18px] leading-none text-muted-4 hover:bg-hover hover:text-ink disabled:opacity-50 disabled:cursor-default"
        >
          {addingTrip ? "…" : "+"}
        </button>
      </nav>

      <div className="flex-1 min-h-4" />

      <div className="flex items-end justify-between gap-2">
        <div className="text-[13px] leading-[1.45] text-muted-2">
          <div>{todayLabel}</div>
          <div>{trips.length} stops planned</div>
        </div>
        <span className="w-[17px] h-[17px] rounded-full border-[1.5px] border-line block flex-none" />
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-semibold flex-none"
            style={{ background: ACCENT_SOFT, color: ACCENT_INK }}
          >
            {initials(userName)}
          </span>
          <span className="text-[12.5px] text-muted-2 overflow-hidden text-ellipsis whitespace-nowrap">
            {userName}
          </span>
        </div>
        <form action={logout} className="flex-none">
          <button
            type="submit"
            className="text-[12.5px] text-muted-3 bg-transparent border-0 p-0 cursor-pointer hover:text-muted whitespace-nowrap"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
