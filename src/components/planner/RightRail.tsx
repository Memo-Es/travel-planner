"use client";

import { CalendarDays, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTotal } from "@/lib/currency";

export default function RightRail({
  total,
  currency,
  onOpenFinances,
  onOpenItinerary,
}: {
  total: number;
  currency: string;
  onOpenFinances: () => void;
  onOpenItinerary: () => void;
}) {
  const label = `Open finances, ${formatTotal(total, currency)} planned`;
  return (
    <div className="box-border flex flex-col items-center gap-2 overflow-hidden rounded-card border border-line bg-white py-3.5">
      <Button
        variant="secondary"
        size="icon"
        onClick={onOpenItinerary}
        aria-label="Open itinerary"
        title="Itinerary"
      >
        <CalendarDays className="text-accent-ink" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        onClick={onOpenFinances}
        aria-label={label}
        title={label}
      >
        <Wallet className="text-task-green-ink" />
      </Button>
    </div>
  );
}
