"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signup } from "@/actions/auth";

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

  return (
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? "/"} />
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Your name</span>
        <input
          name="name"
          type="text"
          required
          autoFocus
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
        <span className="text-[12px] text-muted-3">At least 8 characters</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Trip name (optional)</span>
        <input
          name="teamName"
          type="text"
          placeholder="e.g. Fall Europe trip"
          className="h-11 rounded-[9px] border border-line bg-hover px-3.5 text-[14px] text-ink box-border"
        />
        <span className="text-[12px] text-muted-3">
          This becomes a shared planner you can invite teammates to. Defaults to “Your name&apos;s Trips”.
        </span>
      </label>

      {error ? <div className="text-[13px] text-red-600">{error}</div> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 rounded-[9px] border-0 bg-accent text-white text-[14px] cursor-pointer disabled:opacity-60 hover:bg-accent-hover"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <div className="text-[13px] text-muted-2 text-center mt-1">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-accent">
          Sign in
        </Link>
      </div>
    </form>
  );
}
