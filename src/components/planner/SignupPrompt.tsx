"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** What stands between a demo visitor and actually saving something -
 * shown by demoGate() the moment they try to. Dismissing it just closes
 * it; whatever they were doing is left exactly as it was (the booking
 * form underneath, still filled in) so they can keep touring. Built on
 * AlertDialog rather than the plain Dialog on purpose: it needs to stack
 * above a dialog that's already open (Add expense, a stop's edit form),
 * which is exactly what AlertDialog's own higher z-tier is for. */
export default function SignupPrompt({ onClose }: { onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="text-center">
        <AlertDialogTitle className="text-xl font-semibold text-ink">
          Sign up to save this
        </AlertDialogTitle>
        <AlertDialogDescription className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-muted">
          This trip is a shared demo, so nothing you do here is kept. Sign
          up and it&apos;s yours - your own stops, your own costs, saved for
          real.
        </AlertDialogDescription>
        <div className="flex flex-col gap-2 pt-2">
          <Button size="lg" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
          <Button size="lg" variant="secondary" onClick={onClose}>
            Keep exploring
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
