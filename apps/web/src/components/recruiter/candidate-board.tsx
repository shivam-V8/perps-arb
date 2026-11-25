"use client";

import { ArrowLeft, Loader2, RefreshCw, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { decideCandidate } from "@/app/actions";
import { CandidateCard } from "@/components/cards/candidate-card";
import { SwipeDeck } from "@/components/swipe/swipe-deck";
import { Button } from "@/components/ui/button";
import type { CandidateCardData, Decision, RoleOpening } from "@/lib/types";

type Item = CandidateCardData & { id: string };

export function CandidateBoard({ role }: { role: RoleOpening }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [aiRanked, setAiRanked] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/candidates/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roleId: role.id }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setLoading(false);
    if (!res?.ok) {
      toast.error(json.error ?? "Couldn't load candidates.");
      setItems([]);
      return;
    }
    setAiRanked(Boolean(json.ai));
    setItems((json.candidates as CandidateCardData[]).map((c) => ({ ...c, id: c.candidate_id })));
  }, [role.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onDecide = useCallback(
    (c: Item, d: Decision) => {
      setItems((l) => l?.filter((x) => x.id !== c.id) ?? null);
      decideCandidate(role.id, c.candidate_id, d)
        .then(() => d === "like" && toast.success("Invite sent", { description: "They'll see it in their Invites." }))
        .catch(() => toast.error("Couldn't save that."));
    },
    [role.id],
  );

  return (
    <div className="mx-auto w-full max-w-[420px] pt-6 md:pt-8">
      <Link href="/roles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Roles
      </Link>
      <div className="mt-2 mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-semibold tracking-tight">{role.title}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {aiRanked && <Sparkles className="size-3.5 text-brand" />}
            {aiRanked ? "Ranked by AI for this role" : "Candidates who opted in to be found"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 rounded-full border-black/10 bg-white" disabled={loading} onClick={load}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
      </div>

      {items === null ? (
        <div className="grid h-[clamp(430px,calc(100dvh-300px),620px)] place-items-center rounded-[28px] border border-black/[0.06] bg-white shadow-lift">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Finding and ranking candidates…
          </p>
        </div>
      ) : (
        <SwipeDeck
          items={items}
          render={(c) => <CandidateCard c={c} />}
          onDecide={onDecide}
          likeLabel="Invite"
          passLabel="Pass"
          empty={
            <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-black/15 bg-white/60 p-8 text-center">
              <div>
                <Users className="mx-auto size-6 text-brand" />
                <h3 className="mt-3 font-display text-xl font-semibold">No more candidates right now</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  New people join every day. Accepted invites show up in Messages.
                </p>
                <Button asChild className="mt-5 rounded-full">
                  <Link href="/matches">Messages</Link>
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
