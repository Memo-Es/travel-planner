"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { FileText, MapPin, Paperclip, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { fmtDay } from "@/lib/itinerary";
import type { AttachmentData } from "@/lib/types";
import type { PlaceResult } from "@/lib/places";
import {
  MAX_PDF_MB,
  attachmentHref,
  formatBytes,
  pdfProblem,
} from "@/lib/uploads";

export type BookingFormState = {
  t: string;
  url: string;
  /** "YYYY-MM-DD" or "" when the plan has no day yet. */
  date: string;
  /** "HH:mm" or "" for any time that day. */
  time: string;
  /** "HH:mm" or "" - only ever set alongside `time`. */
  endTime: string;
  /** A real place's name and address, free-typed or picked from a search. */
  location: string;
  /** Its Maps link, "" - only ever set alongside `location`, and cleared the
   * moment the text is edited by hand rather than picked again. */
  locationUrl: string;
  /** A short free-text note, "" for none. */
  notes: string;
  /** New PDFs to upload on save. */
  files: File[];
  /** Existing attachments staged for removal on save. */
  removeIds: string[];
};

export const EMPTY_BOOKING_FORM: BookingFormState = {
  t: "",
  url: "",
  date: "",
  time: "",
  endTime: "",
  location: "",
  locationUrl: "",
  notes: "",
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
  placeholder,
  submitLabel,
  existing = [],
  autoFocus = true,
  framed = true,
  before,
  days,
  onSearchLocation,
}: {
  form: BookingFormState;
  onChange: (f: BookingFormState) => void;
  error: string | null;
  onError: (message: string | null) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
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
  /** When given, the plan can carry a real place - a Google Places search
   * as the Location field is typed into. Only activities offer this. */
  onSearchLocation?: (query: string) => Promise<PlaceResult[] | null>;
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
        (framed ? "rounded-2xl border border-line bg-white p-4" : "")
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
        <span className="field-label">Notes</span>
        <Textarea
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onCancel();
            }
          }}
          placeholder="Booking details, a reminder…"
          rows={2}
        />
      </label>
      {days && (
        <div className="space-y-3">
          <label className="block min-w-0 space-y-1.5">
            <span className="field-label">Day</span>
            <NativeSelect
              value={form.date}
              onChange={(e) =>
                onChange({
                  ...form,
                  date: e.target.value,
                  time: e.target.value ? form.time : "",
                  endTime: e.target.value ? form.endTime : "",
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="field-label">Start time</span>
              <Input
                type="time"
                value={form.time}
                disabled={!form.date}
                onChange={(e) =>
                  onChange({
                    ...form,
                    time: e.target.value,
                    endTime: e.target.value ? form.endTime : "",
                  })
                }
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
            <label className="block space-y-1.5">
              <span className="field-label">End time</span>
              <Input
                type="time"
                value={form.endTime}
                disabled={!form.time}
                onChange={(e) =>
                  onChange({ ...form, endTime: e.target.value })
                }
                onKeyDown={handleKeyDown}
                className="tabular-nums"
                aria-invalid={!!error?.startsWith("End time") || undefined}
                aria-describedby={
                  error
                    ? errorId
                    : !form.time
                      ? `${id}-end-time-hint`
                      : undefined
                }
              />
              {!form.time && (
                <span id={`${id}-end-time-hint`} className="sr-only">
                  Add a start time first
                </span>
              )}
            </label>
          </div>
        </div>
      )}
      {onSearchLocation && (
        <LocationField
          value={form.location}
          url={form.locationUrl}
          onChange={(location) => onChange({ ...form, location, locationUrl: "" })}
          onPick={(place) =>
            onChange({
              ...form,
              location: place.address
                ? `${place.name}, ${place.address}`
                : place.name,
              locationUrl: place.maps_link ?? "",
            })
          }
          onSearch={onSearchLocation}
          onKeyDown={handleKeyDown}
        />
      )}
      <label className="block space-y-1.5">
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
          variant="secondary"
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
          Add a name and link to mark this booking as scheduled. PDFs up to{" "}
          {MAX_PDF_MB} MB.
        </p>
      )}
      {/* Stays in view at the bottom while a long form scrolls. */}
      <div className="sticky bottom-0 z-10 -mx-1 flex justify-end gap-2 bg-gradient-to-t from-white from-70% to-transparent px-1 pb-1 pt-4">
        <Button
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/** A real place: free text that searches Google Places as you type and
 * offers up to 3 matches, each with its address, to pick from. Picking one
 * sets `locationUrl` to its Maps link; editing the text by hand afterward
 * clears it, since the link should only ever point at what's shown. */
function LocationField({
  value,
  url,
  onChange,
  onPick,
  onSearch,
  onKeyDown,
}: {
  value: string;
  url: string;
  onChange: (text: string) => void;
  onPick: (place: PlaceResult) => void;
  onSearch: (query: string) => Promise<PlaceResult[] | null>;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [failed, setFailed] = useState(false);
  // Picking a suggestion rewrites `value` to the picked place's own name and
  // address, which would otherwise fire a fresh search against the text we
  // just set from a result - this skips exactly that one re-trigger.
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (noKey || value.trim().length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const places = await onSearch(value);
        if (cancelled) return;
        setFailed(false);
        if (places === null) {
          setNoKey(true);
          setResults([]);
          return;
        }
        setResults(places);
        setOpen(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pick(place: PlaceResult) {
    skipNextRef.current = true;
    setResults([]);
    setOpen(false);
    onPick(place);
  }

  return (
    <label className="relative block space-y-1.5">
      <span className="field-label">Location</span>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            onKeyDown(e);
          }}
          placeholder="Search a real place…"
          className={url ? "pr-9" : undefined}
        />
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="focus-inset absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-2 transition-colors duration-150 hover:text-ink"
            aria-label="Open in Google Maps"
            title="Open in Google Maps"
          >
            <MapPin className="size-4" />
          </a>
        )}
        {open && results.length > 0 && (
          <ul className="scroll-quiet absolute z-popover mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-overlay">
            {results.map((p) => (
              <li key={`${p.name}-${p.address}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors duration-150 hover:bg-hover"
                >
                  <span className="truncate text-sm font-medium text-ink">
                    {p.name}
                  </span>
                  {p.address && (
                    <span className="truncate text-xs text-muted-2">
                      {p.address}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {noKey && (
        <p className="text-pretty text-xs leading-relaxed text-muted">
          Add a Google Places API key in Trip settings to search real places
          as you type - this still saves as plain text without one.
        </p>
      )}
      {!noKey && failed && (
        <p className="text-pretty text-xs leading-relaxed text-muted">
          Couldn&apos;t search just now - still saves as plain text.
        </p>
      )}
    </label>
  );
}
