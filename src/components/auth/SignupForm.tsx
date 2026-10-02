"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signup } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await signup(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const errorId = error ? "signup-error" : undefined;

  return (
    <form action={handleSubmit} className="flex flex-col gap-4" aria-busy={pending}>
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="block space-y-2">
        <span className="field-label">Your name</span>
        <Input
          name="name"
          type="text"
          autoComplete="name"
          required
          autoFocus
          aria-describedby={errorId}
          className="h-11"
        />
      </label>
      <label className="block space-y-2">
        <span className="field-label">Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={errorId}
          className="h-11"
        />
      </label>
      <label className="block space-y-2">
        <span className="field-label">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-describedby={["password-hint", errorId].filter(Boolean).join(" ")}
          className="h-11"
        />
        <span id="password-hint" className="block text-xs text-muted">
          At least 8 characters
        </span>
      </label>
      <label className="block space-y-2">
        <span className="field-label">Trip name (optional)</span>
        <Input
          name="teamName"
          type="text"
          placeholder="e.g. Fall Europe trip"
          aria-describedby="team-hint"
          className="h-11"
        />
        <span id="team-hint" className="block text-pretty text-xs leading-relaxed text-muted">
          This becomes a shared planner you can invite teammates to. Defaults to “Your name&apos;s Trips”.
        </span>
      </label>

      {error && (
        <p id="signup-error" role="alert" className="field-error">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 h-11 w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
