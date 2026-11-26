"use client";

import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? "Something went wrong.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-2xl bg-brand-wash p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-brand">
          <MailCheck className="size-4" /> Check your inbox
        </p>
        <p className="mt-1 text-foreground/75">If {email} can sign in, a link is on its way. It works once and expires in 20 minutes.</p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" className="h-12 rounded-xl bg-white" />
      {error && <p className="text-sm text-rose">{error}</p>}
      <Button type="submit" size="lg" className="h-12 w-full rounded-full" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Email me a sign-in link
      </Button>
    </form>
  );
}
