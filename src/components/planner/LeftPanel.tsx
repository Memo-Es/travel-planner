"use client";

import type { TripData, TeamOption } from "@/lib/types";
import { fmtRange } from "@/lib/dates";
import InviteButton from "@/components/planner/InviteButton";

const ACCENT = "oklch(0.62 0.19 285)";
const ACCENT_SOFT = "oklch(0.93 0.045 288)";

export default function LeftPanel({
  card,
  overlay,
  isMobile,
  trips,
  teams,
  teamId,
  onSwitchTeam,
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
  onSwitchTeam: (id: string) => void;
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
      <div className="flex items-center justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-[11px] h-[11px] rounded-full block" style={{ background: ACCENT }} />
          <h2 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink">Trips</h2>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-line bg-white cursor-pointer text-ink-soft text-[13px] hover:bg-hover"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mb-5">
        {teams.length > 1 ? (
          <select
            value={teamId}
            onChange={(e) => onSwitchTeam(e.target.value)}
            className="text-[12px] text-muted-2 bg-transparent border-0 cursor-pointer max-w-[140px] truncate"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-[12px] text-muted-2 truncate">{teams[0]?.name}</span>
        )}
        <InviteButton teamId={teamId} />
      </div>

      <nav className="flex flex-col gap-[3px]">
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
          <div>{trips.length} trips planned</div>
        </div>
        <span className="w-[17px] h-[17px] rounded-full border-[1.5px] border-line block flex-none" />
      </div>
    </aside>
  );
}
