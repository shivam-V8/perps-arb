import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { remoteLabel } from "@/lib/fields";
import { ago } from "@/lib/time";
import { listOwnRoles } from "@/server/data";
import { currentViewer } from "@/server/session";

export const metadata = { title: "Roles" };

export default async function RolesPage() {
  const viewer = await currentViewer();
  if (viewer?.role !== "recruiter") redirect("/jobs");
  const roles = await listOwnRoles(viewer.id);
  if (roles.length === 0) redirect("/roles/new");

  return (
    <div className="mx-auto w-full max-w-3xl pt-6 md:pt-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Your roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Open a role to swipe on candidates who fit it.</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/roles/new">
            <Plus /> New role
          </Link>
        </Button>
      </div>
      <ul className="mt-8 space-y-3">
        {roles.map((r) => (
          <li key={r.id}>
            <Link
              href={`/roles/${r.id}`}
              className="block rounded-3xl border border-black/[0.06] bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-display text-lg font-semibold">{r.title}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(new Date(r.created_at).getTime())} ago</span>
              </div>
              <p className="text-sm text-foreground/70">
                {r.company || "Company not named"} · {r.location || remoteLabel(r.remote)}
              </p>
              <p className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{r.invited}</span> invited
                </span>
                <span>
                  <span className="font-semibold text-brand">{r.accepted}</span> accepted
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
