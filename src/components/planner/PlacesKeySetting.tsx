"use client";

import { useState } from "react";
import { Check, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
