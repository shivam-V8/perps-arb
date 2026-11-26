import { NextResponse } from "next/server";
import { getEntitlement, getOwnJob, unlockJob } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Spends one pack credit on a locked job and returns it in full. */
export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { jobId?: string } | null;
  const jobId = body?.jobId ?? "";

  const result = await unlockJob(viewer.id, jobId);
  if (result === "not_found") return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (result === "no_credits") return NextResponse.json({ error: "No unlocks left.", paywall: true }, { status: 402 });
  const [job, ent] = await Promise.all([getOwnJob(viewer.id, jobId), getEntitlement(viewer.id)]);
  return NextResponse.json({ job, credits: ent.credits });
}
