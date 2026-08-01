"use client";

import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";

const ACCENT = "oklch(0.62 0.19 285)";
const ACCENT_SOFT = "oklch(0.93 0.045 288)";

export default function LeftPanel({
  card,
  overlay,
  isMobile,
  trips,
  teams,
  teamId,
  teamName,
  onSwitchTeam,
  onOpenSettings,
  onSelectTrip,
  onAddTrip,
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
  onSwitchTeam: (id: string) => void;
  onOpenSettings: () => void;
  onSelectTrip: (t: TripData) => void;
  onAddTrip: () => void;
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
          <button
            key={t.id}
            onClick={() => onSelectTrip(t)}
            className="grid items-center gap-2.5 bg-transparent border-0 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer text-left text-[14.5px] text-ink-soft hover:bg-hover"
            style={{ gridTemplateColumns: "22px 1fr auto" }}
          >
            <span
              className="w-3 h-3 rounded block"
              style={{ background: i % 2 ? ACCENT_SOFT : ACCENT }}
            />
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{t.label}</span>
            <span className="text-[12px] text-muted-3 whitespace-nowrap [font-variant-numeric:tabular-nums]">
              {fmtRange(t.start, t.end)}
            </span>
          </button>
        ))}
        <button
          onClick={onAddTrip}
          className="flex items-center gap-2.5 bg-transparent border-0 py-2.5 px-2 mt-1 -mx-2 rounded-lg cursor-pointer text-[18px] leading-none text-muted-4 hover:bg-hover hover:text-ink"
        >
          +
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
    </aside>
  );
}
