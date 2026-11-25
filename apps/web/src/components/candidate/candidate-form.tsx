"use client";

import { Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveCandidate } from "@/app/actions";
import { Field, FieldPicker, Segmented, TagInput } from "@/components/onboarding/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { REMOTE, SENIORITY } from "@/lib/fields";
import type { CandidateProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const EMPTY_CANDIDATE: CandidateProfile = {
  full_name: "",
  email: "",
  headline: "",
  summary: "",
  fields: [],
  skills: [],
  experience: [],
  education: [],
  location: "",
  remote_pref: "any",
  seniority: "mid",
  salary_min: null,
  salary_currency: "USD",
  visible_to_recruiters: false,
  resume_path: null,
  linkedin_url: null,
};

/** Review / edit a candidate profile. Used after parsing and on /profile. */
export function CandidateForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: CandidateProfile;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [c, setC] = useState<CandidateProfile>(initial);
  const [pending, start] = useTransition();
  const patch = (p: Partial<CandidateProfile>) => setC((v) => ({ ...v, ...p }));
  const valid = c.headline.trim().length > 1 && c.fields.length > 0;

  function submit() {
    start(async () => {
      try {
        await saveCandidate({
          full_name: c.full_name,
          headline: c.headline,
          summary: c.summary,
          fields: c.fields,
          skills: c.skills,
          experience: c.experience,
          education: c.education,
          location: c.location,
          remote_pref: c.remote_pref,
          seniority: c.seniority,
          salary_min: c.salary_min,
          salary_currency: c.salary_currency,
          email: c.email,
          visible_to_recruiters: c.visible_to_recruiters,
          linkedin_url: c.linkedin_url ?? null,
        });
        toast.success("Profile saved");
        onSaved?.();
      } catch {
        toast.error("Couldn't save. Try again.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={c.full_name} onChange={(e) => patch({ full_name: e.target.value })} className="h-11 bg-white" />
        </Field>
        <Field label="Headline" hint="current or target role">
          <Input value={c.headline} onChange={(e) => patch({ headline: e.target.value })} placeholder="e.g. ICU Registered Nurse" className="h-11 bg-white" />
        </Field>
      </div>

      <Field label="Contact email" hint="shared only with recruiters whose invite you accept">
        <Input type="email" value={c.email} onChange={(e) => patch({ email: e.target.value })} placeholder="you@example.com" className="h-11 bg-white" />
      </Field>

      <Field label="Summary">
        <Textarea value={c.summary} onChange={(e) => patch({ summary: e.target.value.slice(0, 800) })} rows={3} className="resize-none bg-white" />
      </Field>

      <Field label="Field" hint="up to 3">
        <FieldPicker value={c.fields} onChange={(fields) => patch({ fields })} />
      </Field>

      <Field label="Skills" hint="Enter to add">
        <TagInput value={c.skills} onChange={(skills) => patch({ skills })} placeholder="e.g. Patient assessment, Excel, React…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <Input value={c.location} onChange={(e) => patch({ location: e.target.value })} placeholder="City, country" className="h-11 bg-white" />
        </Field>
        <Field label="Minimum salary" hint="optional, per year">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              value={c.salary_min ?? ""}
              onChange={(e) => patch({ salary_min: e.target.value ? Number(e.target.value) : null })}
              className="h-11 bg-white"
            />
            <Input
              value={c.salary_currency}
              onChange={(e) => patch({ salary_currency: e.target.value.toUpperCase().slice(0, 3) })}
              className="h-11 w-20 bg-white"
              aria-label="Currency"
            />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work setup">
          <Segmented options={REMOTE} value={c.remote_pref} onChange={(remote_pref) => patch({ remote_pref })} />
        </Field>
        <Field label="Seniority">
          <Segmented options={SENIORITY} value={c.seniority} onChange={(seniority) => patch({ seniority })} />
        </Field>
      </div>

      <div>
        <p className="text-sm font-medium">Experience</p>
        <div className="mt-2 space-y-2">
          {c.experience.map((e, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-2xl border border-black/[0.06] bg-white p-3 sm:grid-cols-[1.4fr_1.2fr_0.6fr_0.6fr_auto]">
              <Input value={e.title} placeholder="Title" onChange={(ev) => patch({ experience: c.experience.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)) })} />
              <Input value={e.company} placeholder="Company" onChange={(ev) => patch({ experience: c.experience.map((x, j) => (j === i ? { ...x, company: ev.target.value } : x)) })} />
              <Input className="hidden sm:block" value={e.start} placeholder="Start" onChange={(ev) => patch({ experience: c.experience.map((x, j) => (j === i ? { ...x, start: ev.target.value } : x)) })} />
              <Input className="hidden sm:block" value={e.end} placeholder="End" onChange={(ev) => patch({ experience: c.experience.map((x, j) => (j === i ? { ...x, end: ev.target.value } : x)) })} />
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground" aria-label="Remove" onClick={() => patch({ experience: c.experience.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
            </div>
          ))}
          {c.experience.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-black/10 bg-white"
              onClick={() => patch({ experience: [...c.experience, { title: "", company: "", start: "", end: "", highlights: [] }] })}
            >
              <Plus /> Add role
            </Button>
          )}
        </div>
      </div>

      <Field label="Education & certifications">
        <TagInput value={c.education} onChange={(education) => patch({ education })} placeholder="e.g. BSc Nursing, PMP…" max={6} />
      </Field>

      <button
        type="button"
        onClick={() => patch({ visible_to_recruiters: !c.visible_to_recruiters })}
        className={cn(
          "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
          c.visible_to_recruiters ? "border-brand/40 bg-brand-wash" : "border-black/10 bg-white",
        )}
        aria-pressed={c.visible_to_recruiters}
      >
        {c.visible_to_recruiters ? <Eye className="mt-0.5 size-5 text-brand" /> : <EyeOff className="mt-0.5 size-5 text-muted-foreground" />}
        <span>
          <span className="block text-sm font-medium">Let recruiters find me {c.visible_to_recruiters ? "(on)" : "(off)"}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Recruiters see your headline, skills and job history, never your name, email or résumé file. Those are shared only
            if you accept their invite.
          </span>
        </span>
      </button>

      <Button onClick={submit} disabled={!valid || pending} size="lg" className="h-12 rounded-full px-7">
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}
