"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-toast flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-overlay animate-in fade-in-0 slide-in-from-top-2 duration-200"
    >
      {!onDismiss && <Check className="size-4 shrink-0 text-task-green-ink" />}
      <span className="text-pretty">{message}</span>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <X />
        </Button>
      )}
    </div>
  );
}
