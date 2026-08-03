"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import type { InviteData } from "@/lib/types";
import { CURRENCIES } from "@/lib/currency";

export default function TripSettingsModal({
  teamName,
  currency,
  invites,
  onClose,
  onRename,
  onChangeCurrency,
  onCreateInvite,
}: {
  teamName: string;
  currency: string;
  invites: InviteData[];
  onClose: () => void;
  onRename: (name: string) => void;
  onChangeCurrency: (currency: string) => void;
  onCreateInvite: () => Promise<string>;
}) {
  const [name, setName] = useState(teamName);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function saveName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== teamName) onRename(trimmed);
    else setName(teamName);
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  function generateInvite() {
    startTransition(async () => {
      const token = await onCreateInvite();
      copyLink(token, "new");
    });
  }

  return (
    <div
      className="absolute z-40 bg-white box-border flex flex-col overflow-hidden top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(460px,92vw)] max-h-[86vh] rounded-2xl border border-line shadow-[0_24px_60px_rgba(28,27,25,0.22)] p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3 pb-4 border-b border-line-soft">
        <h2 className="m-0 text-[20px] font-semibold tracking-[-0.015em] text-ink">Trip settings</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-[9px] border border-line bg-white cursor-pointer text-ink-soft flex-none flex items-center justify-center hover:bg-hover"
        >
          <X size={14} />
        </button>
      </header>

      <div className="flex flex-col gap-5 pt-4 overflow-y-auto min-h-0">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-[0.06em] uppercase text-muted">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setName(teamName);
            }}
            className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-semibold tracking-[0.06em] uppercase text-muted">Currency</span>
          <select
            value={currency}
            onChange={(e) => onChangeCurrency(e.target.value)}
            className="h-10 border border-line rounded-[9px] bg-[#fbfaf9] px-3 text-[14px] text-ink box-border cursor-pointer"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.label}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-muted-3">Used for every stop&apos;s booking costs and totals.</span>
        </label>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-[12px] font-semibold tracking-[0.06em] uppercase text-muted">Teammates</span>
            <button
              onClick={generateInvite}
              disabled={pending}
              className="flex items-center gap-1 text-[12.5px] text-accent bg-transparent border-0 cursor-pointer hover:text-accent-hover disabled:opacity-60"
            >
              {pending ? (
                "Creating…"
              ) : copiedId === "new" ? (
                "Copied!"
              ) : (
                <>
                  <Plus size={13} /> Generate invite link
                </>
              )}
            </button>
          </div>

          {invites.length === 0 ? (
            <div className="text-[13px] text-muted-3">No invites yet — generate a link to add a teammate.</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {invites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-2 bg-[#fbfaf9] border border-line-soft rounded-[10px] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink-soft">
                      {inv.acceptedEmail ? (
                        <>Joined: <span className="text-ink">{inv.acceptedEmail}</span></>
                      ) : (
                        "Pending invite"
                      )}
                    </div>
                    <div className="text-[11.5px] text-muted-3">
                      Created {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {!inv.acceptedEmail && (
                    <button
                      onClick={() => copyLink(inv.token, inv.id)}
                      className="text-[12px] text-muted-2 bg-transparent border-0 cursor-pointer hover:text-ink flex-none whitespace-nowrap"
                    >
                      {copiedId === inv.id ? "Copied!" : "Copy link"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
