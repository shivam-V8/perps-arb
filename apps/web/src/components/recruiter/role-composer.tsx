"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveRole } from "@/app/actions";
import { Field, FieldPicker, Segmented, TagInput } from "@/components/onboarding/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { RoleDraft } from "@/lib/ai/schemas";
import { REMOTE, SENIORITY } from "@/lib/fields";

const EMPTY: RoleDraft = {
  title: "",
  company: "",
  description: "",
  fields: [],
  must_have: [],
  nice_to_have: [],
  location: "",
  remote: "any",
  seniority: "mid",
  salary_min: null,
  salary_max: null,
};

export function RoleComposer() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<RoleDraft | null>(null);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [pending, start] = useTransition();

  async function draft() {
    setBusy(true);
    const res = await fetch("/api/roles/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res?.ok) return toast.error(json.error ?? "Couldn't read that.");
    setRole(json.draft);
    setAiDrafted(true);
  }

  if (!role) {
    return (
      <div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 20000))}
          rows={9}
          placeholder={"e.g. We're a 40-bed clinic in Austin hiring an ICU nurse, nights, 3+ years, Texas RN licence, $85–100k…\n\nor paste the full job description."}
          className="resize-none rounded-2xl bg-white"
        />
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Button onClick={draft} disabled={busy || text.trim().length < 10} size="lg" className="h-12 rounded-full px-7">
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy ? "Reading…" : "Structure with AI"}
          </Button>
          <button type="button" onClick={() => setRole(EMPTY)} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Fill it in myself
          </button>
        </div>
      </div>
    );
  }

  const patch = (p: Partial<RoleDraft>) => setRole((r) => ({ ...r!, ...p }));
  const valid = role.title.trim().length > 1 && role.fields.length > 0;

  return (
    <div className="space-y-6">
      {aiDrafted && (
        <p className="flex items-center gap-2 rounded-2xl bg-brand-wash px-4 py-3 text-sm text-brand">
          <Sparkles className="size-4 shrink-0" /> Drafted by AI. Check the requirements; they drive who you see.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job title">
          <Input value={role.title} onChange={(e) => patch({ title: e.target.value })} className="h-11 bg-white" />
        </Field>
        <Field label="Company">
          <Input value={role.company} onChange={(e) => patch({ company: e.target.value })} className="h-11 bg-white" />
        </Field>
      </div>
      <Field label="Description" hint="what candidates will read">
        <Textarea value={role.description} onChange={(e) => patch({ description: e.target.value.slice(0, 1200) })} rows={4} className="resize-none bg-white" />
      </Field>
      <Field label="Field" hint="up to 3">
        <FieldPicker value={role.fields} onChange={(fields) => patch({ fields })} />
      </Field>
      <Field label="Must have">
        <TagInput value={role.must_have} onChange={(must_have) => patch({ must_have })} placeholder="e.g. Texas RN licence" max={10} />
      </Field>
      <Field label="Nice to have">
        <TagInput value={role.nice_to_have} onChange={(nice_to_have) => patch({ nice_to_have })} placeholder="e.g. CCRN certification" max={8} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Location">
          <Input value={role.location} onChange={(e) => patch({ location: e.target.value })} className="h-11 bg-white" />
        </Field>
        <Field label="Salary from">
          <Input type="number" value={role.salary_min ?? ""} onChange={(e) => patch({ salary_min: e.target.value ? Number(e.target.value) : null })} className="h-11 bg-white" />
        </Field>
        <Field label="Salary to">
          <Input type="number" value={role.salary_max ?? ""} onChange={(e) => patch({ salary_max: e.target.value ? Number(e.target.value) : null })} className="h-11 bg-white" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work setup">
          <Segmented options={REMOTE} value={role.remote} onChange={(remote) => patch({ remote })} />
        </Field>
        <Field label="Seniority">
          <Segmented options={SENIORITY} value={role.seniority} onChange={(seniority) => patch({ seniority })} />
        </Field>
      </div>
      <Button
        size="lg"
        className="h-12 rounded-full px-7"
        disabled={!valid || pending}
        onClick={() => start(() => saveRole(role))}
      >
        {pending && <Loader2 className="animate-spin" />}
        Save and find candidates
      </Button>
    </div>
  );
}
