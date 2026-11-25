"use client";

import { Archive, CheckCircle2, ExternalLink, FileText, Globe, Link2, Loader2, Sparkles, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { CandidateDraft } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeLinkedInProfile } from "@/lib/linkedin-url";
import type { CandidateProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CandidateForm, EMPTY_CANDIDATE } from "./candidate-form";

type Mode = "export" | "linkedin" | "file" | "paste";
type Source = { url: string; title: string };
type Provenance =
  | { kind: "resume" }
  | { kind: "linkedin"; sources: Source[]; missing: string[]; via: "provider" | "search" }
  | { kind: "export"; found: { positions: number; education: number; skills: number; certifications: number }; missingFiles: string[] };

const LINKEDIN_EXPORT_URL = "https://www.linkedin.com/mypreferences/d/download-my-data";

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** Step 1: LinkedIn link, résumé file, or pasted text. Step 2: review the draft before saving. */
export function ResumeIntake() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("export");
  const [file, setFile] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [liUrl, setLiUrl] = useState("");
  const [ownProfile, setOwnProfile] = useState(false);
  const [liName, setLiName] = useState("");
  const [liHint, setLiHint] = useState("");
  const [liPaste, setLiPaste] = useState("");
  /** minutes until the next LinkedIn lookup is allowed, when rate-limited */
  const [limitMins, setLimitMins] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [provenance, setProvenance] = useState<Provenance | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function parse() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (file && mode === "file") fd.append("file", file);
    if (text.trim() && mode === "paste") fd.append("text", text);
    const res = await fetch("/api/resume/parse", { method: "POST", body: fd }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? "Something went wrong.");
    setProvenance({ kind: "resume" });
    setProfile({ ...EMPTY_CANDIDATE, ...(json.draft as CandidateDraft), visible_to_recruiters: false });
  }

  async function importExport() {
    if (!zip) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", zip);
    const res = await fetch("/api/resume/linkedin-export", { method: "POST", body: fd }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? "Something went wrong.");
    setProvenance({ kind: "export", found: json.found, missingFiles: json.missingFiles ?? [] });
    setProfile({ ...EMPTY_CANDIDATE, ...(json.draft as CandidateDraft & { email: string }), visible_to_recruiters: false });
  }

  /** The user copied their own profile page (select all → copy) and pasted it. */
  async function parsePastedProfile() {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("text", liPaste);
    const res = await fetch("/api/resume/parse", { method: "POST", body: fd }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return setError(json.error ?? "Something went wrong.");
    setProvenance({ kind: "resume" });
    const canon = normalizeLinkedInProfile(liUrl)?.url ?? null;
    setProfile({ ...EMPTY_CANDIDATE, ...(json.draft as CandidateDraft), linkedin_url: canon, visible_to_recruiters: false });
  }

  async function importLinkedIn() {
    setBusy(true);
    setError(null);
    setNotFound(false);
    setLimitMins(null);
    const res = await fetch("/api/resume/linkedin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: liUrl, confirmOwn: ownProfile, name: liName, hint: liHint }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (res?.status === 429) {
      setLimitMins(json.retryAfterMins ?? 60);
      return setNotFound(true);
    }
    if (!res?.ok) return setError(json.error ?? "Something went wrong.");
    if (!json.matched) {
      if (!liName && json.guessedName) setLiName(json.guessedName);
      return setNotFound(true);
    }
    setProvenance({ kind: "linkedin", sources: json.sources ?? [], missing: json.missing ?? [], via: json.via === "provider" ? "provider" : "search" });
    setProfile({ ...EMPTY_CANDIDATE, ...(json.draft as CandidateDraft), linkedin_url: json.linkedin_url, visible_to_recruiters: false });
  }

  if (profile) {
    return (
      <div>
        {provenance?.kind === "export" ? (
          <div className="mb-6 rounded-2xl bg-brand-wash px-4 py-3 text-sm text-brand">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="size-4 shrink-0" />
              Imported from your LinkedIn data export: {provenance.found.positions} roles, {provenance.found.education} schools,{" "}
              {provenance.found.skills} skills{provenance.found.certifications ? `, ${provenance.found.certifications} certifications` : ""}.
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              {provenance.missingFiles.length
                ? `Not in your export: ${provenance.missingFiles.join(", ")}. Add those details below if you like. `
                : ""}
              Pick your field and check everything before saving.
            </p>
          </div>
        ) : provenance?.kind === "linkedin" && provenance.via === "provider" ? null : provenance?.kind === "linkedin" ? (
          <div className="mb-6 rounded-2xl bg-brand-wash px-4 py-3 text-sm text-brand">
            <p className="flex items-center gap-2 font-medium">
              <Globe className="size-4 shrink-0" />
              Built from {provenance.sources.length} public {provenance.sources.length === 1 ? "source" : "sources"}. Check every field before saving.
            </p>
            {provenance.sources.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {provenance.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.title}
                      className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs text-foreground/70 hover:text-foreground"
                    >
                      {host(s.url)} <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {provenance.missing.length > 0 && (
              <p className="mt-2 text-xs text-foreground/70">
                Couldn&apos;t find: {provenance.missing.join(", ")}. Fill these in, or{" "}
                <button type="button" className="underline" onClick={() => (setProfile(null), setMode("file"))}>
                  upload your LinkedIn PDF
                </button>{" "}
                for the full history.
              </p>
            )}
          </div>
        ) : (
          <p className="mb-6 flex items-center gap-2 rounded-2xl bg-brand-wash px-4 py-3 text-sm text-brand">
            <Sparkles className="size-4 shrink-0" />
            Read by AI. Check every field; nothing is saved until you click save.
          </p>
        )}
        <CandidateForm initial={profile} submitLabel="Save and find jobs" onSaved={() => router.push("/jobs?search=1")} />
      </div>
    );
  }

  const liCanon = normalizeLinkedInProfile(liUrl)?.url ?? null;
  const liValid = Boolean(liCanon);

  return (
    <div>
      <div className="flex w-fit flex-wrap gap-1 rounded-full bg-white p-1 shadow-soft ring-1 ring-black/5">
        {(
          [
            { m: "export", label: "LinkedIn export", icon: Archive },
            { m: "linkedin", label: "LinkedIn link", icon: Link2 },
            { m: "file", label: "Upload résumé", icon: Upload },
            { m: "paste", label: "Paste text", icon: FileText },
          ] as const
        ).map((o) => (
          <button
            key={o.m}
            type="button"
            onClick={() => {
              setMode(o.m);
              setError(null);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
              mode === o.m ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground",
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        ))}
      </div>

      {mode === "export" && (
        <div className="mt-5">
          <div className="rounded-2xl bg-surface-2 p-4 text-sm text-foreground/80 ring-1 ring-black/5">
            <p className="font-medium text-foreground">Get your full profile from LinkedIn (recommended, works for every profile)</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Open LinkedIn&apos;s{" "}
                <a href={LINKEDIN_EXPORT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
                  Download your data
                </a>{" "}
                page (Settings → Data privacy → Get a copy of your data).
              </li>
              <li>
                Choose <span className="font-medium">“Want something in particular?”</span> and tick <span className="font-medium">Profile, Positions, Education, Skills</span>. Click <span className="font-medium">Request archive</span>.
              </li>
              <li>LinkedIn emails you a download link, usually within minutes. Upload that .zip here.</li>
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              We only read your profile, jobs, education and skills from it. Messages, connections and everything else are never opened, and the file isn&apos;t stored.
            </p>
          </div>
          <button
            type="button"
            onClick={() => zipRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setZip(f);
            }}
            className="mt-4 flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-white px-6 py-8 text-center transition-colors hover:border-brand/50"
          >
            <Archive className="size-6 text-brand" />
            <span className="mt-3 font-medium">{zip ? zip.name : "Drop your LinkedIn export .zip here"}</span>
            <span className="mt-1 text-sm text-muted-foreground">{zip ? "Click to choose a different file" : "The file is named like Basic_LinkedInDataExport_….zip"}</span>
            <input ref={zipRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => setZip(e.target.files?.[0] ?? null)} />
          </button>
        </div>
      )}

      {mode === "linkedin" && (
        <div className="mt-5">
          <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 shadow-soft ring-1 ring-black/[0.06]">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={liUrl}
              onChange={(e) => setLiUrl(e.target.value)}
              placeholder="linkedin.com/in/your-name"
              className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              inputMode="url"
              autoComplete="url"
            />
          </div>
          {liUrl.trim() && (
            <p className={cn("mt-1.5 px-4 text-xs", liCanon ? "text-brand" : "text-rose")}>
              {liCanon ? `✓ We'll look up ${liCanon}` : "That isn't a LinkedIn profile link. It should look like linkedin.com/in/your-name"}
            </p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={liName} onChange={(e) => setLiName(e.target.value)} placeholder="Your full name (optional)" className="h-10 rounded-xl bg-white" />
            <Input
              value={liHint}
              onChange={(e) => setLiHint(e.target.value)}
              placeholder="Current company or city (optional)"
              className="h-10 rounded-xl bg-white"
            />
          </div>
          <p className="mt-1.5 px-1 text-xs text-muted-foreground">Helps us find the right person if your name is common.</p>
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 px-1 text-sm">
            <input type="checkbox" checked={ownProfile} onChange={(e) => setOwnProfile(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>This is my own profile</span>
          </label>
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            We look up what&apos;s publicly available about this profile on the web (search results, personal sites, team pages).
            We search public web sources for this profile. It only works if search engines have a copy of it; if not, we&apos;ll show you a quick copy-and-paste option.
          </p>
          {notFound && (
            <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm ring-1 ring-black/5">
              {limitMins !== null ? (
                <>
                  <p className="font-medium">
                    You&apos;ve used this hour&apos;s automatic LinkedIn lookups. Next one in {limitMins} min.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    No need to wait: paste your profile below or use your LinkedIn export. Those don&apos;t count toward the limit.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Your link is fine, but we can&apos;t read that profile automatically.</p>
                  <p className="mt-1 text-muted-foreground">
                    LinkedIn hides work history from automated readers, and no public copy of this profile was found.
                    Quickest fix: copy your own profile page and paste it here.
                  </p>
                </>
              )}
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-foreground/80">
                <li>
                  Open{" "}
                  <a href={liCanon ?? "https://www.linkedin.com/in/"} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline underline-offset-2">
                    your LinkedIn profile
                  </a>{" "}
                  (signed in is fine).
                </li>
                <li>
                  Press <kbd className="rounded border border-black/15 bg-white px-1 text-xs">Ctrl/⌘ A</kbd> then{" "}
                  <kbd className="rounded border border-black/15 bg-white px-1 text-xs">Ctrl/⌘ C</kbd> to copy the whole page.
                </li>
                <li>Paste it below. For roles hidden behind “Show all experiences”, open that page and paste it too.</li>
              </ol>
              <Textarea
                value={liPaste}
                onChange={(e) => setLiPaste(e.target.value.slice(0, 40000))}
                rows={6}
                placeholder="Paste your profile page here…"
                className="mt-3 resize-none rounded-xl bg-white"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full" disabled={busy || liPaste.trim().length < 80} onClick={parsePastedProfile}>
                  {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Read my pasted profile
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setMode("export")}>
                  <Archive /> Use LinkedIn export instead
                </Button>
                {limitMins === null && !(liName && liHint) && (
                  <Button size="sm" variant="ghost" className="rounded-full" disabled={busy || !liName || !liHint} onClick={importLinkedIn}>
                    Retry search with name + company
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "file" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className="mt-5 flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-white px-6 py-10 text-center transition-colors hover:border-brand/50"
        >
          <Upload className="size-6 text-brand" />
          <span className="mt-3 font-medium">{file ? file.name : "Drop your résumé or LinkedIn PDF here"}</span>
          <span className="mt-1 text-sm text-muted-foreground">{file ? "Click to choose a different file" : "PDF, DOCX or TXT, up to 8 MB"}</span>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt,.md,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </button>
      )}

      {mode === "paste" && (
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 40000))}
          rows={10}
          placeholder="Paste your résumé, or your LinkedIn About and Experience sections…"
          className="mt-5 resize-none rounded-2xl bg-white"
        />
      )}

      {error && <p className="mt-3 text-sm text-rose">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {mode === "export" ? (
          <Button onClick={importExport} disabled={!zip || busy} size="lg" className="h-12 rounded-full px-7">
            {busy ? <Loader2 className="animate-spin" /> : <Archive />}
            {busy ? "Importing…" : "Import my LinkedIn data"}
          </Button>
        ) : mode === "linkedin" ? (
          <Button onClick={importLinkedIn} disabled={!liValid || !ownProfile || busy} size="lg" className="h-12 rounded-full px-7">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Looking it up…" : "Import my profile"}
          </Button>
        ) : (
          <Button onClick={parse} disabled={busy || (mode === "file" ? !file : text.trim().length < 40)} size="lg" className="h-12 rounded-full px-7">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Reading…" : "Read my résumé"}
          </Button>
        )}
        <button
          type="button"
          onClick={() => {
            setProvenance(null);
            setProfile({ ...EMPTY_CANDIDATE });
          }}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Fill it in myself
        </button>
      </div>
      {busy && (
        <p className="mt-3 text-sm text-muted-foreground">
          {mode === "linkedin"
            ? "Searching public sources. This takes about 20–60 seconds."
            : mode === "export"
              ? "Reading your export…"
              : "Reading it. This takes about 10–20 seconds."}
        </p>
      )}
    </div>
  );
}
