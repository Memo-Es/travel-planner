"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Copy, Check, Users, Loader2, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { InviteData, MemberOption } from "@/lib/types";
import { CURRENCIES, formatTotal } from "@/lib/currency";

export default function TripSettingsModal({
  teamName,
  currency,
  members,
  currentUserId,
  memberTotals,
  invites,
  onClose,
  onRename,
  onChangeCurrency,
  onCreateInvite,
}: {
  teamName: string;
  currency: string;
  members: MemberOption[];
  currentUserId: string;
  memberTotals: { byMember: Map<string, number>; unassigned: number };
  invites: InviteData[];
  onClose: () => void;
  onRename: (name: string) => Promise<void>;
  onChangeCurrency: (currency: string) => Promise<void>;
  onCreateInvite: () => Promise<string>;
}) {
  const [name, setName] = useState(teamName);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === teamName) {
      setName(teamName);
      return;
    }
    try {
      await onRename(trimmed);
      setError(null);
    } catch {
      setError("The name could not be saved. Please try again.");
    }
  }

  async function copyLink(token: string, id: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/${token}`,
      );
      setCopiedId(id);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedId(null), 2000);
      setError(null);
    } catch {
      setError("Could not copy the link. You can select and copy it below.");
      setNewToken(token);
    }
  }

  async function generateInvite() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const token = await onCreateInvite();
      setNewToken(token);
      await copyLink(token, "new");
    } catch {
      setError("The invite could not be created. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("close-settings")?.focus();
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-5">
          <div>
            <DialogTitle>Trip settings</DialogTitle>
            <DialogDescription className="mt-1">
              The details that bring your trip together.
            </DialogDescription>
          </div>
          <Button
            id="close-settings"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X />
          </Button>
        </header>
        <div className="-mx-1 min-h-0 space-y-6 overflow-y-auto px-1 pt-5">
          <label className="block space-y-2">
            <span className="field-label">Trip name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setName(teamName);
                }
              }}
            />
          </label>
          <label className="block space-y-2">
            <span className="field-label">Currency</span>
            <NativeSelect
              value={currency}
              onChange={async (e) => {
                try {
                  await onChangeCurrency(e.target.value);
                  setError(null);
                } catch {
                  setError(
                    "The currency could not be saved. Please try again.",
                  );
                }
              }}
              aria-describedby="currency-help"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.label}
                </option>
              ))}
            </NativeSelect>
            <span
              id="currency-help"
              className="block text-xs leading-relaxed text-muted"
            >
              Used for booking costs and totals across all stops.
            </span>
          </label>
          <section
            className="space-y-3 border-t border-line-soft pt-5"
            aria-labelledby="teammates-heading"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
              id="teammates-heading"
              className="flex items-center gap-2 text-sm font-semibold"
              >
                <Users className="size-4 text-muted" />
                Teammates
              </h3>
              <Badge>{members.length} {members.length === 1 ? "person" : "people"}</Badge>
            </div>
            <ul aria-labelledby="teammates-heading" className="divide-y divide-line-soft rounded-xl border border-line px-3">
              {members.map((member) => {
                const isCurrentUser = member.id === currentUserId;
                const initials = member.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
                return (
                  <li key={member.id} className="flex items-center gap-3 py-3">
                    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">{initials}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{member.name}</span>
                      <span className="block text-xs tabular-nums text-muted">
                        Pays {formatTotal(memberTotals.byMember.get(member.id) ?? 0, currency)}
                      </span>
                    </span>
                    {isCurrentUser ? <Badge>You</Badge> : member.role === "OWNER" ? <Badge><Crown className="size-3" />Owner</Badge> : <Badge variant="secondary">Member</Badge>}
                  </li>
                );
              })}
              {members.length === 0 && <li className="py-3 text-sm text-muted">No teammates yet.</li>}
            </ul>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {inv.acceptedEmail || "Pending invite"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Created {new Date(inv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {inv.acceptedEmail ? (
                  <Badge variant="success">Joined</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy invite link"
                    onClick={() => copyLink(inv.token, inv.id)}
                  >
                    {copiedId === inv.id ? <Check /> : <Copy />}
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={generateInvite}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : copiedId === "new" ? (
                <Check />
              ) : (
                <Plus />
              )}
              {pending
                ? "Creating invite…"
                : copiedId === "new"
                  ? "Invite link copied"
                  : "Create invite link"}
            </Button>
            {newToken && (
              <label className="block space-y-2">
                <span className="field-label">Invite link</span>
                <Input
                  readOnly
                  value={`${window.location.origin}/invite/${newToken}`}
                  onFocus={(e) => e.target.select()}
                />
              </label>
            )}
            <span role="status" className="sr-only">
              {copiedId ? "Invite link copied" : ""}
            </span>
          </section>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
