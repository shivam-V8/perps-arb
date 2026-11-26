"use client";

import { Crown, Loader2, Mail, Ticket } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setDigest } from "@/app/actions";
import { PaywallDialog } from "@/components/billing/paywall";
import { Button } from "@/components/ui/button";
import type { Entitlement } from "@/lib/types";

/** Profile: current plan, billing portal, digest switch, sign-in state. */
export function PlanCard({ entitlement, billingOpen, hasPurchases }: { entitlement: Entitlement; billingOpen: boolean; hasPurchases: boolean }) {
  const pro = entitlement.plan === "pro";
  const [paywall, setPaywall] = useState(false);
  const [opening, setOpening] = useState(false);
  const [digestOn, setDigestOn] = useState(entitlement.digestEnabled);
  const [pending, start] = useTransition();

  async function portal() {
    setOpening(true);
    const res = await fetch("/api/billing/portal", { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (res?.ok && json.url) return void (window.location.href = json.url);
    setOpening(false);
    toast.error(json.error ?? "Couldn't open billing.");
  }

  const renews = entitlement.renewsAt ? new Date(entitlement.renewsAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-display text-xl font-semibold">
            {pro ? <Crown className="size-5 text-brand" /> : null}
            {pro ? "ChainMatch Pro" : "Free plan"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pro
              ? renews
                ? entitlement.cancelAtPeriodEnd
                  ? `Ends on ${renews}`
                  : `Renews on ${renews}`
                : "Active"
              : "Top 3 matches of every search, 2 searches a week."}
          </p>
          {entitlement.credits > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Ticket className="size-4 text-brand" /> {entitlement.credits} job unlock{entitlement.credits === 1 ? "" : "s"} left
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {!pro && (
            <Button className="rounded-full" onClick={() => setPaywall(true)}>
              <Crown /> Go Pro
            </Button>
          )}
          {hasPurchases && billingOpen && (
            <Button variant="outline" className="rounded-full border-black/10 bg-white" onClick={portal} disabled={opening}>
              {opening && <Loader2 className="animate-spin" />} Manage billing
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-4" />
          {entitlement.email ? (
            <>Signed in as <span className="font-medium text-foreground">{entitlement.email}</span></>
          ) : (
            <>
              Saved in this browser only.{" "}
              <Link href="/signin" className="font-medium text-foreground underline underline-offset-2">
                Add your email
              </Link>{" "}
              to use it on other devices.
            </>
          )}
        </p>
        {pro && (
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-[var(--brand)]"
              checked={digestOn}
              disabled={pending}
              onChange={(e) => {
                const on = e.target.checked;
                setDigestOn(on);
                start(() => setDigest(on));
              }}
            />
            Weekly job email
          </label>
        )}
      </div>
      <PaywallDialog open={paywall} onOpenChange={setPaywall} email={entitlement.email} billingOpen={billingOpen} />
    </section>
  );
}
