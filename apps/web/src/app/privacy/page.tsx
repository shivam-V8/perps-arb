import { Prose, PublicPage } from "@/components/site/site-chrome";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <PublicPage>
      <Prose>
        <h1>Privacy policy</h1>
        <p>Last updated 26 November 2026.</p>
        <h2>What we collect</h2>
        <ul>
          <li>Your profile: what you upload or paste (résumé, LinkedIn link or text) and what you edit. Uploaded résumé files are stored privately.</li>
          <li>Your email, if you pay or sign in, and your plan and purchase history.</li>
          <li>The jobs we find for you and what you save or skip.</li>
          <li>A cookie that identifies your browser session. No advertising or tracking cookies.</li>
        </ul>
        <h2>How we use it</h2>
        <p>
          To build your profile, find and rank jobs, write cover notes and résumé fixes, send the emails you asked for, and run billing. Your profile
          text is sent to our AI provider to do this; it isn&apos;t used to train models. Recruiters can only find you if you switch that on, and
          then see your skills and experience, not your name, email or résumé file, unless you accept their invite.
        </p>
        <h2>Who we share it with</h2>
        <p>
          Service providers that run ChainMatch: hosting (Cloudflare), database (Neon), AI processing (Anthropic), profile import (Firecrawl), email
          (Resend) and payments (Stripe, which handles your card details; we never see them). We don&apos;t sell your data.
        </p>
        <h2>Your choices</h2>
        <p>
          Edit your profile anytime. Turn off the weekly email from your profile or with the link in any email. To delete your data, email
          hello@chainmatch.ai from the address on your account (or tell us your profile name if you never added one).
        </p>
      </Prose>
    </PublicPage>
  );
}
