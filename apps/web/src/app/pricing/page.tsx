import { PricingTable } from "@/components/site/pricing-table";
import { PublicPage } from "@/components/site/site-chrome";

export const metadata = { title: "Pricing", description: "Start free. Go Pro for every match, weekly job emails with cover notes, and résumé fixes." };

export default function PricingPage() {
  return (
    <PublicPage width="max-w-6xl">
      <h1 className="poster text-center text-[clamp(3rem,8vw,6rem)]">
        Start free.
        <span className="block text-brand">Go Pro when it works.</span>
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-lg text-foreground/65">
        Every search shows your top 3 matches free. Unlock the rest when you&apos;re ready.
      </p>
      <div className="mt-12">
        <PricingTable />
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Prices in USD. Pro renews automatically; cancel anytime from your profile and keep Pro until the end of the period you paid for.
      </p>
    </PublicPage>
  );
}
