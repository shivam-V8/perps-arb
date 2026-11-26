"use client";

import { Check, Loader2, Lock, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PLAN_COPY, PRO_FEATURES } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

type Product = keyof typeof PLAN_COPY;

/** Upgrade dialog: Pro (yearly/monthly) or a 5-unlock pack, paid on Stripe Checkout. */
export function PaywallDialog({
  open,
  onOpenChange,
  reason,
  email: initialEmail,
  billingOpen,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string;
  email?: string | null;
  billingOpen: boolean;
}) {
  const [product, setProduct] = useState<Product>("pro_yearly");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInbox, setCheckInbox] = useState(false);

  async function checkout() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ product, email }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && json.url) {
      window.location.href = json.url;
      return;
    }
    setBusy(false);
    if (res?.ok && json.signIn) return setCheckInbox(true);
    setError(json.error ?? "Something went wrong. Try again.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">See every match</DialogTitle>
          <DialogDescription>{reason ?? "Unlock the jobs you're matched to, and get new ones by email each week."}</DialogDescription>
        </DialogHeader>

        {checkInbox ? (
          <div className="rounded-2xl bg-brand-wash p-4 text-sm">
            <p className="flex items-center gap-2 font-medium text-brand">
              <MailCheck className="size-4" /> Check your inbox
            </p>
            <p className="mt-1 text-foreground/75">
              You already have an account with {email}. We sent you a sign-in link; open it to continue where you left off.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-1.5 text-sm">
              {PRO_FEATURES.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.5} /> {f}
                </li>
              ))}
            </ul>

            <div className="grid gap-2" role="radiogroup" aria-label="Choose a plan">
              {(Object.keys(PLAN_COPY) as Product[]).map((p) => {
                const c = PLAN_COPY[p];
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={product === p}
                    onClick={() => setProduct(p)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border bg-white px-4 py-3 text-left transition-colors",
                      product === p ? "border-brand ring-2 ring-brand/20" : "border-black/10 hover:border-black/20",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">{c.note}</span>
                    </span>
                    <span className="text-right">
                      <span className="font-display text-lg font-semibold">{c.price}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{c.per}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {billingOpen ? (
              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoComplete="email"
                  className="h-11 rounded-xl bg-white"
                  aria-label="Email for your account"
                />
                <p className="text-xs text-muted-foreground">This becomes your account: sign in on any device with a one-time link.</p>
                {error && <p className="text-sm text-rose">{error}</p>}
                <Button onClick={checkout} disabled={busy || !email.includes("@")} size="lg" className="h-12 w-full rounded-full">
                  {busy ? <Loader2 className="animate-spin" /> : <Lock />}
                  {busy ? "Opening secure checkout…" : `Continue to payment · ${PLAN_COPY[product].price}`}
                </Button>
                <p className="text-center text-xs text-muted-foreground">Secure payment by Stripe. Cancel Pro anytime.</p>
              </div>
            ) : (
              <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-muted-foreground">Payments open very soon. Your free matches stay free.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
