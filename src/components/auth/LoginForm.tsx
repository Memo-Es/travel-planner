"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm({ next, defaultEmail }: { next?: string; defaultEmail?: string }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await login(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  const describedBy = error ? "login-error" : undefined;

  return (
    <form action={handleSubmit} className="flex flex-col gap-4" aria-busy={pending}>
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="block space-y-2">
        <span className="field-label">Email</span>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          autoFocus={!defaultEmail}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className="h-11"
        />
      </label>
      <label className="block space-y-2">
        <span className="field-label">Password</span>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus={!!defaultEmail}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          className="h-11"
        />
      </label>

      {error && (
        <p id="login-error" role="alert" className="field-error">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-1 h-11 w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="font-medium">
          Create one
        </Link>
      </p>
    </form>
  );
}
