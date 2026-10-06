"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Check, FileText, MapPin, Paperclip, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { fmtDay } from "@/lib/itinerary";
import type { AttachmentData, ItemData, MemberOption } from "@/lib/types";
import { currencySymbol, formatTotal } from "@/lib/currency";
import {
  MAX_PDF_MB,
  attachmentHref,
  formatBytes,
  pdfProblem,
} from "@/lib/uploads";

export type BookingFormState = {
  t: string;
  url: string;
  /** Google Maps link or address. */
  location: string;
  /** Total paid, as typed. */
  cost: string;
  /** Who paid, or "" if nobody has yet. */
  paidById: string;
  /** Who splits the cost. */
  shareIds: string[];
  /** "YYYY-MM-DD" or "" when the plan has no day yet. */
  date: string;
  /** "HH:mm" or "" for any time that day. */
  time: string;
  /** New PDFs to upload on save. */
  files: File[];
  /** Existing attachments staged for removal on save. */
  removeIds: string[];
};

/** A blank booking: split between everyone, paid by whoever is adding it. */
export function emptyBookingForm(
  members: MemberOption[],
  payerId: string,
): BookingFormState {
  return {
    t: "",
    url: "",
    location: "",
    cost: "",
    paidById: payerId,
    shareIds: members.map((m) => m.id),
    date: "",
    time: "",
    files: [],
    removeIds: [],
  };
}

export function bookingFormFrom(
  item: ItemData,
  members: MemberOption[],
): BookingFormState {
  return {
    t: item.t,
    url: item.url,
    location: item.location,
    cost: item.costAmount === null ? "" : String(item.costAmount),
    paidById: item.paidById ?? "",
    // Bookings saved before splits existed are shared by the whole team.
    shareIds: item.shareIds.length ? item.shareIds : members.map((m) => m.id),
    date: item.date ?? "",
    time: item.time ?? "",
    files: [],
    removeIds: [],
  };
}

