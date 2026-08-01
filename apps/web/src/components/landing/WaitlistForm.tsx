"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "busy") return;
    setState("busy");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          website: (form.get("website") as string) ?? "",
        }),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="text-[13px] text-[color:var(--pos)]">
        You&apos;re on the list. Daily top spreads land on X — follow along.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      {/* honeypot — humans never see it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="h-10 flex-1 rounded-[var(--r-control)] border border-[color:var(--line)] bg-[color:var(--surface)] px-3 text-[13px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] focus:border-[color:var(--accent-line)] focus:outline-none"
      />
      <button
        type="submit"
        disabled={state === "busy"}
        className="h-10 rounded-[var(--r-control)] bg-[color:var(--accent)] px-4 text-[13px] font-semibold text-[color:var(--accent-ink)] hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
      >
        {state === "busy" ? "…" : "Join waitlist"}
      </button>
      {state === "error" && (
        <p className="self-center text-[11px] text-[color:var(--neg)]">Try again</p>
      )}
    </form>
  );
}
