"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Person } from "@/lib/types";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function names(people: Person[]): string {
  const first = people.map((p) => p.name.split(/\s+/)[0]);
  if (first.length <= 1) return first.join("");
  return `${first.slice(0, -1).join(", ")} and ${first[first.length - 1]}`;
}

/** Overlapping initials of who's going, up to three and then "+n". */
export function Avatars({
  people,
  size = "md",
}: {
  people: Person[];
  size?: "sm" | "md";
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  const dot = size === "sm" ? "size-5 text-xs" : "size-6 text-xs";
  // Two letters don't fit the small dots, so those show just the first.
  const mark = (name: string) =>
    size === "sm" ? initials(name).slice(0, 1) : initials(name);
  return (
    <span
      role="img"
      aria-label={`Going: ${names(people)}`}
      title={`Going: ${names(people)}`}
      className="flex shrink-0 items-center gap-0.5"
    >
      {shown.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          className={
            "flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-ink " +
            dot
          }
        >
          {mark(p.name)}
        </span>
      ))}
      {extra > 0 && (
        <span
          aria-hidden="true"
          className={
            "flex items-center justify-center rounded-full bg-secondary font-semibold text-ink-soft " +
            dot
          }
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

/**
 * Who's going to a plan, and the signed in person's own Join / Going
 * toggle. The change shows at once and saves in the background, and goes back
 * if the save fails.
 */
export function GoingControl({
  itemId,
  title,
  going,
  me,
  onSetGoing,
}: {
  itemId: string;
  title: string;
  going: Person[];
  me: Person;
  onSetGoing: (itemId: string, going: boolean) => Promise<void>;
}) {
  const serverMine = going.some((p) => p.id === me.id);
  const [mine, setMine] = useState(serverMine);
  const [failed, setFailed] = useState(false);
  useEffect(() => setMine(serverMine), [serverMine]);

  const people = mine
    ? serverMine
      ? going
      : [...going, me]
    : going.filter((p) => p.id !== me.id);

  async function toggle() {
    const next = !mine;
    setMine(next);
    setFailed(false);
    try {
      await onSetGoing(itemId, next);
    } catch {
      setMine(!next);
      setFailed(true);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Avatars people={people} />
      <Button
        variant={mine ? "secondary" : "outline"}
        size="sm"
        aria-label={mine ? `Going to ${title}. Leave` : `Join ${title}`}
        title={failed ? "Couldn't save. Try again." : undefined}
        onClick={toggle}
        className={mine ? "bg-accent-soft text-accent-ink hover:bg-accent-soft" : ""}
      >
        {mine ? <Check /> : <Plus />}
        {mine ? "Going" : "Join"}
      </Button>
      {failed && (
        <span role="alert" className="sr-only">
          Couldn&apos;t save. Try again.
        </span>
      )}
    </div>
  );
}
