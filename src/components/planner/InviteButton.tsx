"use client";

import { useState, useTransition } from "react";
import { createInvite } from "@/actions/team";

export default function InviteButton({ teamId }: { teamId: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
      return;
    }
    startTransition(async () => {
      const token = await createInvite(teamId);
      const url = `${window.location.origin}/invite/${token}`;
      setLink(url);
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title={link ?? "Create a shareable invite link"}
      className="text-[12px] text-muted-2 bg-transparent border-0 cursor-pointer hover:text-ink whitespace-nowrap disabled:opacity-60"
    >
      {copied ? "Copied!" : pending ? "Creating…" : link ? "Copy invite link" : "+ Invite teammate"}
    </button>
  );
}