export default function BookingForm({
  form,
  onChange,
  error,
  onError,
  saving,
  onSave,
  onCancel,
  currency,
  placeholder,
  submitLabel,
  existing = [],
  autoFocus = true,
  framed = true,
  before,
  days,
  members,
  currentUserId,
  requirement,
}: {
  form: BookingFormState;
  onChange: (f: BookingFormState) => void;
  error: string | null;
  onError: (message: string | null) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  currency: string;
  placeholder: string;
  submitLabel: string;
  existing?: AttachmentData[];
  autoFocus?: boolean;
  /** Draw the tinted box; dialogs already provide their own surface. */
  framed?: boolean;
  /** Extra fields rendered above the name (e.g. category and stop). */
  before?: ReactNode;
  /** The stop's days; when given, the plan can be placed on a day and time. */
  days?: string[];
  members: MemberOption[];
  currentUserId: string;
  /** What marks this booking complete, e.g. "a name and a location". */
  requirement: string;
}) {
  const costValue = Number(form.cost.trim().replace(",", "."));
  const hasCost = form.cost.trim() !== "" && Number.isFinite(costValue);
  const memberName = (m: MemberOption) =>
    m.id === currentUserId ? "You" : m.name;
  const nameOf = (memberId: string) => {
    const m = members.find((x) => x.id === memberId);
    return m ? memberName(m) : "A former teammate";
  };
  function toggleSharer(memberId: string) {
    onChange({
      ...form,
      shareIds: form.shareIds.includes(memberId)
        ? form.shareIds.filter((x) => x !== memberId)
        : [...form.shareIds, memberId],
    });
  }
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const fileInput = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !saving) {
      e.preventDefault();
      onSave();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const problem = pdfProblem(file);
      if (problem) {
        onError(problem);
        return;
      }
      accepted.push(file);
    }
    onError(null);
    onChange({ ...form, files: [...form.files, ...accepted] });
  }

  function toggleRemove(attachmentId: string) {
    const removeIds = form.removeIds.includes(attachmentId)
      ? form.removeIds.filter((x) => x !== attachmentId)
      : [...form.removeIds, attachmentId];
    onChange({ ...form, removeIds });
  }

  const hasFiles = existing.length > 0 || form.files.length > 0;

  return (
    <div
      className={
        "space-y-4 " +
        (framed ? "rounded-xl border border-line bg-secondary/60 p-4" : "")
      }
      aria-busy={saving}
    >
      {before}
      <label className="block space-y-1.5">
        <span className="field-label">Name</span>
        <Input
          value={form.t}
          onChange={(e) => onChange({ ...form, t: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={!!error?.startsWith("Name") || undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="field-label">Location</span>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={form.location}
            onChange={(e) => onChange({ ...form, location: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Google Maps link or address"
            className="pl-9"
            autoComplete="off"
          />
        </div>
      </label>
      {days && (
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
          <label className="block min-w-0 space-y-1.5">
            <span className="field-label">Day</span>
            <NativeSelect
              value={form.date}
              onChange={(e) =>
                onChange({
                  ...form,
                  date: e.target.value,
                  time: e.target.value ? form.time : "",
                })
              }
            >
              <option value="">No day yet</option>
              {/* Keep a saved day selectable even if the stop moved. */}
              {form.date && !days.includes(form.date) && (
                <option value={form.date}>{fmtDay(form.date)}</option>
              )}
              {days.map((d) => (
                <option key={d} value={d}>
                  {fmtDay(d)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="block space-y-1.5">
            <span className="field-label">Time</span>
            <Input
              type="time"
              value={form.time}
              disabled={!form.date}
              onChange={(e) => onChange({ ...form, time: e.target.value })}
              onKeyDown={handleKeyDown}
              className="tabular-nums"
              aria-describedby={!form.date ? `${id}-time-hint` : undefined}
            />
            {!form.date && (
              <span id={`${id}-time-hint`} className="sr-only">
                Choose a day first
              </span>
            )}
          </label>
        </div>
      )}
      <label className="block min-w-0 space-y-1.5">
        <span className="field-label">Booking link</span>
        <Input
          value={form.url}
          onChange={(e) => onChange({ ...form, url: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="https://…"
          inputMode="url"
          aria-invalid={!!error?.startsWith("Link") || undefined}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
        <label className="block space-y-1.5">
          <span className="field-label">
            Total paid ({currencySymbol(currency)})
          </span>
          <Input
            value={form.cost}
            onChange={(e) => onChange({ ...form, cost: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            inputMode="decimal"
            className="tabular-nums"
            aria-invalid={!!error?.startsWith("Cost") || undefined}
            aria-describedby={error ? errorId : hintId}
          />
        </label>
        <label className="block min-w-0 space-y-1.5">
          <span className="field-label">Paid by</span>
          <NativeSelect
            value={form.paidById}
            disabled={!hasCost}
            onChange={(e) => onChange({ ...form, paidById: e.target.value })}
          >
            <option value="">Not paid yet</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      {hasCost && members.length > 1 && (
        <fieldset className="min-w-0 space-y-1.5">
          <legend className="field-label mb-1.5">Split between</legend>
          <div className="flex flex-wrap gap-1.5">
            {members.map((m) => {
              const on = form.shareIds.includes(m.id);
              return (
                <Button
                  key={m.id}
                  size="sm"
                  variant={on ? "default" : "outline"}
                  aria-pressed={on}
                  onClick={() => toggleSharer(m.id)}
                >
                  {on && <Check />}
                  {memberName(m)}
                </Button>
              );
            })}
          </div>
          {form.shareIds.length > 0 && (
            <p className="text-xs tabular-nums text-muted">
              {form.shareIds.length === 1
                ? `${nameOf(form.shareIds[0])} covers it all`
                : `${formatTotal(costValue / form.shareIds.length, currency)} each, ${form.shareIds.length} ways`}
            </p>
          )}
        </fieldset>
      )}

      <div className="space-y-1.5">
        <span className="field-label" id={`${id}-files`}>
          Documents
        </span>
        {hasFiles && (
          <ul aria-labelledby={`${id}-files`} className="space-y-1">
            {existing.map((a) => {
              const removing = form.removeIds.includes(a.id);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-lg border border-line bg-white py-1 pl-3 pr-1"
                >
                  <FileText className="size-4 shrink-0 text-muted" />
                  <a
                    href={attachmentHref(a.id)}
                    target="_blank"
                    rel="noreferrer"
                    className={
                      "min-w-0 flex-1 truncate text-sm hover:underline " +
                      (removing ? "text-muted line-through" : "")
                    }
                  >
                    {a.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {removing ? "Removed on save" : formatBytes(a.size)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleRemove(a.id)}
                    aria-label={
                      removing ? `Keep ${a.name}` : `Remove ${a.name}`
                    }
                  >
                    {removing ? <Undo2 /> : <X />}
                  </Button>
                </li>
              );
            })}
            {form.files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-white py-1 pl-3 pr-1"
              >
                <FileText className="size-4 shrink-0 text-accent-ink" />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {file.name}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {formatBytes(file.size)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onChange({
                      ...form,
                      files: form.files.filter((_, j) => j !== i),
                    })
                  }
                  aria-label={`Don't attach ${file.name}`}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip />
          Attach PDF
        </Button>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      ) : (
        <p
          id={hintId}
          className="text-pretty text-xs leading-relaxed text-muted"
        >
          Add {requirement} to mark this booking as scheduled. Leave the cost
          empty if there&apos;s nothing to split. PDFs up to {MAX_PDF_MB} MB.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
