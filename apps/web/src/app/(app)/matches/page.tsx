import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { ago } from "@/lib/time";
import { listConversations } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Messages" };

export default async function MatchesPage() {
  const viewer = await currentViewer();
  if (!viewer?.role) redirect("/onboarding");
  const isRecruiter = viewer.role === "recruiter";
  const convos = await listConversations(viewer.id, viewer.role);

  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Messages</h1>
      {convos.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <MessageCircle className="mx-auto size-6" />
          <p className="mt-3">
            {isRecruiter
              ? "When a candidate accepts your invite, the conversation starts here."
              : "Accept an invite from a recruiter to start a conversation."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-black/[0.06] overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-soft">
          {convos.map(({ match: m, role: r, candidate: c, last: l }) => {
            const title = isRecruiter ? c?.full_name || "Candidate" : r.company || r.title;
            const sub = isRecruiter ? `${c?.headline ?? ""} · for ${r.title}` : r.title;
            return (
              <li key={m.id}>
                <Link href={`/matches/${m.id}`} className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-black/[0.02]">
                  <AvatarMark name={title} tone={toneFor(title)} size="md" square={!isRecruiter} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate font-medium">{title}</p>
                      {l && <span className="shrink-0 text-xs text-muted-foreground">{ago(new Date(l.created_at).getTime())}</span>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{sub}</p>
                    <p className="mt-1 truncate text-sm text-foreground/70">
                      {l ? `${l.sender_id === viewer.id ? "You: " : ""}${l.body}` : "Say hello"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
