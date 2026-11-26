"use client";

import { Lock, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PaywallDialog } from "@/components/billing/paywall";
import type { Entitlement } from "@/lib/types";

type Fix = { section: string; issue: string; fix: string; example: string };

/** Résumé fixes from the review API: free sees the first, Pro sees all. */
export function ResumeFixes({ entitlement, billingOpen }: { entitlement: Entitlement; billingOpen: boolean }) {
  const [fixes, setFixes] = useState<Fix[] | null>(null);
  const [locked, setLocked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/resume/review", { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) return setError(json.error ?? "Couldn't load your résumé review.");
    setFixes(json.fixes);
    setLocked(json.locked ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Wand2 className="size-5 text-brand" /> Fixes for your résumé
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">Aimed at the jobs you&apos;re matching. Updates when you edit your profile.</p>

      {error ? (
        <p className="mt-4 text-sm text-rose">{error}</p>
      ) : !fixes ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 animate-pulse text-brand" /> Reviewing your profile…
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {fixes.map((f, i) => (
            <li key={i} className="rounded-2xl bg-surface-2 p-4 ring-1 ring-black/[0.04]">
              <p className="text-xs font-semibold tracking-wide text-brand uppercase">{f.section}</p>
              <p className="mt-1 text-sm">{f.issue}</p>
              <p className="mt-1 text-sm font-medium">{f.fix}</p>
              {f.example && <p className="mt-2 rounded-xl bg-white p-2.5 text-sm text-foreground/80 ring-1 ring-black/[0.05]">“{f.example}”</p>}
            </li>
          ))}
          {locked > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setPaywall(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 p-4 text-sm font-medium text-foreground/75 hover:border-brand/50 hover:text-foreground"
              >
                <Lock className="size-4" /> {locked} more fix{locked === 1 ? "" : "es"} with Pro
              </button>
            </li>
          )}
        </ol>
      )}
      <PaywallDialog
        open={paywall}
        onOpenChange={setPaywall}
        reason="Pro shows every résumé fix, unlocks all your matches and emails you new ones weekly."
        email={entitlement.email}
        billingOpen={billingOpen}
      />
    </section>
  );
}
