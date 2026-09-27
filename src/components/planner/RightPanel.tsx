"use client";

import { AnimatedNumber, Disclosure } from "@/components/motion/primitives";
import type { KeyboardEvent } from "react";
import {
  ArrowUp,
  Plus,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { TaskData, MemberOption } from "@/lib/types";
import type { TaskFormState } from "@/components/Planner";

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
  pending,
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
  pending: boolean;
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
    <aside aria-label="Tasks" className={card + " p-5 " + positionClass}>
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-task-green-ink" />
          <h2 className="panel-heading">Tasks</h2>
          <Badge>
            <AnimatedNumber value={openCount} />
          </Badge>
        </div>
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close tasks"
          >
            <X />
          </Button>
        )}
      </div>
      <div className="min-h-0 space-y-1 overflow-y-auto overscroll-contain px-1 -mx-1">
        {tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
            <ListChecks className="mx-auto mb-3 size-6 text-muted" />
            <p className="text-sm font-medium">A little less to remember</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Add your first task below.
            </p>
          </div>
        )}
        {tasks.map((task) => (
          <div key={task.id}>
            <div className="flex items-start gap-2 rounded-xl py-1 pl-2 transition-colors hover:bg-hover">
              <Checkbox
                checked={task.done}
                onCheckedChange={() => onToggleTask(task.id)}
                disabled={pending}
                aria-label={`Mark ${task.title} ${task.done ? "incomplete" : "complete"}`}
                className="my-3 mr-1"
              />
              <button
                onClick={() => onStartEditTask(task)}
                className="min-w-0 flex-1 rounded-lg py-2 text-left"
              >
                <span
                  className={
                    "block text-sm leading-relaxed " +
                    (task.done ? "text-muted line-through" : "text-ink-soft")
                  }
                >
                  {task.title}
                </span>
                {(task.tag || task.assigneeName) && (
                  <span className="mt-1 block text-xs leading-relaxed text-muted">
                    {[task.tag, task.assigneeName].filter(Boolean).join(" · ")}
                  </span>
                )}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Options for ${task.title}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onStartEditTask(task)}>
                    <Pencil />
                    Edit task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    destructive
                    disabled={pending}
                    onSelect={() => onDeleteTask(task.id)}
                  >
                    <Trash2 />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Disclosure open={editingTaskId === task.id}>
              <div className="my-2 space-y-3 rounded-xl border border-line bg-secondary/50 p-3">
                <label className="block space-y-2">
                  <span className="field-label">Task</span>
                  <Input
                    value={taskForm.title}
                    onChange={(e) =>
                      onTaskFormChange({ ...taskForm, title: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                    autoFocus
                    aria-invalid={!!taskFormError}
                    aria-describedby={taskFormError ? "task-error" : undefined}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">Due date or note</span>
                  <Input
                    value={taskForm.tag}
                    onChange={(e) =>
                      onTaskFormChange({ ...taskForm, tag: e.target.value })
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. Before 16 Nov"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">Assigned to</span>
                  <NativeSelect
                    value={taskForm.assigneeId ?? ""}
                    onChange={(e) =>
                      onTaskFormChange({
                        ...taskForm,
                        assigneeId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                {taskFormError && (
                  <p id="task-error" role="alert" className="field-error">
                    {taskFormError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancelTaskEdit}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={onSaveTaskEdit} disabled={pending}>
                    {pending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </Disclosure>
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) onDraftSubmit();
        }}
        className="mt-auto shrink-0 pt-5"
      >
        <div className="relative">
          <Plus className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" />
          <Input
            aria-label="New task"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Add a task…"
            className="h-11 bg-secondary/50 pl-9 pr-11"
            disabled={pending}
          />
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1"
            aria-label="Add task"
            disabled={!draft.trim() || pending}
          >
            <ArrowUp />
          </Button>
        </div>
      </form>
    </aside>
  );
}
