"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import type { ExpenseData, MemberOption, TripData } from "@/lib/types";
import { currencySymbol } from "@/lib/currency";
import { fmtRange } from "@/lib/dates";

export type ExpenseFormState = {
  title: string;
  amount: string;
  /** A member's user id, or "" for nobody yet. */
  paidBy: string;
};

export function expenseFormFor(expense: ExpenseData): ExpenseFormState {
  return {
    title: expense.title,
    amount: String(expense.amount),
    paidBy: expense.paidBy?.id ?? "",
  };
}

export const EMPTY_EXPENSE_FORM: ExpenseFormState = {
  title: "",
  amount: "",
  paidBy: "",
};

/** Adds a cost to a stop, or edits one already there - on a plan, or loose
 * on the stop when none is picked. The same small form either way; editing
 * adds a Delete button and locks the stop (an expense's trip never
 * changes, only which of its plans it's on, or none).
 *
 * It's only ever opened from Finances, so it takes Finances' own column in
 * the grid rather than floating a drawer over the page - the same card, the
 * same slot, swapped in place. On mobile that's the Finances tab itself. */
export default function ExpensePanel({
  trips,
  defaultTripId,
  /** The plan this expense is on, or "" for the stop itself. Locked once
   * editing - opened from a plan's own row, it's always that plan;
   * opened from Finances, the picker offers every plan on the chosen stop. */
  itemId = "",
  editing = false,
  initial,
  currency,
  error,
  onError,
  saving,
  onSave,
  onDelete,
  onClose,
  members,
}: {
  trips: TripData[];
  defaultTripId: string;
  itemId?: string;
  /** Editing an existing expense rather than adding one: shows Delete and
   * fixes the stop and plan rather than offering pickers for them. */
  editing?: boolean;
  /** The expense's current values, when editing one. */
  initial?: ExpenseFormState;
  currency: string;
  error: string | null;
  onError: (message: string | null) => void;
  saving: boolean;
  onSave: (f: ExpenseFormState, tripId: string, itemId: string | null) => void;
  onDelete?: () => void;
  onClose: () => void;
  members: MemberOption[];
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const [form, setForm] = useState<ExpenseFormState>(
    () => initial ?? EMPTY_EXPENSE_FORM,
  );
  const [tripId, setTripId] = useState(defaultTripId);
  const [onItem, setOnItem] = useState(itemId);
  const trip = trips.find((t) => t.id === tripId);
  const items = trip
    ? [...trip.stay, ...trip.transport, ...trip.activities]
    : [];
  const title = editing ? "Edit expense" : "Add expense";

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !saving) {
      e.preventDefault();
      onSave(form, tripId, onItem || null);
    }
  }

  return (
    <>
      <div className="scroll-stable scroll-quiet -mx-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-2">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm text-muted-2">
              {onItem
                ? "A cost on this plan."
                : "A cost on the stop, not any one plan."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2"
            onClick={onClose}
            disabled={saving}
            aria-label={`Close ${title.toLowerCase()}`}
          >
            <X />
          </Button>
        </header>
        <div className="space-y-4 pt-5" aria-busy={saving}>
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block min-w-0 space-y-1.5">
                <span className="field-label">Stop</span>
                <NativeSelect
                  autoFocus
                  value={tripId}
                  onChange={(e) => {
                    setTripId(e.target.value);
                    setOnItem("");
                  }}
                >
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} · {fmtRange(t.start, t.end)}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <label className="block min-w-0 space-y-1.5">
                <span className="field-label">On which plan</span>
                <NativeSelect
                  value={onItem}
                  onChange={(e) => setOnItem(e.target.value)}
                >
                  <option value="">Not a specific plan</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.t}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="field-label">Name</span>
            <Input
              value={form.title}
              onChange={(e) => {
                setForm({ ...form, title: e.target.value });
                onError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Taxi, tickets, dinner…"
              autoFocus={editing}
              aria-invalid={!!error?.startsWith("Name") || undefined}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 space-y-1.5">
              <span className="field-label">
                Amount ({currencySymbol(currency)})
              </span>
              <Input
                value={form.amount}
                onChange={(e) => {
                  setForm({ ...form, amount: e.target.value });
                  onError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="0.00"
                inputMode="decimal"
                className="tabular-nums"
                aria-invalid={!!error?.startsWith("Amount") || undefined}
                aria-describedby={error ? errorId : undefined}
              />
            </label>
            <label className="block min-w-0 space-y-1.5">
              <span className="field-label">Paid by</span>
              <NativeSelect
                value={form.paidBy}
                onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              >
                <option value="">Nobody yet</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
          {error && (
            <p id={errorId} role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 pt-4">
        {editing && onDelete ? (
          <Button
            variant="soft-destructive"
            size="sm"
            disabled={saving}
            onClick={onDelete}
          >
            <Trash2 />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => onSave(form, tripId, onItem || null)}
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </div>
    </>
  );
}
