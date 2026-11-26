import { Check, EyeOff, FileUp, Lock, X } from "lucide-react";
import { ChainSection } from "@/components/landing/chain-visual";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { CoverNoteMock, DigestMock, FixMock, ImportMock, MatchMock, VerifyMock } from "@/components/landing/mocks";
import { BlurWords, Marquee, Reveal } from "@/components/motion";
import { CompanyLogo } from "@/components/profile/company-logo";
import { ArrowButton, PillNav } from "@/components/site/pill-nav";
import { PricingTable } from "@/components/site/pricing-table";
import { SiteFooter } from "@/components/site/site-chrome";
import { cn } from "@/lib/utils";

/** chainmatch.ai: the career chain-matching engine. */
export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background">
      <PillNav />
      <Hero />
      <Companies />
      <Features />
      <ChainSection />
      <Digest />
      <OldWay />
      <Privacy />
      <Pricing />
      <FaqSection />
      <ClosingCta />
      <SiteFooter />
    </div>
  );
}

/** Small uppercase section label. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-bold tracking-[0.16em] text-foreground/60 uppercase", className)}>{children}</p>;
}

const COMPANIES = [
  ["stripe.com", "Stripe"],
  ["openai.com", "OpenAI"],
  ["notion.so", "Notion"],
  ["figma.com", "Figma"],
  ["shopify.com", "Shopify"],
  ["airbnb.com", "Airbnb"],
  ["spotify.com", "Spotify"],
  ["kraken.com", "Kraken"],
  ["hubspot.com", "HubSpot"],
  ["canva.com", "Canva"],
  ["revolut.com", "Revolut"],
  ["datadoghq.com", "Datadog"],
];

function Companies() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-12 md:flex-row md:items-center">
      <p className="shrink-0 text-xs font-bold tracking-[0.14em] text-foreground/60 uppercase md:w-52">Live openings from company job boards like</p>
      <Marquee className="w-full" gap={44} seconds={45}>
        {COMPANIES.map(([d, name]) => (
          <span key={d} className="flex items-center gap-2 text-sm font-semibold text-foreground/70 grayscale transition hover:grayscale-0">
            <CompanyLogo name={name} domain={d} size="sm" />
            {name}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

const FEATURES = [
  {
    n: "01",
    tag: "Import",
    lines: ["One link,", "your whole profile."],
    body: "Paste your LinkedIn URL or drop in a résumé. We build an editable profile in seconds: roles, skills, education.",
    points: ["LinkedIn URL, PDF, Word or pasted text", "Every field editable before you save", "Your file stays private"],
    panel: "bg-panel-sky",
    Mock: ImportMock,
  },
  {
    n: "02",
    tag: "Match",
    lines: ["Every job,", "ranked by its chain."],
    body: "We search the web and companies' own boards, then rank each opening by how strongly it links to you.",
    points: ["A fit score on every job", "The reasons behind each score", "Any field, any country"],
    panel: "bg-panel-mint",
    Mock: MatchMock,
  },
  {
    n: "03",
    tag: "Verify",
    lines: ["Only jobs that", "are still open."],
    body: "Every posting is checked against the company's live job board, so you never apply to a role that closed last month.",
    points: ["Greenhouse, Lever, Ashby, Workable, SmartRecruiters", "Closed postings removed", "Duplicates merged"],
    panel: "bg-panel-lemon",
    Mock: VerifyMock,
  },
  {
    n: "04",
    tag: "Apply",
    lines: ["A cover note", "for every match."],
    body: "One click drafts a short, specific note from your real experience. Edit it, copy it, apply on the company's site.",
    points: ["Written from your profile, never invented", "120-180 words, no clichés", "Ready in seconds"],
    panel: "bg-panel-peach",
    Mock: CoverNoteMock,
  },
  {
    n: "05",
    tag: "Improve",
    lines: ["Résumé fixes", "that get replies."],
    body: "Concrete rewrites aimed at the jobs you're matching, with a line you can paste straight in.",
    points: ["Tailored to your top matches", "Placeholders where you need real numbers", "Updates when your profile changes"],
    panel: "bg-panel-lilac",
    Mock: FixMock,
  },
];

function Features() {
  return (
    <section id="how" className="scroll-mt-24 px-5 pt-16 pb-12 md:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <BlurWords lines={["Everything between you", "and the offer."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6.5vw,5.4rem)] text-ink" />
          <Reveal>
            <p className="mx-auto mt-5 max-w-lg text-lg text-foreground/65">From your résumé to a sent application, every step lives in one place.</p>
          </Reveal>
        </div>

        <div className="mt-20 space-y-24 md:mt-28 md:space-y-32">
          {FEATURES.map((f, i) => (
            <div key={f.n} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div className={cn(i % 2 === 1 && "md:order-2")}>
                <Reveal>
                  <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] uppercase">
                    <span className="rounded-full bg-ink px-2 py-0.5 text-white tabular">{f.n}</span>
                    {f.tag}
                  </p>
                </Reveal>
                <BlurWords lines={f.lines} className="mt-4 text-[clamp(2.4rem,5vw,3.9rem)] text-ink" as="h3" />
                <Reveal delay={0.1}>
                  <p className="mt-5 max-w-md text-lg text-foreground/65">{f.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-[0.95rem]">
                        <span className="grid size-5 place-items-center rounded-full bg-brand text-white">
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
              <Reveal className={cn(i % 2 === 1 && "md:order-1")} y={40}>
                <div className={cn("relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[32px] p-6 sm:p-10", f.panel)}>
                  <div className="pointer-events-none absolute -right-16 -bottom-24 size-72 rounded-full border-[28px] border-white/40" aria-hidden />
                  <f.Mock />
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Digest() {
  return (
    <section className="px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>ChainMatch Pro</Eyebrow>
          <BlurWords lines={["New links,", "every Monday."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6vw,4.8rem)] text-ink" />
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-lg text-foreground/65">
              Pro members get a weekly email with fresh matches, a cover note for each, the apply link and a few résumé fixes. Just open it and
              apply.
            </p>
            <div className="mt-8">
              <ArrowButton href="#pricing" tone="ink">
                See Pro
              </ArrowButton>
            </div>
          </Reveal>
        </div>
        <Reveal y={40}>
          <div className="flex min-h-[420px] items-center justify-center rounded-[32px] bg-panel-sky p-6 sm:p-10">
            <DigestMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const OLD_NEW = [
  ["Search a dozen job boards by keyword", "One search across company boards, from your résumé"],
  ["Guess which postings you're qualified for", "Every job shows the chain: why it fits, and where it doesn't"],
  ["Apply to roles that closed weeks ago", "Postings confirmed open on the company's own board"],
  ["Rewrite a cover letter every time", "A draft cover note from your real experience"],
  ["Wonder why nobody replies", "Résumé fixes aimed at the jobs you want"],
];

function OldWay() {
  return (
    <section className="px-5 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <Eyebrow>Why ChainMatch</Eyebrow>
          <BlurWords lines={["The old way", "vs the chain way."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6.5vw,5rem)] text-ink" />
        </div>
        <div className="relative mt-14 grid gap-3 md:grid-cols-2">
          <span className="poster absolute top-3 left-1/2 z-10 hidden size-14 -translate-x-1/2 place-items-center rounded-full bg-panel-lemon text-xl text-ink ring-4 ring-background md:grid">vs</span>
          <div className="space-y-3">
            <p className="poster rounded-2xl bg-white px-5 py-4 text-2xl text-foreground/40 ring-1 ring-black/[0.06] md:pr-10">The old way</p>
            {OLD_NEW.map(([a], i) => (
              <Reveal key={a} delay={i * 0.06}>
                <p className="flex items-center gap-3 rounded-2xl bg-black/[0.035] px-5 py-4 text-[0.95rem] text-foreground/55">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10">
                    <X className="size-3.5" />
                  </span>
                  {a}
                </p>
              </Reveal>
            ))}
          </div>
          <div className="space-y-3">
            <p className="poster rounded-2xl bg-ink px-5 py-4 text-2xl text-brand-soft md:pl-11">With ChainMatch</p>
            {OLD_NEW.map(([, b], i) => (
              <Reveal key={b} delay={i * 0.06 + 0.1}>
                <p className="flex items-center gap-3 rounded-2xl bg-brand px-5 py-4 text-[0.95rem] font-medium text-white">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-brand">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {b}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const PRIVACY = [
  { icon: EyeOff, t: "Hidden by default", b: "Recruiters can't find you unless you turn it on.", panel: "bg-panel-mint" },
  { icon: Lock, t: "Anonymous until you say yes", b: "They see skills and experience, never your name, email or résumé file, until you accept an invite.", panel: "bg-panel-peach" },
  { icon: FileUp, t: "Your résumé stays private", b: "Stored privately and only used to build your profile and search for you.", panel: "bg-panel-sky" },
];

function Privacy() {
  return (
    <section id="privacy" className="scroll-mt-24 px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <Eyebrow>Privacy</Eyebrow>
            <BlurWords lines={["You decide", "who sees you."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6vw,4.6rem)] text-ink" />
          </div>
          <Reveal>
            <p className="max-w-sm text-foreground/65">Your profile is for finding jobs. Nobody browses it unless you choose to be found.</p>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PRIVACY.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.08}>
              <div className={cn("h-full rounded-[28px] p-7", p.panel)}>
                <span className="grid size-11 place-items-center rounded-2xl bg-white shadow-soft">
                  <p.icon className="size-5 text-ink" />
                </span>
                <p className="mt-6 font-display text-xl font-semibold">{p.t}</p>
                <p className="mt-1.5 text-foreground/65">{p.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-3 py-6">
      <div className="rounded-[36px] bg-panel-lilac/70 px-5 py-20 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Eyebrow>Pricing</Eyebrow>
              <BlurWords lines={["Start free.", "Go Pro when it works."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6vw,4.6rem)] text-ink" />
            </div>
            <Reveal>
              <p className="max-w-sm text-foreground/65">Every search shows your top 3 matches free. No card needed to start; cancel Pro anytime.</p>
            </Reveal>
          </div>
          <Reveal className="mt-12" y={30}>
            <PricingTable />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <BlurWords lines={["Questions,", "answered."]} accent={[1]} className="mt-4 text-[clamp(2.6rem,6vw,4.6rem)] text-ink" />
          <Reveal>
            <p className="mt-5 max-w-sm text-foreground/65">
              Something else? Write to{" "}
              <a href="mailto:hello@chainmatch.ai" className="font-medium text-foreground underline underline-offset-4">
                hello@chainmatch.ai
              </a>
              .
            </p>
          </Reveal>
        </div>
        <Reveal y={30}>
          <Faq />
        </Reveal>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="px-3 pb-6">
      <div className="relative overflow-hidden rounded-[36px] bg-brand px-5 py-24 text-center text-white md:py-32">
        {/* chain rings */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2" aria-hidden>
          <div className="absolute inset-y-0 left-0 w-[480px] rounded-full border-[36px] border-white/[0.09]" />
          <div className="absolute inset-y-0 right-0 w-[480px] rounded-full border-[36px] border-white/[0.09]" />
        </div>
        <div className="relative">
          <BlurWords lines={["Ready for", "your next link?"]} accent={[1]} accentClassName="text-panel-lemon" className="text-[clamp(3rem,8vw,6.6rem)]" />
          <Reveal>
            <p className="mx-auto mt-6 max-w-md text-lg text-white/80">Upload a résumé and see live matches in about a minute. Free, no account needed.</p>
            <div className="mt-9 flex justify-center">
              <ArrowButton href="/onboarding" tone="light">
                Get my matches
              </ArrowButton>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
