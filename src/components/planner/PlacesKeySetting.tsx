"use client";

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Disclosure } from "@/components/motion/primitives";

const ENABLE_API_URL =
  "https://console.cloud.google.com/apis/library/places.googleapis.com?project=_";
const CREDENTIALS_URL = "https://console.cloud.google.com/apis/credentials";

/**
 * A trip's own Google Places API key, used by the check_place MCP tool
 * instead of the server's shared default when set, so the trip's own
 * lookups are billed to its own Google Cloud project rather than whoever
 * runs this deployment. The key is write only: once saved it's never shown
 * back, only whether one is set.
 */
export default function PlacesKeySetting({
  configured,
  onSave,
}: {
  configured: boolean;
  onSave: (key: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setValue("");
    } catch {
      setError("The key could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(null);
    } catch {
      setError("The key could not be removed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="space-y-3 border-t border-line-soft pt-5"
      aria-labelledby="places-key-heading"
    >
      <h3
        id="places-key-heading"
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <MapPin className="size-4 text-muted" />
        Place lookups
      </h3>
      <p className="text-pretty text-xs leading-relaxed text-muted">
        A Google Places API key this trip&apos;s check_place tool uses to
        confirm a place is real and open before holding or recommending it.
        Required: there&apos;s no shared key to fall back to, so check_place
        can&apos;t be used here until this trip has its own. Billed to
        whoever&apos;s Google Cloud project the key belongs to.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2.5 text-ink-soft"
        aria-expanded={showHelp}
        onClick={() => setShowHelp((v) => !v)}
      >
        <ChevronDown
          className={
            "transition-transform duration-150 " +
            (showHelp ? "rotate-180" : "")
          }
        />
        How do I get one?
      </Button>
      <Disclosure open={showHelp}>
        <ol className="list-decimal space-y-2 rounded-xl bg-secondary/60 p-4 pl-8 text-xs leading-relaxed text-ink-soft">
          <li>
            Takes about 5 minutes. Google asks for a card on file even for
            the free tier, but a trip&apos;s own lookups won&apos;t come
            close to a charge &mdash; set a budget alert in Google Cloud if
            you want to be sure.
          </li>
          <li>
            Open{" "}
            <a
              href={ENABLE_API_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline"
            >
              Enable Places API (New)
              <ExternalLink className="size-3" />
            </a>
            , sign in, and create a project if it asks you to. Click{" "}
            <strong className="font-semibold">Enable</strong>. Google also
            lists a &quot;Places API (Legacy)&quot; &mdash; that&apos;s a
            different, older product; this link skips straight past it.
          </li>
          <li>
            Open{" "}
            <a
              href={CREDENTIALS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline"
            >
              Credentials
              <ExternalLink className="size-3" />
            </a>
            , then{" "}
            <strong className="font-semibold">
              Create credentials → API key
            </strong>
            .
          </li>
          <li>Copy the key it gives you and paste it below.</li>
          <li>
            Recommended: on the new key, click{" "}
            <strong className="font-semibold">Restrict key</strong> and limit
            it to the Places API, so it&apos;s no use to anyone if it ever
            leaks.
          </li>
        </ol>
      </Disclosure>
      {configured ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line py-2.5 pl-4 pr-2">
          <span className="flex items-center gap-2 text-sm text-ink">
            <Badge variant="success">
              <Check className="size-3" />
              Set for this trip
            </Badge>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={saving}
          >
            {saving && <Loader2 className="animate-spin" />}
            Remove
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="AIza…"
            aria-label="Google Places API key"
            disabled={saving}
          />
          <Button onClick={save} disabled={saving || !value.trim()}>
            {saving ? <Loader2 className="animate-spin" /> : "Save"}
          </Button>
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
