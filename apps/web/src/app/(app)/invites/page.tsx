import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { InviteActions } from "@/components/candidate/invite-actions";
import { AvatarMark, toneFor } from "@/components/profile/avatar-mark";
import { fieldLabel, remoteLabel } from "@/lib/fields";
import { listInvites } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Invites" };

export default async function InvitesPage() {
  const viewer = await currentViewer();
  if (viewer?.role !== "candidate") redirect("/roles");
  const invites = await listInvites(viewer.id);

  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Invites</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Recruiters who swiped right on your profile. Accepting shares your name, email and résumé with them and opens a chat.
      </p>
      {invites.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <Inbox className="mx-auto size-6" />
          <p className="mt-3">No invites yet. Make sure “Let recruiters find me” is on in your profile.</p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {invites.map(({ match: m, role: r }) => (
            <li key={m.id} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <AvatarMark name={r.company || r.title} tone={toneFor(r.company || r.title)} size="md" square />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight font-semibold">{r.title}</p>
                  <p className="text-sm text-foreground/70">
                    {r.company || "Company not named"} · {r.location || remoteLabel(r.remote)}
                    {r.salary_min ? ` · from ${r.salary_min.toLocaleString()}` : ""}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground/75">{r.description}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {r.fields.map((f) => (
                      <span key={f} className="rounded-full bg-brand-wash px-2 py-0.5 text-xs font-medium text-brand">
                        {fieldLabel(f)}
                      </span>
                    ))}
                  </p>
                </div>
              </div>
              <InviteActions matchId={m.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
