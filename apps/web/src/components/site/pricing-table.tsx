import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FREE_FEATURES, PLAN_COPY, PRO_FEATURES } from "@/lib/billing/plans";

/** Free vs Pro vs pack, for the landing page and /pricing. Buying happens in the app (it needs your matches). */
export function PricingTable() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Tier name="Free" price="$0" per="" features={FREE_FEATURES} cta="Start free" />
      <Tier
        name="Pro"
        price={PLAN_COPY.pro_monthly.price}
        per="/month"
        sub={`or ${PLAN_COPY.pro_yearly.price}/year (save 40%)`}
        features={PRO_FEATURES}
        cta="Start free, upgrade anytime"
        featured
      />
      <Tier
        name="Unlock pack"
        price={PLAN_COPY.pack.price}
        per="one-off"
        sub="No subscription"
        features={["Unlock any 5 matched jobs", "Yours to keep, no expiry", "Cover notes for unlocked jobs"]}
        cta="Start free"
      />
    </div>
  );
}

function Tier({
  name,
  price,
  per,
  sub,
  features,
  cta,
  featured = false,
}: {
  name: string;
  price: string;
  per: string;
  sub?: string;
  features: string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <div className={featured ? "relative rounded-[28px] bg-[#0b0d12] p-7 text-white" : "rounded-[28px] border border-black/[0.06] bg-white p-7 shadow-soft"}>
      {featured && <span className="absolute top-6 right-6 rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Most popular</span>}
      <p className={featured ? "text-sm font-semibold text-brand-soft" : "text-sm font-semibold text-brand"}>{name}</p>
      <p className="mt-3 font-display text-4xl font-bold tracking-tight">
        {price}
        {per && <span className={featured ? "ml-1 text-base font-medium text-white/60" : "ml-1 text-base font-medium text-muted-foreground"}>{per}</span>}
      </p>
      <p className={featured ? "mt-1 h-5 text-sm text-white/60" : "mt-1 h-5 text-sm text-muted-foreground"}>{sub ?? ""}</p>
      <ul className="mt-6 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className={featured ? "mt-0.5 size-4 shrink-0 text-brand-soft" : "mt-0.5 size-4 shrink-0 text-brand"} strokeWidth={2.5} />
            <span className={featured ? "text-white/85" : "text-foreground/80"}>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        asChild
        size="lg"
        className={featured ? "mt-7 h-11 w-full rounded-full bg-white text-[#0b0d12] hover:bg-white/90" : "mt-7 h-11 w-full rounded-full"}
        variant={featured ? "default" : "outline"}
      >
        <Link href="/onboarding">{cta}</Link>
      </Button>
    </div>
  );
}
