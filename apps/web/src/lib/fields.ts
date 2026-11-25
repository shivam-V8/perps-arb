import type { FieldId, RemotePref, Seniority } from "./types";

/** Broad fields used for filtering and matching. Not a gate: any profession fits somewhere. */
export const FIELDS: { id: FieldId; label: string }[] = [
  { id: "engineering", label: "Engineering" },
  { id: "data", label: "Data & Analytics" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "marketing", label: "Marketing" },
  { id: "sales", label: "Sales" },
  { id: "finance", label: "Finance" },
  { id: "healthcare", label: "Healthcare" },
  { id: "operations", label: "Operations" },
  { id: "education", label: "Education" },
  { id: "legal", label: "Legal" },
  { id: "other", label: "Other" },
];

export const FIELD_IDS = FIELDS.map((f) => f.id) as [FieldId, ...FieldId[]];

const byId = new Map(FIELDS.map((f) => [f.id, f.label]));
export const fieldLabel = (id: FieldId) => byId.get(id) ?? id;

export const SENIORITY: { value: Seniority; label: string }[] = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "executive", label: "Executive" },
];

export const REMOTE: { value: RemotePref; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
];

export const remoteLabel = (r: string) => REMOTE.find((x) => x.value === r)?.label ?? "Unknown";
