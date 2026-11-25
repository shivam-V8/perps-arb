import { notFound, redirect } from "next/navigation";
import { CandidateBoard } from "@/components/recruiter/candidate-board";
import { getOwnRole } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Candidates" };

export default async function RoleCandidatesPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (viewer?.role !== "recruiter") redirect("/jobs");
  const { id } = await params;
  const role = await getOwnRole(viewer.id, id);
  if (!role) notFound();
  return <CandidateBoard role={role} />;
}
