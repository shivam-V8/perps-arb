import { Prose, PublicPage } from "@/components/site/site-chrome";

export const metadata = { title: "Refunds" };

export default function RefundsPage() {
  return (
    <PublicPage>
      <Prose>
        <h1>Refunds and cancellation</h1>
        <p>Last updated 26 November 2026.</p>
        <h2>Pro</h2>
        <p>
          Cancel anytime from your profile (Manage billing). You keep Pro until the end of the period you paid for and won&apos;t be charged again.
          If you were charged for a renewal you didn&apos;t mean to keep and haven&apos;t used Pro since, email us within 7 days for a refund.
        </p>
        <h2>Unlock packs</h2>
        <p>
          If you haven&apos;t used any unlocks from a pack, email us within 14 days for a full refund. Refunded packs&apos; unused unlocks are
          removed.
        </p>
        <h2>How to ask</h2>
        <p>Email hello@chainmatch.ai from the address on your account. Refunds go back to the original payment method, usually within 5-10 days.</p>
      </Prose>
    </PublicPage>
  );
}
