import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Check,
  Code2,
  EyeOff,
  FileUp,
  GraduationCap,
  HeartPulse,
  Layers,
  Lock,
  Megaphone,
  MessageCircle,
  Palette,
  Scale,
  Search,
  Settings2,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ResumeFlow } from "@/components/landing/resume-flow";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <Hero />
      <AnyField />
      <HowItWorks />
      <Compare />
      <Privacy />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-hero-paper relative">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm">
          <a href="#how" className="hidden rounded-full px-3 py-1.5 text-foreground/70 hover:text-foreground md:block">
            How it works
          </a>
          <a href="#privacy" className="hidden rounded-full px-3 py-1.5 text-foreground/70 hover:text-foreground md:block">
            Privacy
          </a>
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href="/onboarding">Open app</Link>
          </Button>
        </nav>
      </header>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-10 pb-20 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pb-28">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white px-3 py-1 text-xs font-semibold text-brand">
            <Sparkles className="size-3.5" /> Any field · live job postings · AI-ranked
          </p>
          <h1 className="mt-6 font-display text-[2.9rem] leading-[1] font-bold tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.3rem]">
            Upload your résumé. <span className="text-brand">Swipe on jobs that fit.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-foreground/65">
            Paste your LinkedIn link or upload a résumé. We find open roles on the web and on companies&apos; own job boards, and rank
            them for you. Recruiters get the other side: candidates who fit, ready to invite.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-13 rounded-full px-7 text-[0.95rem]">
              <Link href="/onboarding?role=candidate">
                <FileUp /> I&apos;m looking for a job
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-13 rounded-full border-black/10 bg-white px-7 text-[0.95rem]">
              <Link href="/onboarding?role=recruiter">
                <Briefcase /> I&apos;m hiring
              </Link>
            </Button>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-foreground/70">
            {["LinkedIn link, PDF or Word", "Live postings from company job boards", "Free to try"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand" strokeWidth={2.5} /> {t}
              </li>
            ))}
          </ul>
        </div>
        <ResumeFlow />
      </div>
    </section>
  );
}

const FIELD_TILES = [
  { icon: HeartPulse, label: "Healthcare" },
  { icon: Code2, label: "Engineering" },
  { icon: BarChart3, label: "Data" },
  { icon: TrendingUp, label: "Sales" },
  { icon: Megaphone, label: "Marketing" },
  { icon: Palette, label: "Design" },
  { icon: Wallet, label: "Finance" },
  { icon: Settings2, label: "Operations" },
  { icon: GraduationCap, label: "Education" },
  { icon: Scale, label: "Legal" },
];

