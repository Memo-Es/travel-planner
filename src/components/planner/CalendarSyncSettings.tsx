"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, Copy, Link2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  disconnectGoogle,
  getCalendarSyncStatus,
  regenerateIcsLink,
  syncGoogleNow,
  type CalendarSyncStatus,
} from "@/actions/calendarSync";

/**
 * Two ways to keep an outside calendar aware of your busy time, both
 * deliberately blind to what you're actually doing: every synced event
 * just says "Busy", never the plan's name or location, so a work calendar
 * a teammate can see never tells them where you're going or what for.
 *
 * Per-person, not per-trip, the same as AI assistants below it: it covers
 * every trip you're part of, not just the one currently open.
 */
export default function CalendarSyncSettings() {
  const [status, setStatus] = useState<CalendarSyncStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"regenerate" | "sync" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getCalendarSyncStatus()
      .then(setStatus)
      .catch(() => setError("Could not load your calendar sync settings."));
    return () => clearTimeout(timer.current);
  }, []);

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the address. You can select and copy it above.");
    }
  }

  async function regenerate() {
    setBusy("regenerate");
    setError(null);
    try {
      const icsUrl = await regenerateIcsLink();
      setStatus((s) => (s ? { ...s, icsUrl } : s));
    } catch {
      setError("The link could not be regenerated. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function connectGoogle() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    window.location.href = `/api/google-calendar/connect?tz=${encodeURIComponent(tz)}`;
  }

  async function syncNow() {
    setBusy("sync");
    setError(null);
    try {
      const googleSyncedAt = await syncGoogleNow();
      setStatus((s) => (s ? { ...s, googleSyncedAt } : s));
    } catch {
      setError("Could not sync just now. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy("disconnect");
    setError(null);
    try {
      await disconnectGoogle();
      setStatus((s) => (s ? { ...s, googleConnected: false, googleSyncedAt: null } : s));
    } catch {
      setError("Could not disconnect Google Calendar. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-3 border-t border-line-soft pt-5" aria-labelledby="calendar-heading">
      <h3 id="calendar-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Calendar className="size-4 text-muted" />
        Calendar sync
      </h3>
      <p className="text-pretty text-xs leading-relaxed text-muted">
        Covers the activities you&apos;ve joined and every bit of transport,
        across every trip you&apos;re part of. Every synced event just says
        &quot;Busy&quot; - never the name, the location or anything else -
        so a calendar a coworker can see only shows that you&apos;re away.
      </p>

      {status === null ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3 animate-spin" />
          Loading
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <span className="field-label flex items-center gap-1.5">
              <Link2 className="size-3.5" />
              Subscribe link
            </span>
            <div className="flex gap-2">
              <Input
                readOnly
                value={status.icsUrl}
                aria-label="Calendar subscribe address"
                onFocus={(e) => e.target.select()}
              />
              <Button
                variant="secondary"
                size="icon"
                aria-label="Copy calendar subscribe address"
                onClick={() => copy(status.icsUrl)}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-muted">
                Add this as a subscribed calendar in Google, Apple or Outlook
                Calendar. It updates on its own; no sign-in needed.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={busy === "regenerate"}
                onClick={regenerate}
              >
                {busy === "regenerate" && <Loader2 className="animate-spin" />}
                Regenerate
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line py-2.5 pl-4 pr-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">Google Calendar</p>
              <p className="mt-1 text-xs text-muted">
                {status.googleConnected
                  ? status.googleSyncedAt
                    ? `Last synced ${new Date(status.googleSyncedAt).toLocaleString()}`
                    : "Connected, syncing shortly"
                  : "Writes real events into their own calendar in your account"}
              </p>
            </div>
            {status.googleConnected ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sync now"
                  title="Sync now"
                  disabled={busy === "sync"}
                  onClick={syncNow}
                >
                  {busy === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy === "disconnect"}
                  onClick={disconnect}
                >
                  {busy === "disconnect" && <Loader2 className="animate-spin" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" className="shrink-0" onClick={connectGoogle}>
                Connect
              </Button>
            )}
          </div>
        </>
      )}
      <span role="status" className="sr-only">
        {copied ? "Address copied" : ""}
      </span>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
