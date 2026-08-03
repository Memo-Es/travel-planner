"use client";

import type { KeyboardEvent } from "react";
import { CornerDownLeft, Plus, X } from "lucide-react";
import type { TaskData, MemberOption } from "@/lib/types";
import type { TaskFormState } from "@/components/Planner";

const TASK_GREEN = "oklch(0.7 0.15 155)";

export default function RightPanel({
  card,
  overlay,
  isMobile,
  tasks,
  members,
  openCount,
  draft,
  onDraftChange,
  onDraftSubmit,
  onToggleTask,
  editingTaskId,
  taskForm,
  taskFormError,
  onStartEditTask,
  onTaskFormChange,
  onCancelTaskEdit,
  onSaveTaskEdit,
  onDeleteTask,
  onClose,
  showClose,
}: {
  card: string;
  overlay: boolean;
  isMobile: boolean;
  tasks: TaskData[];
  members: MemberOption[];
  openCount: number;
  draft: string;
  onDraftChange: (v: string) => void;
  onDraftSubmit: () => void;
  onToggleTask: (id: string) => void;
  editingTaskId: string | null;
  taskForm: TaskFormState;
  taskFormError: string | null;
  onStartEditTask: (task: TaskData) => void;
  onTaskFormChange: (f: TaskFormState) => void;
  onCancelTaskEdit: () => void;
  onSaveTaskEdit: () => void;
  onDeleteTask: (id: string) => void;
  onClose: () => void;
  showClose: boolean;
}) {
  const overlayBox =
    "absolute top-3 bottom-3 z-20 w-[272px] shadow-[0_18px_44px_rgba(28,27,25,0.18)] right-[74px]";
  const positionClass = overlay ? overlayBox : isMobile ? "flex-1 min-h-0" : "";

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onSaveTaskEdit();
    if (e.key === "Escape") onCancelTaskEdit();
  }

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
            className="w-7 h-7 rounded-lg border border-line bg-white cursor-pointer text-ink-soft flex items-center justify-center hover:bg-hover"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto overflow-x-hidden min-h-0">
        {tasks.map((task) => (
          <div key={task.id}>
            <div className="flex items-start gap-1.5 -mx-2 rounded-lg hover:bg-[#f7f6f4]">
              <button
                onClick={() => onToggleTask(task.id)}
                className="flex-none bg-transparent border-0 p-0 cursor-pointer ml-2 mt-2.5"
              >
                <span
                  className="w-[17px] h-[17px] rounded-[5px] flex items-center justify-center text-[11px] text-white block"
                  style={
                    task.done
                      ? { background: TASK_GREEN, border: `1px solid ${TASK_GREEN}` }
                      : { background: "#fff", border: "1.5px solid #d8d5d0" }
                  }
                >
                  {task.done ? "✓" : ""}
                </span>
              </button>
              <button
                onClick={() => onStartEditTask(task)}
                className="flex-1 min-w-0 grid gap-2.5 bg-transparent border-0 py-2.5 pr-1 rounded-lg cursor-pointer text-left"
              >
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
                    {task.assigneeName && <> · {task.assigneeName}</>}
                  </span>
                </span>
              </button>
              <button
                onClick={() => onDeleteTask(task.id)}
                title="Delete"
                className="w-7 h-7 mt-1.5 flex-none border-0 rounded-lg bg-transparent cursor-pointer text-muted-4 flex items-center justify-center hover:bg-line-soft hover:text-ink-soft"
              >
                <X size={13} />
              </button>
            </div>

            {editingTaskId === task.id && (
              <div className="flex flex-col gap-2 border border-[#ddd9d3] rounded-[11px] p-3 bg-white mt-1">
                <input
                  value={taskForm.title}
                  onChange={(e) => onTaskFormChange({ ...taskForm, title: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Task title"
                  autoFocus
                  className="h-10 rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
                  style={{ border: `1px solid ${taskFormError ? "#d64545" : "#e6e4e0"}` }}
                />
                <input
                  value={taskForm.tag}
                  onChange={(e) => onTaskFormChange({ ...taskForm, tag: e.target.value })}
                  onKeyDown={handleKeyDown}
                  placeholder="Due date or note (e.g. 19 Nov)"
                  className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
                />
                <select
                  value={taskForm.assigneeId ?? ""}
                  onChange={(e) => onTaskFormChange({ ...taskForm, assigneeId: e.target.value || null })}
                  className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {taskFormError && (
                  <div className="text-[12px] leading-[1.4]" style={{ color: "#d64545" }}>
                    {taskFormError}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={onCancelTaskEdit}
                    className="h-9 px-3.5 rounded-[9px] border border-line bg-white cursor-pointer text-[13.5px] text-ink-soft hover:bg-hover"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSaveTaskEdit}
                    className="h-9 px-4 rounded-[9px] border-0 bg-accent hover:bg-accent-hover text-white cursor-pointer text-[13.5px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-3" />

      <div className="relative flex-none">
        <Plus size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-4 pointer-events-none" />
        <input
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onDraftSubmit();
          }}
          placeholder="New task"
          className="w-full box-border h-11 border border-line rounded-[10px] bg-[#f7f6f4] pl-9 pr-9 text-[14px] text-ink-soft"
        />
        <CornerDownLeft size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-4 pointer-events-none" />
      </div>
    </aside>
  );
}