function AnyField() {
  return (
    <section className="border-y border-black/[0.06] bg-white px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Nurses, analysts, teachers, engineers, sales leads: it works for any profession
        </p>
        <ul className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FIELD_TILES.map((f) => (
            <li key={f.label} className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-4 py-3 ring-1 ring-black/[0.04]">
              <f.icon className="size-4 text-brand" />
              <span className="text-sm font-medium">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  const seeker = [
    { icon: FileUp, t: "Add your profile", b: "Paste your LinkedIn link, or upload a résumé or LinkedIn PDF. We build a profile you can edit." },
    { icon: Search, t: "We find live openings", b: "Web search plus companies' own job boards (Greenhouse, Lever, Ashby and more), so closed postings are filtered out." },
    { icon: Layers, t: "Swipe and apply", b: "Every card says why it fits. Save the good ones, draft a cover note, apply on the company's site." },
  ];
  const recruiter = [
    { icon: Briefcase, t: "Describe the role", b: "Paste a job description or write one sentence. We turn it into clear requirements." },
    { icon: Sparkles, t: "Swipe ranked candidates", b: "People who opted in to be found, ranked against your must-haves, each with a reason." },
    { icon: MessageCircle, t: "Invite and talk", b: "Swipe right to invite. When they accept, you get their name, résumé and a chat." },
  ];
  return (
    <section id="how" className="scroll-mt-10 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-4xl font-bold tracking-tight sm:text-5xl">Two sides, one swipe</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {[
            { title: "For job seekers", steps: seeker, dark: false },
            { title: "For recruiters", steps: recruiter, dark: true },
          ].map((col) => (
            <div
              key={col.title}
              className={
                col.dark ? "rounded-[32px] bg-[#0b0d12] p-8 text-white" : "rounded-[32px] border border-black/[0.06] bg-white p-8 shadow-soft"
              }
            >
              <p className={col.dark ? "text-sm font-semibold text-brand-soft" : "text-sm font-semibold text-brand"}>{col.title}</p>
              <ol className="mt-6 space-y-6">
                {col.steps.map((s, i) => (
                  <li key={s.t} className="flex gap-4">
                    <span className={col.dark ? "grid size-10 shrink-0 place-items-center rounded-xl bg-white/10" : "grid size-10 shrink-0 place-items-center rounded-xl bg-brand-wash"}>
                      <s.icon className={col.dark ? "size-4.5 text-white" : "size-4.5 text-brand"} />
                    </span>
                    <div>
                      <p className="font-display text-lg font-semibold">
                        <span className="mr-2 opacity-40">{i + 1}</span>
                        {s.t}
                      </p>
                      <p className={col.dark ? "mt-0.5 text-sm text-white/60" : "mt-0.5 text-sm text-foreground/60"}>{s.b}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Compare() {
  const rows = [
    ["Search a dozen job boards by keyword", "One search across careers pages and boards, from your résumé"],
    ["Guess which postings you're qualified for", "Each job says why it fits, and where it doesn't"],
    ["Rewrite a cover letter every time", "A draft cover note from your real experience"],
    ["Recruiters wade through hundreds of applications", "Recruiters see a ranked shortlist and invite in one swipe"],
  ];
  return (
    <section className="bg-white px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">Less searching. More hearing back.</h2>
        <div className="mt-12 overflow-hidden rounded-[28px] border border-black/[0.06]">
          <div className="grid grid-cols-2 bg-surface-2 text-sm font-semibold">
            <p className="px-5 py-3 text-muted-foreground">The usual way</p>
            <p className="border-l border-black/[0.06] px-5 py-3 text-brand">With ChainMatch</p>
          </div>
          {rows.map(([a, b]) => (
            <div key={a} className="grid grid-cols-2 border-t border-black/[0.06] text-sm">
              <p className="px-5 py-4 text-foreground/55 line-through decoration-black/20">{a}</p>
              <p className="flex gap-2 border-l border-black/[0.06] px-5 py-4 font-medium">
                <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.5} />
                {b}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Privacy() {
  const items = [
    { icon: EyeOff, t: "Hidden by default", b: "Recruiters can't find you unless you turn it on." },
    { icon: Lock, t: "Anonymous until you say yes", b: "They see skills and experience, never your name, email or résumé file, until you accept an invite." },
    { icon: FileUp, t: "Your résumé stays private", b: "Stored privately and only used to build your profile and search for you." },
  ];
  return (
    <section id="privacy" className="scroll-mt-10 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-xl font-display text-4xl font-bold tracking-tight sm:text-5xl">You decide who sees you</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {items.map((i) => (
            <div key={i.t} className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft">
              <i.icon className="size-5 text-brand" />
              <p className="mt-4 font-display text-lg font-semibold">{i.t}</p>
              <p className="mt-1 text-sm text-foreground/60">{i.b}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-[#0b0d12] px-6 py-20 text-center text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(45%_70%_at_50%_0%,rgb(16_185_129/0.35),transparent_70%)]"
          aria-hidden
        />
        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-6xl">Your next job is a swipe away</h2>
        <p className="relative mx-auto mt-4 max-w-md text-lg text-white/60">Upload a résumé and see live matches in about a minute.</p>
        <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-full bg-white px-7 text-[#0b0d12] hover:bg-white/90">
            <Link href="/onboarding?role=candidate">
              I&apos;m looking for a job <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-white/20 bg-transparent px-7 text-white hover:bg-white/10 hover:text-white"
          >
            <Link href="/onboarding?role=recruiter">I&apos;m hiring</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <Logo />
        <p>© {new Date().getFullYear()} ChainMatch · Résumé-to-job matching for any field</p>
      </div>
    </footer>
  );
}
