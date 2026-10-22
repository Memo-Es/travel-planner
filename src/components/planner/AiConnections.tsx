"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  disconnectAiConnection,
  listAiConnections,
  type AiConnection,
} from "@/actions/connections";

/**
 * The MCP address to paste into Claude, ChatGPT or another AI app, and the
 * apps already connected to this account, each with Disconnect. Connections
 * belong to the person, not the trip, so they reach every trip they're in.
 */
export default function AiConnections() {
  const [connections, setConnections] = useState<AiConnection[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const url =
    typeof window === "undefined" ? "" : `${window.location.origin}/mcp`;

  useEffect(() => {
    listAiConnections()
      .then(setConnections)
      .catch(() => setConnections([]));
    return () => clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the address. You can select and copy it above.");
    }
  }

  async function disconnect(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await disconnectAiConnection(id);
      setConnections((list) => list?.filter((c) => c.id !== id) ?? null);
    } catch {
      setError("The app could not be disconnected. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <section
      className="space-y-3 border-t border-line-soft pt-5"
      aria-labelledby="ai-heading"
    >
      <h3 id="ai-heading" className="flex items-center gap-2 text-sm font-semibold">
        <Plug className="size-4 text-muted" />
        AI assistants
      </h3>
      <p className="text-pretty text-xs leading-relaxed text-muted">
        Add this address as a connector in Claude, ChatGPT or any app that
        supports MCP, then sign in with this account. The assistant can then
        see and plan every trip you&apos;re part of.
      </p>
      <div className="flex gap-2">
        <Input
          readOnly
          value={url}
          aria-label="MCP server address"
          onFocus={(e) => e.target.select()}
        />
        <Button
          variant="secondary"
          size="icon"
          aria-label="Copy MCP server address"
          onClick={copy}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <span role="status" className="sr-only">
        {copied ? "Address copied" : ""}
      </span>
      {connections === null ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3 animate-spin" />
          Loading connected apps
        </p>
      ) : (
        connections.length > 0 && (
          <ul
            aria-label="Connected apps"
            className="divide-y divide-line-soft rounded-xl border border-line pl-4 pr-2"
          >
            {connections.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted">
                    {c.lastUsedAt
                      ? `Last used ${new Date(c.lastUsedAt).toLocaleDateString()}`
                      : `Connected ${new Date(c.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing === c.id}
                  onClick={() => disconnect(c.id)}
                  aria-label={`Disconnect ${c.name}`}
                >
                  {removing === c.id && <Loader2 className="animate-spin" />}
                  Disconnect
                </Button>
              </li>
            ))}
          </ul>
        )
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
