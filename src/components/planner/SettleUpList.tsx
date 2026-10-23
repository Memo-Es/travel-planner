"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AccordionBody } from "@/components/motion/primitives";
import { Avatar } from "@/components/ui/avatar";
import type { Relationship } from "@/lib/balances";
import { formatTotal } from "@/lib/currency";
import { firstName } from "@/lib/people";
import { cn } from "@/lib/utils";

/** Each person you share costs with, worded from your side ("Ro pays
 * you"). Opening one lists the bookings behind it and how they add up.
 * Shown inside Finances' balance card. */
export function SettleUpList({
  relationships,
  currency,
  currentUserId,
}: {
  relationships: Relationship[];
  currency: string;
  currentUserId: string;
}) {
  const ids = useId();
  const [open, setOpen] = useState<string | null>(null);
  const money = (value: number) => formatTotal(Math.abs(value), currency);

  if (relationships.length === 0) {
    return (
      <p className="border-t border-dotted border-stone-300 py-3 text-xs text-muted">
        Nobody owes anyone right now.
      </p>
    );
  }
  return (
    <ul
      aria-label="Who owes who"
      className="divide-y divide-dotted divide-stone-300 border-t border-dotted border-stone-300"
    >
      {relationships.map(({ person, net, lines }) => {
        const name = firstName(person.name);
        const expanded = open === person.id;
        const even = Math.abs(net) < 0.005;
        return (
          <li key={person.id}>
            <button
              type="button"
              id={`${ids}-${person.id}`}
              aria-expanded={expanded}
              aria-controls={`${ids}-${person.id}-lines`}
              onClick={() => setOpen(expanded ? null : person.id)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors duration-150 hover:bg-hover-2/60"
            >
              <Avatar name={person.name} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">
                  {net < 0 ? "You" : name}
                </span>
                <span className="block truncate text-xs text-muted">
                  {even ? `You and ${name} are even` : net < 0 ? `pay ${name}` : "pays you"}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-hover-2 py-1 pl-2.5 pr-1.5 text-sm tabular-nums text-ink">
                {money(net)}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 text-muted transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                />
              </span>
            </button>
            <AccordionBody
              open={expanded}
              id={`${ids}-${person.id}-lines`}
              labelledBy={`${ids}-${person.id}`}
            >
              <ul className="space-y-3 pb-3 pt-1">
                {lines.map((l) => (
                  <li key={l.item.id}>
                    <div className="flex items-baseline gap-3">
                      <span className="min-w-0 flex-1 text-pretty text-sm leading-5 text-ink">
                        {l.item.t}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-sm tabular-nums",
                          l.amount > 0 ? "text-task-green-ink" : "text-destructive",
                        )}
                      >
                        {l.amount > 0 ? "+" : "−"}
                        {money(l.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-2">
                      {l.paidBy.id === currentUserId ? "You" : name} paid{" "}
                      {money(l.item.costAmount ?? 0)} · split {l.splitCount}{" "}
                      {l.splitCount === 1 ? "way" : "ways"}
                    </p>
                  </li>
                ))}
                <li className="text-pretty pt-0.5 text-xs leading-relaxed text-muted">
                  Each cost is split evenly between whoever joined it, or
                  everyone if nobody did. {name}&apos;s shares of what you
                  paid, minus your shares of what {name} paid.
                </li>
              </ul>
            </AccordionBody>
          </li>
        );
      })}
    </ul>
  );
}
