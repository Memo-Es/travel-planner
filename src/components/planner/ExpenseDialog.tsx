"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import BookingForm, {
  EMPTY_BOOKING_FORM,
  type BookingFormState,
} from "@/components/planner/BookingForm";
import type { ItemSectionKey, TripData } from "@/lib/types";
import { SECTION_DEFS } from "@/lib/tripSections";
import { fmtRange } from "@/lib/dates";

export type ExpenseFormState = BookingFormState & {
  key: ItemSectionKey;
  tripId: string;
};

export default function ExpenseDialog({
  trips,
  defaultTripId,
  currency,
  isMobile,
  error,
  onError,
  saving,
  onSave,
  onClose,
}: {
  trips: TripData[];
  defaultTripId: string;
  currency: string;
  isMobile: boolean;
  error: string | null;
  onError: (message: string | null) => void;
  saving: boolean;
  onSave: (f: ExpenseFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExpenseFormState>({
    ...EMPTY_BOOKING_FORM,
    key: "stay",
    tripId: defaultTripId,
  });
  const section = SECTION_DEFS.find((s) => s.key === form.key)!;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        placement={isMobile ? "bottom" : "center"}
        aria-describedby="expense-description"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line-soft pb-4">
          <div>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription id="expense-description" className="mt-1">
              It&apos;s saved as a booking on the stop you choose.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2"
            onClick={onClose}
            disabled={saving}
            aria-label="Close add expense"
          >
            <X />
          </Button>
        </header>
        <div className="-mx-1 min-h-0 overflow-y-auto overscroll-contain px-1 pb-1 pt-5">
          <BookingForm
            form={form}
            onChange={(f) => {
              setForm({ ...form, ...f });
              onError(null);
            }}
            error={error}
            onError={onError}
            saving={saving}
            onSave={() => onSave(form)}
            onCancel={onClose}
            currency={currency}
            placeholder={section.placeholder}
            submitLabel="Add expense"
            autoFocus={false}
            framed={false}
            before={
              <div className="grid grid-cols-2 gap-3">
                <label className="block min-w-0 space-y-1.5">
                  <span className="field-label">Category</span>
                  <NativeSelect
                    autoFocus
                    value={form.key}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        key: e.target.value as ItemSectionKey,
                      })
                    }
                  >
                    {SECTION_DEFS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block min-w-0 space-y-1.5">
                  <span className="field-label">Stop</span>
                  <NativeSelect
                    value={form.tripId}
                    onChange={(e) =>
                      setForm({ ...form, tripId: e.target.value })
                    }
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} · {fmtRange(t.start, t.end)}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
