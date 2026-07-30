"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";

export default function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await login(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          autoFocus
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
      </label>

      {error ? <div className="text-[13px] text-red-600">{error}</div> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-[9px] border-0 bg-accent text-white text-[14px] cursor-pointer disabled:opacity-60 hover:bg-accent-hover"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="text-[13px] text-muted-2 text-center mt-1">
        No account?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"} className="text-accent">
          Create one
        </Link>
      </div>
    </form>
  );
}
