"use client";

import type { TaskData } from "@/lib/types";

const TASK_GREEN = "oklch(0.7 0.15 155)";

export default function RightPanel({
  card,
  overlay,
  isMobile,
  tasks,
  openCount,
  draft,
  onDraftChange,
  onDraftSubmit,
  onToggleTask,
  onClose,
  showClose,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  tasks: TaskData[];
  openCount: number;
  draft: string;
  onDraftChange: (v: string) => void;
  onDraftSubmit: () => void;
  onToggleTask: (id: string) => void;
  onClose: () => void;
  showClose: boolean;
}) {
  const overlayBox =
    "absolute top-3 bottom-3 z-20 w-[272px] shadow-[0_18px_44px_rgba(28,27,25,0.18)] right-[74px]";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  return (
    <aside className={card + " p-[22px_20px_16px] " + positionClass}>
      <div className="flex items-center justify-between gap-2.5 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-[11px] h-[11px] rounded-full block" style={{ background: TASK_GREEN }} />
          <h2 className="m-0 text-[21px] font-semibold tracking-[-0.01em] text-ink">
            Tasks <span className="text-muted-3 font-normal">[{openCount}]</span>
          </h2>
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

      <div className="flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden min-h-0">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onToggleTask(task.id)}
            className="grid items-start gap-2.5 bg-transparent border-0 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer text-left w-auto min-h-[44px] box-border hover:bg-[#f7f6f4]"
            style={{ gridTemplateColumns: "18px 1fr" }}
          >
            <span
              className="w-[17px] h-[17px] rounded-[5px] flex items-center justify-center text-[11px] text-white mt-[1px]"
              style={
                task.done
                  ? { background: TASK_GREEN, border: `1px solid ${TASK_GREEN}` }
                  : { background: "#fff", border: "1.5px solid #d8d5d0" }
              }
            >
              {task.done ? "✓" : ""}
            </span>
            <span
              className="text-[14.5px] leading-[1.35]"
              style={{
                color: task.done ? "#b0aca6" : "#34322e",
                textDecoration: task.done ? "line-through" : "none",
              }}
            >
              {task.title}
              <span className="block text-[12px] text-muted-4 mt-0.5" style={{ textDecoration: "none" }}>
                {task.tag}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-3" />

      <input
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDraftSubmit();
        }}
        placeholder="+ New Task (⏎)"
        className="w-full box-border h-11 border border-line rounded-[10px] bg-[#f7f6f4] px-3.5 text-[14px] text-ink-soft flex-none"
      />
    </aside>
  );
}
