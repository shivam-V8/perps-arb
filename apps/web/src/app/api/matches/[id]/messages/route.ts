import { NextResponse } from "next/server";
import { Forbidden, listMessages, sendMessage } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Chat transport: the client polls GET with ?after=<iso> and POSTs new messages. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (!viewer?.role) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await params;
  const after = new URL(req.url).searchParams.get("after") ?? undefined;
  try {
    return NextResponse.json({ messages: await listMessages(viewer.id, id, after) });
  } catch (e) {
    if (e instanceof Forbidden) return NextResponse.json({ error: "Not found." }, { status: 404 });
    throw e;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (!viewer?.role) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { body?: string } | null;
  if (!body?.body?.trim()) return NextResponse.json({ error: "Empty message." }, { status: 400 });
  try {
    return NextResponse.json({ message: await sendMessage(viewer.id, id, body.body) });
  } catch (e) {
    if (e instanceof Forbidden) return NextResponse.json({ error: "Not found." }, { status: 404 });
    throw e;
  }
}
