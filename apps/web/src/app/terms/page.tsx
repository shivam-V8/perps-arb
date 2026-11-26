import { Prose, PublicPage } from "@/components/site/site-chrome";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <PublicPage>
      <Prose>
        <h1>Terms of service</h1>
        <p>Last updated 26 November 2026. By using ChainMatch you agree to these terms.</p>
        <h2>What ChainMatch does</h2>
        <p>
          ChainMatch reads the profile you give it (a résumé, LinkedIn link or pasted text), searches public job listings and company job boards, and
          ranks openings for you. Listings belong to the companies that post them. We don&apos;t guarantee that a job is still open, that you&apos;ll
          be hired, or that AI-written text (summaries, cover notes, résumé fixes) is free of mistakes: check everything before you send it.
        </p>
        <h2>Your account</h2>
        <p>
          You can use ChainMatch without an account; your data is tied to this browser. When you pay or add your email, that email becomes your
          account and you sign in with one-time links. Keep access to your inbox secure. Only add profiles that are yours.
        </p>
        <h2>Plans and payment</h2>
        <ul>
          <li>Free: the top matches of each search and a limited number of searches.</li>
          <li>Pro (monthly or yearly): renews automatically until you cancel. Cancel anytime from your profile; you keep Pro until the end of the period you paid for.</li>
          <li>Unlock packs: one-off purchases; unlocked jobs stay unlocked.</li>
        </ul>
        <p>Payments are processed by Stripe. Prices are shown before you pay and may change for future periods with notice.</p>
        <h2>Fair use</h2>
        <p>Don&apos;t scrape, resell or overload the service, or use it to collect other people&apos;s data. We may limit or close accounts that do.</p>
        <h2>Liability</h2>
        <p>ChainMatch is provided as is. To the extent the law allows, our liability is limited to the amount you paid us in the last 12 months.</p>
        <h2>Contact</h2>
        <p>Questions: hello@chainmatch.ai</p>
      </Prose>
    </PublicPage>
  );
}
