import { notFound, redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { getConversation, listMessages } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await currentViewer();
  if (!viewer?.role) redirect("/onboarding");
  const { id } = await params;
  const convo = await getConversation(viewer.id, id);
  if (!convo) notFound();
  const { role, candidate: cand, isRecruiter, match } = convo;
  const msgs = await listMessages(viewer.id, id);

  return (
    <ChatRoom
      matchId={id}
      me={viewer.id}
      title={isRecruiter ? cand.full_name || "Candidate" : role.company || role.title}
      subtitle={isRecruiter ? [cand.headline, cand.email].filter(Boolean).join(" · ") : role.title}
      roleTitle={role.title}
      resumeUrl={isRecruiter && cand.resume_path ? `/api/resume/${match.candidate_id}` : null}
      initial={msgs}
    />
  );
}
