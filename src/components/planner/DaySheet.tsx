"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight, Clock, FileText, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoingControl } from "@/components/planner/Going";
import type { Plan } from "@/lib/itinerary";
import { fmtDay } from "@/lib/itinerary";
import type { Person } from "@/lib/types";
import { SECTION_DEFS, hostFromUrl } from "@/lib/tripSections";
import { attachmentHref } from "@/lib/uploads";
import { stopColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Everything planned on one day, opened from a plan on the calendar with
 * that plan highlighted and scrolled into view. A bottom sheet on mobile. */
export default function DaySheet({
  date,
  plans,
  focusId,
  isMobile,
  me,
  onSetGoing,
  onEdit,
  onClose,
}: {
  /** "YYYY-MM-DD" */
  date: string;
  plans: Plan[];
  /** The plan that was tapped. */
  focusId: string;
  isMobile: boolean;
  me: Person;
  onSetGoing: (itemId: string, going: boolean) => Promise<void>;
  onEdit: (plan: Plan) => void;
  onClose: () => void;
}) {
  const focusRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // After the sheet's entrance, so the scroll lands where it settles.
    const t = setTimeout(
      () => focusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      220,
    );
    return () => clearTimeout(t);
  }, [focusId]);
  const stops = [...new Map(plans.map((p) => [p.trip.id, p.trip])).values()];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        placement={isMobile ? "bottom" : "right"}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          focusRef.current?.querySelector<HTMLButtonElement>("button")?.focus({
            preventScroll: true,
          });
        }}
      >
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-2xl font-semibold">{fmtDay(date)}</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-sm text-muted-2">
              {stops.map((s) => s.label).join(" · ")} · {plans.length}{" "}
              {plans.length === 1 ? "plan" : "plans"}
            </DialogDescription>
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="-mr-1 shrink-0"
            onClick={onClose}
            aria-label="Close day"
          >
            <X />
          </Button>
        </header>

        <ul
          className={cn(
            "scroll-quiet -mx-2 mt-4 space-y-1 overflow-y-auto overscroll-contain px-2 pb-1",
            isMobile ? "max-h-[70dvh]" : "max-h-[calc(100dvh-9rem)]",
          )}
        >
          {plans.map((plan) => {
            const { item, key, trip } = plan;
            const focused = item.id === focusId;
            return (
              <li
                key={item.id}
                ref={focused ? focusRef : undefined}
                aria-current={focused ? "true" : undefined}
                className={cn(
                  "rounded-2xl px-3 py-3 transition-colors duration-300",
                  focused ? "bg-accent-soft" : "",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 size-2 shrink-0 rounded-full"
                    style={{ background: stopColor(trip.color).base }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-pretty text-base font-medium leading-6 text-ink">
                      {item.t}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm tabular-nums text-muted-2">
                      <Clock className="size-3.5 shrink-0" />
                      {item.time ?? "Any time"}
                      <span aria-hidden="true">·</span>
                      {SECTION_DEFS.find((d) => d.key === key)!.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-1.5 -mt-1 size-9 shrink-0 text-muted-2"
                    onClick={() => onEdit(plan)}
                    aria-label={`Edit ${item.t}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
                {item.notes && (
                  <p className="ml-5 mt-2 text-pretty text-sm leading-relaxed text-ink-soft">
                    {item.notes}
                  </p>
                )}
                {(item.attachments.length > 0 || item.url) && (
                  <ul className="ml-5 mt-2 flex flex-wrap gap-1.5">
                    {item.url && (
                      <li className="min-w-0 max-w-full">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors duration-150 hover:bg-hover-2 hover:text-ink"
                        >
                          <span className="truncate">{hostFromUrl(item.url)}</span>
                          <ArrowUpRight className="size-3 shrink-0" />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    )}
                    {item.attachments.map((a) => (
                      <li key={a.id} className="min-w-0 max-w-full">
                        <a
                          href={attachmentHref(a.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors duration-150 hover:bg-hover-2 hover:text-ink"
                        >
                          <FileText className="size-3.5 shrink-0 text-muted-2" />
                          <span className="truncate">{a.name}</span>
                          <span className="sr-only"> (PDF, opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {key === "activities" && (
                  <div className="ml-5 mt-2">
                    <GoingControl
                      itemId={item.id}
                      title={item.t}
                      going={item.going}
                      me={me}
                      onSetGoing={onSetGoing}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
