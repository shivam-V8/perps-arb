import { NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai/claude";
import { draftCoverNote } from "@/lib/ai/cover-note";
import { getOwnCandidate, getOwnJob } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Drafts a short cover note for one of the viewer's jobs (must be unlocked, or Pro). */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!aiEnabled()) return NextResponse.json({ error: "AI is not configured on this server." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { jobId?: string } | null;
  const [job, cand] = await Promise.all([getOwnJob(viewer.id, body?.jobId ?? ""), getOwnCandidate(viewer.id)]);
  if (!job || !cand) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (job.locked) return NextResponse.json({ error: "Unlock this job first.", paywall: true }, { status: 402 });

  const note = await draftCoverNote(job, cand);
  if (!note) return NextResponse.json({ error: "Couldn't draft a note right now." }, { status: 502 });
  return NextResponse.json({ note });
}
