import { Forbidden, getResumeFor } from "@/server/data";
import { currentViewer } from "@/server/session";

/** Download a résumé: the candidate themself, or a recruiter whose invite they accepted. */
export async function GET(_req: Request, { params }: { params: Promise<{ candidateId: string }> }) {
  const viewer = await currentViewer();
  if (!viewer) return new Response("Not found", { status: 404 });
  const { candidateId } = await params;
  try {
    const file = await getResumeFor(viewer.id, candidateId);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(file.data), {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof Forbidden) return new Response("Not found", { status: 404 });
    throw e;
  }
}
