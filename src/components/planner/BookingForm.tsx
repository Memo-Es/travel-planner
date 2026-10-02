"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { FileText, Paperclip, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AttachmentData } from "@/lib/types";
import { currencySymbol } from "@/lib/currency";
import {
  MAX_PDF_MB,
  attachmentHref,
  formatBytes,
  pdfProblem,
} from "@/lib/uploads";

export type BookingFormState = {
  t: string;
  url: string;
  cost: string;
  /** New PDFs to upload on save. */
  files: File[];
  /** Existing attachments staged for removal on save. */
  removeIds: string[];
};

export const EMPTY_BOOKING_FORM: BookingFormState = {
  t: "",
  url: "",
  cost: "",
  files: [],
  removeIds: [],
};

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
}) {
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
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-3">
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
        <label className="block space-y-1.5">
          <span className="field-label">Cost ({currencySymbol(currency)})</span>
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
      </div>

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
          Add a name, link and cost to mark this booking as scheduled. PDFs up
          to {MAX_PDF_MB} MB.
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
