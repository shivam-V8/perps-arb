"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { FIELDS } from "@/lib/fields";
import type { FieldId } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/** Multi-select chips for broad fields (max 3). */
export function FieldPicker({ value, onChange, max = 3 }: { value: FieldId[]; onChange: (v: FieldId[]) => void; max?: number }) {
  function toggle(id: FieldId) {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else if (value.length < max) onChange([...value, id]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {FIELDS.map((f) => {
        const on = value.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => toggle(f.id)}
            disabled={!on && value.length >= max}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:opacity-40",
              on ? "border-foreground bg-foreground text-background" : "border-black/10 bg-white text-foreground/75 hover:border-black/25",
            )}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

/** Free-form tags (skills, requirements). Enter or comma adds; click × removes. */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 25,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim().replace(/,$/, "");
    if (t && !value.includes(t) && value.length < max) onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-black/[0.05] py-0.5 pr-1 pl-2.5 text-sm">
          {t}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== t))}
            className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-black/10 hover:text-foreground"
            aria-label={`Remove ${t}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm transition-colors",
            value === o.value ? "border-foreground bg-foreground text-background" : "border-black/10 bg-white text-foreground/70 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
